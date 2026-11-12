// Portal del portafolio de Programación V (UNACHI) — Samuel Suira.
// Servidor HTTP con el JDK puro: sirve la página web y ejecuta los laboratorios
// (programas de consola, servidores, Tomcat y la base de datos) desde el navegador.
//
//   java portal/Portal.java              inicia el portal en http://localhost:9000
//   java portal/Portal.java --exportar   genera web/fuentes.js para la versión estática (GitHub Pages)
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class Portal {

    static String config(String nombre, String defecto) {
        String v = System.getenv(nombre);
        return v == null || v.isBlank() ? defecto : v;
    }

    static final boolean WINDOWS = System.getProperty("os.name").toLowerCase().contains("win");
    static final int PUERTO = Integer.parseInt(config("PORTAL_PORT", "9000"));
    static final String HOST = config("PORTAL_HOST", "127.0.0.1");
    static final Path RAIZ = Path.of(config("PORTAL_ROOT", ".")).toAbsolutePath().normalize();
    static final Path WEB = RAIZ.resolve("web");
    static final Path LABS = RAIZ.resolve("labs");
    static final Path RUNTIME = RAIZ.resolve("runtime");
    static final Path INIT_SQL = RAIZ.resolve("db/init.sql");
    static final Path XAMPP_MYSQL = Path.of(config("XAMPP_MYSQL", "C:/xampp/mysql"));
    static final String TOMCAT_VERSION = "10.1.34";
    static final String JAVA = Path.of(System.getProperty("java.home"), "bin", "java").toString();
    static final List<String> VM = List.of("-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8");

    /** Puertos a los que el probador de APIs puede reenviar solicitudes. */
    static final List<Integer> PUERTOS_PROXY = List.of(3000, 8080);

    // ------------------------------------------------------------------
    //  Catálogo de aplicaciones
    // ------------------------------------------------------------------

    /**
     * @param artefacto archivo o carpeta que debe existir; si falta, se compila con Maven antes de ejecutar
     */
    record App(String id, String tipo, Path dir, List<String> comando, String artefacto, int puerto,
               boolean mysql, boolean admiteArgs, List<String> argsPorDefecto, String url) {}

    static final Map<String, App> APPS = new LinkedHashMap<>();

    static void programa(String id, String carpeta, String clase, List<String> args, boolean admiteArgs) {
        APPS.put(id, new App(id, "programa", LABS.resolve(carpeta), java("-cp", "target/classes", clase),
                "target/classes", 0, false, admiteArgs, args, null));
    }

    static List<String> java(String... resto) {
        List<String> cmd = new ArrayList<>();
        cmd.add(JAVA);
        cmd.addAll(VM);
        cmd.addAll(List.of(resto));
        return cmd;
    }

    static void registrarApps() {
        programa("l1-main", "laboratorio1/prog5-base", "com.unachi.prog5.Main", List.of(), false);
        programa("l2-maestro", "laboratorio2/lab2-patrones", "MaestroEsclavoFacturas", List.of(), false);
        programa("l2-pipe", "laboratorio2/lab2-patrones", "PipeFilterLogs", List.of(), false);
        programa("l2-cuenta", "laboratorio2/lab2-cuenta-bancaria", "objetos.Main", List.of(), false);
        programa("l2-taller", "laboratorio2/lab2-taller-poo", "Main", List.of(), false);
        programa("l7-cliente", "laboratorio7/prototipo-java21", "Cliente", List.of("Samuel Suira"), true);
        programa("l7-carga", "laboratorio7/prototipo-java21", "Carga", List.of("/api/lento?ms=500", "20"), true);
        programa("l8-demo", "laboratorio8/ReservasLabAPI", "reservas.cliente.ClienteConsola", List.of("demo"), false);
        programa("l8-menu", "laboratorio8/ReservasLabAPI", "reservas.cliente.ClienteConsola", List.of(), false);

        APPS.put("l4-mvc", new App("l4-mvc", "servidor", LABS.resolve("laboratorio4/mvc-estudiantes"),
                java("-jar", "target/mvc-estudiantes-0.0.1-SNAPSHOT.jar", "--server.port=8081"),
                "target/mvc-estudiantes-0.0.1-SNAPSHOT.jar", 8081, true, false, List.of(),
                "http://localhost:8081/estudiantes"));
        APPS.put("l5-inventario", new App("l5-inventario", "servidor", LABS.resolve("laboratorio5/gestion-inventario-jsp"),
                List.of(), "target/gestion-inventario.war", 8082, true, false, List.of(),
                "http://localhost:8082/gestion-inventario/"));
        APPS.put("l7-servidor", new App("l7-servidor", "servidor", LABS.resolve("laboratorio7/prototipo-java21"),
                java("-cp", "target/classes", "Servidor"), "target/classes", 3000, false, true, List.of("4"),
                "http://localhost:3000/api/espacios"));
        APPS.put("l8-api", new App("l8-api", "servidor", LABS.resolve("laboratorio8/ReservasLabAPI"),
                java("-cp", "target/classes", "reservas.servidor.ServidorReservas"), "target/classes", 8080, false,
                false, List.of(), "http://localhost:8080/api/reservas"));
    }

    // ------------------------------------------------------------------
    //  Ejecuciones: cada una prepara (BD, compilación, Tomcat) y luego arranca el proceso
    // ------------------------------------------------------------------

    static final class Ejecucion {
        final long inicio = System.currentTimeMillis();
        final StringBuilder salida = new StringBuilder();
        long descartado = 0; // caracteres eliminados del principio para limitar memoria
        volatile Process proceso;
        volatile String fase = "preparando";
        volatile boolean activa = true;
        volatile boolean cancelada = false;
        volatile Integer codigoSalida;

        synchronized void log(String texto) {
            salida.append(texto);
            int exceso = salida.length() - 400_000;
            if (exceso > 0) {
                salida.delete(0, exceso);
                descartado += exceso;
            }
        }

        synchronized String desde(long pos) {
            int i = (int) Math.max(0, pos - descartado);
            return i >= salida.length() ? "" : salida.substring(i);
        }

        synchronized long fin() { return descartado + salida.length(); }
    }

    static final Map<String, Ejecucion> EJECUCIONES = new ConcurrentHashMap<>();

    static boolean activa(String id) {
        Ejecucion e = EJECUCIONES.get(id);
        return e != null && e.activa;
    }

    static void iniciar(App app, List<String> args) throws IOException {
        if (activa(app.id())) return;
        if (app.puerto() > 0 && puertoAbierto(app.puerto()))
            throw new IOException("El puerto " + app.puerto() + " ya está ocupado por otro programa "
                    + "(¿lo abriste desde tu IDE?). Ciérralo y vuelve a intentar.");
        if (!Files.isDirectory(app.dir())) throw new IOException("No existe la carpeta " + app.dir());
        Ejecucion e = new Ejecucion();
        EJECUCIONES.put(app.id(), e);
        List<String> efectivos = app.admiteArgs() && !args.isEmpty() ? args : app.argsPorDefecto();
        Thread hilo = new Thread(() -> {
            try {
                if (app.mysql()) {
                    e.fase = "base de datos";
                    prepararBaseDatos(e);
                }
                if (!Files.exists(app.dir().resolve(app.artefacto()))) {
                    e.fase = "compilando";
                    compilar(app, e);
                }
                List<String> cmd = new ArrayList<>(app.id().equals("l5-inventario") ? prepararTomcat(e) : app.comando());
                cmd.addAll(efectivos);
                if (e.cancelada) return;
                e.fase = "ejecutando";
                e.codigoSalida = correr(cmd, app.dir(), e, true);
                e.log("\n[proceso terminado · código de salida " + e.codigoSalida + "]\n");
            } catch (Exception ex) {
                if (!e.cancelada) e.log("\n[error] " + (ex.getMessage() == null ? ex.toString() : ex.getMessage()) + "\n");
                if (e.codigoSalida == null) e.codigoSalida = -1;
            } finally {
                e.activa = false;
                e.fase = "terminado";
            }
        }, "app-" + app.id());
        hilo.setDaemon(true);
        hilo.start();
    }

    /** Ejecuta un proceso volcando su salida en la ejecución; devuelve el código de salida. */
    static int correr(List<String> cmd, Path dir, Ejecucion e, boolean principal) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(cmd).directory(dir.toFile()).redirectErrorStream(true);
        pb.environment().put("JAVA_HOME", System.getProperty("java.home"));
        e.log("$ " + String.join(" ", cmd.stream().filter(a -> !VM.contains(a) && !a.startsWith("-Djava.")
                && !a.startsWith("-Dcatalina.")).map(Portal::citar).toList()) + "\n");
        Process p = pb.start();
        recordar(p);
        if (principal) e.proceso = p;
        if (e.cancelada) p.destroy();
        try (Reader r = new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8)) {
            char[] buf = new char[4096];
            int n;
            while ((n = r.read(buf)) != -1) e.log(new String(buf, 0, n).replace("\r", ""));
        } catch (IOException ignorada) {
            // el proceso terminó o fue detenido
        }
        return p.waitFor();
    }

    static String citar(String s) {
        String corto = s.equals(JAVA) ? "java" : s.replace(RAIZ.toString(), ".");
        return corto.contains(" ") ? "\"" + corto + "\"" : corto;
    }

    static void detener(String id) {
        Ejecucion e = EJECUCIONES.get(id);
        if (e == null || !e.activa) return;
        e.cancelada = true;
        Process p = e.proceso;
        if (p != null && p.isAlive()) {
            p.descendants().forEach(ProcessHandle::destroy);
            p.destroy();
            try {
                if (!p.waitFor(5, TimeUnit.SECONDS)) p.destroyForcibly();
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }
        e.log("\n[detenido desde el portafolio]\n");
    }

    // ------------------------------------------------------------------
    //  Procesos huérfanos: si la ventana del portal se cierra de golpe, los laboratorios
    //  pueden quedar vivos. Se anotan aquí y se apagan al iniciar el portal otra vez.
    // ------------------------------------------------------------------

    static final Path PROCESOS = RUNTIME.resolve("procesos.txt");

    static synchronized void recordar(Process p) {
        try {
            Files.createDirectories(RUNTIME);
            // Windows a veces tarda unos milisegundos en informar la hora de inicio de un proceso nuevo
            long inicio = 0;
            for (int i = 0; i < 20 && inicio == 0 && p.isAlive(); i++) {
                inicio = p.info().startInstant().map(java.time.Instant::toEpochMilli).orElse(0L);
                if (inicio == 0) Thread.sleep(25);
            }
            Files.writeString(PROCESOS, p.pid() + " " + inicio + "\n", StandardCharsets.UTF_8,
                    java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
        } catch (IOException | InterruptedException ignorada) {
            // sin registro solo se pierde la limpieza automática
        }
    }

    static void limpiarHuerfanos() {
        if (!Files.exists(PROCESOS)) return;
        try {
            for (String linea : Files.readAllLines(PROCESOS)) {
                String[] p = linea.trim().split(" ");
                if (p.length != 2) continue;
                long inicio = Long.parseLong(p[1]);
                // se compara la hora de inicio para no tocar un proceso ajeno que reutilizó el mismo PID
                ProcessHandle.of(Long.parseLong(p[0]))
                        .filter(h -> inicio == 0
                                ? h.info().command().map(c -> c.toLowerCase().contains("java") || c.toLowerCase().contains("mvn")).orElse(false)
                                : h.info().startInstant().map(i -> i.toEpochMilli() == inicio).orElse(false))
                        .ifPresent(h -> {
                            h.descendants().forEach(ProcessHandle::destroyForcibly);
                            h.destroyForcibly();
                            System.out.println("Apagado un laboratorio que quedó encendido (PID " + h.pid() + ").");
                        });
            }
            Files.delete(PROCESOS);
        } catch (Exception e) {
            System.out.println("[aviso] No se pudieron revisar procesos anteriores: " + e.getMessage());
        }
    }

    /** Al cerrar el portal: se ordena apagar todo a la vez y luego se espera un poco. */
    static void apagarTodo() {
        List<Process> vivos = EJECUCIONES.values().stream().map(e -> {
            e.cancelada = true;
            return e.proceso;
        }).filter(p -> p != null && p.isAlive()).toList();
        vivos.forEach(p -> {
            p.descendants().forEach(ProcessHandle::destroy);
            p.destroy();
        });
        long limite = System.currentTimeMillis() + 2500;
        for (Process p : vivos) {
            try {
                if (!p.waitFor(Math.max(1, limite - System.currentTimeMillis()), TimeUnit.MILLISECONDS)) p.destroyForcibly();
            } catch (InterruptedException ex) {
                p.destroyForcibly();
            }
        }
    }

    static boolean puertoAbierto(int puerto) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", puerto), 250);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // ------------------------------------------------------------------
    //  Compilación con Maven
    // ------------------------------------------------------------------

    static void compilar(App app, Ejecucion e) throws IOException, InterruptedException {
        e.log("Primera ejecución: compilando el proyecto con Maven (puede tardar un poco)…\n");
        String mvn = WINDOWS ? "mvn.cmd" : "mvn";
        int codigo;
        try {
            codigo = correr(List.of(mvn, "-q", "-B", "-DskipTests", "package"), app.dir(), e, false);
        } catch (IOException ex) {
            throw new IOException("No se encontró Maven (mvn). Instálalo o usa Docker: docker compose up");
        }
        if (codigo != 0) throw new IOException("Maven terminó con código " + codigo);
        e.log("Compilación lista.\n\n");
    }

    // ------------------------------------------------------------------
    //  Base de datos (MySQL / MariaDB en el puerto 3306)
    // ------------------------------------------------------------------

    static volatile boolean baseInicializada = false;

    static boolean mysqlArriba() { return puertoAbierto(3306); }

    static synchronized void prepararBaseDatos(Ejecucion e) throws IOException, InterruptedException {
        if (!mysqlArriba()) {
            Path mysqld = XAMPP_MYSQL.resolve("bin/mysqld.exe");
            if (!WINDOWS || !Files.exists(mysqld))
                throw new IOException("MySQL/MariaDB no está encendido en el puerto 3306. Enciéndelo e importa "
                        + "db/init.sql, o usa Docker: docker compose up");
            e.log("Encendiendo MySQL de XAMPP…\n");
            ProcessBuilder pb = new ProcessBuilder(mysqld.toString(), "--defaults-file=" + XAMPP_MYSQL.resolve("bin/my.ini"),
                    "--standalone").directory(XAMPP_MYSQL.resolve("bin").toFile())
                    .redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD);
            pb.start();
            for (int i = 0; i < 60 && !mysqlArriba(); i++) Thread.sleep(250);
            if (!mysqlArriba()) throw new IOException("MySQL no respondió en el puerto 3306.");
            e.log("MySQL encendido en el puerto 3306.\n");
        }
        if (baseInicializada) return;
        String cliente = clienteMysql();
        if (cliente == null || !Files.exists(INIT_SQL)) {
            baseInicializada = true;
            return;
        }
        List<String> cmd = new ArrayList<>(List.of(cliente, "-u", "root", "--default-character-set=utf8mb4"));
        String clave = config("DB_ROOT_PASSWORD", "");
        if (!clave.isEmpty()) cmd.add("-p" + clave);
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).redirectInput(INIT_SQL.toFile()).start();
        String salida = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (p.waitFor() == 0) {
            e.log("Bases de datos verificadas (db/init.sql).\n\n");
            baseInicializada = true;
        } else {
            e.log("[aviso] No se pudo ejecutar db/init.sql: " + salida.strip() + "\n\n");
        }
    }

    static String clienteMysql() {
        Path xampp = XAMPP_MYSQL.resolve(WINDOWS ? "bin/mysql.exe" : "bin/mysql");
        if (Files.exists(xampp)) return xampp.toString();
        for (String dir : System.getenv().getOrDefault("PATH", "").split(File.pathSeparator)) {
            for (String nombre : List.of("mysql", "mysql.exe", "mariadb", "mariadb.exe")) {
                Path p = Path.of(dir, nombre);
                if (Files.isRegularFile(p)) return p.toString();
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    //  Tomcat para el laboratorio 5 (instancia propia en el puerto 8082)
    // ------------------------------------------------------------------

    static Path tomcatHome(Ejecucion e) throws IOException, InterruptedException {
        List<Path> candidatos = new ArrayList<>();
        String env = System.getenv("TOMCAT_HOME");
        if (env != null) candidatos.add(Path.of(env));
        candidatos.add(Path.of(System.getProperty("user.home"),
                ".rsp/redhat-community-server-connector/runtimes/installations/tomcat-10.0.0/apache-tomcat-10.0.0"));
        candidatos.add(RUNTIME.resolve("apache-tomcat-" + TOMCAT_VERSION));
        for (Path c : candidatos) if (Files.exists(c.resolve("bin/bootstrap.jar"))) return c;

        // No hay Tomcat en este equipo: se descarga la distribución oficial de Apache una sola vez.
        String url = "https://archive.apache.org/dist/tomcat/tomcat-10/v" + TOMCAT_VERSION
                + "/bin/apache-tomcat-" + TOMCAT_VERSION + ".zip";
        e.log("Descargando Tomcat " + TOMCAT_VERSION + " desde " + url + " …\n");
        Files.createDirectories(RUNTIME);
        HttpClient http = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();
        HttpResponse<InputStream> r = http.send(HttpRequest.newBuilder(URI.create(url)).build(),
                HttpResponse.BodyHandlers.ofInputStream());
        if (r.statusCode() != 200) throw new IOException("No se pudo descargar Tomcat (HTTP " + r.statusCode() + ")");
        try (ZipInputStream zip = new ZipInputStream(r.body())) {
            ZipEntry z;
            while ((z = zip.getNextEntry()) != null) {
                Path destino = RUNTIME.resolve(z.getName()).normalize();
                if (!destino.startsWith(RUNTIME)) throw new IOException("Entrada de zip no válida");
                if (z.isDirectory()) Files.createDirectories(destino);
                else {
                    Files.createDirectories(destino.getParent());
                    Files.copy(zip, destino, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
        e.log("Tomcat listo en runtime/.\n");
        return RUNTIME.resolve("apache-tomcat-" + TOMCAT_VERSION);
    }

    static List<String> prepararTomcat(Ejecucion e) throws IOException, InterruptedException {
        Path home = tomcatHome(e);
        Path base = RUNTIME.resolve("tomcat-base");
        for (String d : List.of("conf", "logs", "temp", "webapps", "work")) Files.createDirectories(base.resolve(d));
        try (Stream<Path> s = Files.list(home.resolve("conf"))) {
            for (Path f : s.filter(Files::isRegularFile).toList())
                Files.copy(f, base.resolve("conf").resolve(f.getFileName()), StandardCopyOption.REPLACE_EXISTING);
        }
        Path serverXml = base.resolve("conf/server.xml");
        Files.writeString(serverXml, Files.readString(serverXml)
                .replace("<Server port=\"8005\"", "<Server port=\"-1\"")
                .replace("port=\"8080\"", "port=\"8082\""));
        Path war = LABS.resolve("laboratorio5/gestion-inventario-jsp/target/gestion-inventario.war");
        Path destino = base.resolve("webapps/gestion-inventario.war");
        if (!Files.exists(destino) || Files.getLastModifiedTime(war).compareTo(Files.getLastModifiedTime(destino)) > 0) {
            borrar(base.resolve("webapps/gestion-inventario"), base);
            Files.copy(war, destino, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
        }
        List<String> cmd = new ArrayList<>();
        cmd.add(javaParaTomcat());
        cmd.addAll(VM);
        cmd.addAll(List.of("-Dcatalina.home=" + home, "-Dcatalina.base=" + base,
                "-Djava.io.tmpdir=" + base.resolve("temp"),
                "-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager",
                "-Djava.util.logging.config.file=" + base.resolve("conf/logging.properties"),
                "-cp", home.resolve("bin/bootstrap.jar") + File.pathSeparator + home.resolve("bin/tomcat-juli.jar"),
                "org.apache.catalina.startup.Bootstrap", "start"));
        return cmd;
    }

    /** Tomcat 10.0 se lleva mejor con un JDK 17; si no existe, usa el mismo Java del portal. */
    static String javaParaTomcat() {
        Path adoptium = Path.of("C:/Program Files/Eclipse Adoptium");
        if (WINDOWS && Files.isDirectory(adoptium)) {
            try (Stream<Path> s = Files.list(adoptium)) {
                Path jdk17 = s.filter(d -> d.getFileName().toString().startsWith("jdk-17"))
                        .map(d -> d.resolve("bin/java.exe")).filter(Files::exists).findFirst().orElse(null);
                if (jdk17 != null) return jdk17.toString();
            } catch (IOException ignorada) {
                // se usa el Java del portal
            }
        }
        return JAVA;
    }

    static void borrar(Path dir, Path limite) throws IOException {
        if (!Files.exists(dir) || !dir.startsWith(limite)) return;
        try (Stream<Path> s = Files.walk(dir)) {
            for (Path p : s.sorted(Comparator.reverseOrder()).toList()) Files.delete(p);
        }
    }

    // ------------------------------------------------------------------
    //  HTTP
    // ------------------------------------------------------------------

    public static void main(String[] args) throws IOException {
        if (args.length > 0 && args[0].equals("--exportar")) {
            exportarFuentes();
            return;
        }
        registrarApps();
        limpiarHuerfanos();
        HttpServer server = HttpServer.create(new InetSocketAddress(HOST, PUERTO), 50);
        server.createContext("/api/", Portal::api);
        server.createContext("/proxy/", Portal::proxy);
        server.createContext("/", Portal::estatico);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        Runtime.getRuntime().addShutdownHook(new Thread(Portal::apagarTodo));
        System.out.println("Portafolio de Samuel Suira · Programación V");
        System.out.println("Abre http://localhost:" + PUERTO + " en tu navegador.");
        System.out.println("Cierra esta ventana (o Ctrl+C) para apagar el portal y los laboratorios encendidos.");
    }

    /** Evita que otras páginas web usen el portal (CSRF / DNS rebinding). */
    static boolean permitido(HttpExchange ex) {
        String host = ex.getRequestHeaders().getFirst("Host");
        if (host == null || !(host.equals("localhost:" + PUERTO) || host.equals("127.0.0.1:" + PUERTO))) return false;
        if (ex.getRequestMethod().equals("GET")) return true;
        return "1".equals(ex.getRequestHeaders().getFirst("X-Portal"));
    }

    static void api(HttpExchange ex) throws IOException {
        try (ex) {
            if (!permitido(ex)) {
                enviar(ex, 403, "application/json", "{\"error\":\"Solicitud no permitida\"}");
                return;
            }
            String ruta = ex.getRequestURI().getPath();
            String metodo = ex.getRequestMethod();
            String[] partes = ruta.split("/");
            try {
                if (ruta.equals("/api/estado")) {
                    enviar(ex, 200, "application/json", estadoJson());
                } else if (ruta.equals("/api/fuentes")) {
                    enviar(ex, 200, "application/json", fuentesJson(false));
                } else if (ruta.equals("/api/archivo")) {
                    Path f = rutaSegura(parametro(ex, "ruta", null));
                    enviar(ex, 200, "text/plain; charset=utf-8", Files.readString(f, StandardCharsets.UTF_8));
                } else if (partes.length == 5 && partes[2].equals("apps")) {
                    String id = partes[3];
                    String accion = partes[4];
                    App app = APPS.get(id);
                    if (app == null) {
                        enviar(ex, 404, "application/json", "{\"error\":\"Aplicación desconocida\"}");
                    } else if (accion.equals("log")) {
                        enviar(ex, 200, "application/json", logJson(id, Long.parseLong(parametro(ex, "desde", "0"))));
                    } else if (accion.equals("iniciar") && metodo.equals("POST")) {
                        String cuerpo = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                        List<String> argumentos = cuerpo.lines().map(String::strip).filter(s -> !s.isEmpty())
                                .limit(5).map(s -> s.length() > 120 ? s.substring(0, 120) : s).toList();
                        iniciar(app, argumentos);
                        enviar(ex, 200, "application/json", estadoJson());
                    } else if (accion.equals("detener") && metodo.equals("POST")) {
                        detener(id);
                        enviar(ex, 200, "application/json", estadoJson());
                    } else if (accion.equals("entrada") && metodo.equals("POST")) {
                        Ejecucion e = EJECUCIONES.get(id);
                        Process p = e == null ? null : e.proceso;
                        if (p == null || !p.isAlive()) throw new IOException("El programa no está en ejecución");
                        String linea = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                        e.log(linea + "\n");
                        OutputStream in = p.getOutputStream();
                        in.write((linea + System.lineSeparator()).getBytes(StandardCharsets.UTF_8));
                        in.flush();
                        enviar(ex, 200, "application/json", "{\"ok\":true}");
                    } else {
                        enviar(ex, 405, "application/json", "{\"error\":\"Acción no válida\"}");
                    }
                } else {
                    enviar(ex, 404, "application/json", "{\"error\":\"Ruta no encontrada\"}");
                }
            } catch (Exception e) {
                String msg = e.getMessage() == null ? e.toString() : e.getMessage();
                enviar(ex, 500, "application/json", "{\"error\":" + json(msg) + "}");
            }
        }
    }

    static String estadoJson() {
        StringBuilder sb = new StringBuilder("{\"mysql\":").append(mysqlArriba()).append(",\"apps\":{");
        boolean primero = true;
        for (App a : APPS.values()) {
            Ejecucion e = EJECUCIONES.get(a.id());
            boolean corre = e != null && e.activa;
            boolean listo = corre && "ejecutando".equals(e.fase) && (a.puerto() == 0 || puertoAbierto(a.puerto()));
            if (!primero) sb.append(',');
            primero = false;
            sb.append(json(a.id())).append(":{\"tipo\":").append(json(a.tipo()))
                    .append(",\"corriendo\":").append(corre)
                    .append(",\"listo\":").append(listo)
                    .append(",\"fase\":").append(e == null ? "null" : json(e.fase))
                    .append(",\"puerto\":").append(a.puerto())
                    .append(",\"url\":").append(a.url() == null ? "null" : json(a.url()))
                    .append(",\"args\":").append("[" + String.join(",", a.argsPorDefecto().stream().map(Portal::json).toList()) + "]")
                    .append(",\"codigo\":").append(e == null || e.codigoSalida == null ? "null" : e.codigoSalida)
                    .append(",\"inicio\":").append(e == null ? 0 : e.inicio)
                    .append('}');
        }
        return sb.append("}}").toString();
    }

    static String logJson(String id, long desde) {
        Ejecucion e = EJECUCIONES.get(id);
        if (e == null) return "{\"texto\":\"\",\"siguiente\":0}";
        long fin = e.fin();
        if (desde > fin) desde = 0; // la aplicación se reinició
        return "{\"texto\":" + json(e.desde(desde)) + ",\"siguiente\":" + fin + "}";
    }

    // ------------------------------------------------------------------
    //  Código fuente
    // ------------------------------------------------------------------

    static final List<String> EXTENSIONES = List.of(".java", ".jsp", ".html", ".sql", ".properties", ".xml", ".css", ".md");

    static List<Path> archivosFuente() throws IOException {
        try (Stream<Path> s = Files.walk(LABS)) {
            return s.filter(Files::isRegularFile)
                    .filter(p -> !LABS.relativize(p).toString().replace('\\', '/').contains("/target/"))
                    .filter(p -> EXTENSIONES.stream().anyMatch(e -> p.getFileName().toString().endsWith(e)))
                    .sorted().toList();
        }
    }

    static String fuentesJson(boolean conCodigo) throws IOException {
        StringBuilder sb = new StringBuilder("[");
        boolean primero = true;
        for (Path p : archivosFuente()) {
            String codigo = Files.readString(p, StandardCharsets.UTF_8);
            if (!primero) sb.append(",\n");
            primero = false;
            sb.append("{\"ruta\":").append(json(LABS.relativize(p).toString().replace('\\', '/')))
                    .append(",\"lineas\":").append(codigo.lines().count());
            if (conCodigo) sb.append(",\"codigo\":").append(json(codigo.replace("\r", "")));
            sb.append('}');
        }
        return sb.append(']').toString();
    }

    /** Genera web/fuentes.js para que la sección de código funcione sin el portal (GitHub Pages). */
    static void exportarFuentes() throws IOException {
        Path destino = WEB.resolve("fuentes.js");
        Files.writeString(destino, "// Generado con: java portal/Portal.java --exportar\nwindow.FUENTES = "
                + fuentesJson(true) + ";\n", StandardCharsets.UTF_8);
        System.out.println("Generado " + RAIZ.relativize(destino) + " (" + archivosFuente().size() + " archivos)");
    }

    static Path rutaSegura(String relativa) throws IOException {
        if (relativa == null) throw new IOException("Falta el parámetro ruta");
        Path p = LABS.resolve(relativa).normalize();
        if (!p.startsWith(LABS) || !Files.isRegularFile(p)
                || EXTENSIONES.stream().noneMatch(e -> p.getFileName().toString().endsWith(e)))
            throw new IOException("Archivo no permitido");
        return p;
    }

    // ------------------------------------------------------------------
    //  Proxy para el probador de APIs (evita CORS) y archivos estáticos
    // ------------------------------------------------------------------

    static final HttpClient CLIENTE = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(3)).build();

    static void proxy(HttpExchange ex) throws IOException {
        try (ex) {
            if (!permitido(ex)) {
                enviar(ex, 403, "application/json", "{\"error\":\"Solicitud no permitida\"}");
                return;
            }
            String[] partes = ex.getRequestURI().getRawPath().split("/", 4);
            int puerto;
            try {
                puerto = Integer.parseInt(partes[2]);
            } catch (Exception e) {
                puerto = -1;
            }
            if (!PUERTOS_PROXY.contains(puerto)) {
                enviar(ex, 400, "application/json", "{\"error\":\"Puerto no permitido\"}");
                return;
            }
            String resto = "/" + (partes.length > 3 ? partes[3] : "");
            String query = ex.getRequestURI().getRawQuery();
            URI destino = URI.create("http://127.0.0.1:" + puerto + resto + (query == null ? "" : "?" + query));
            byte[] cuerpo = ex.getRequestBody().readAllBytes();
            HttpRequest.Builder rb = HttpRequest.newBuilder(destino).timeout(Duration.ofSeconds(30))
                    .method(ex.getRequestMethod(), cuerpo.length == 0 ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofByteArray(cuerpo));
            for (String h : List.of("Content-Type", "Accept", "X-API-KEY")) {
                String v = ex.getRequestHeaders().getFirst(h);
                if (v != null) rb.header(h, v);
            }
            long t0 = System.nanoTime();
            try {
                HttpResponse<byte[]> r = CLIENTE.send(rb.build(), HttpResponse.BodyHandlers.ofByteArray());
                ex.getResponseHeaders().set("X-Tiempo-Ms", String.valueOf((System.nanoTime() - t0) / 1_000_000));
                enviar(ex, r.statusCode(), r.headers().firstValue("Content-Type").orElse("text/plain; charset=utf-8"), r.body());
            } catch (Exception e) {
                enviar(ex, 502, "application/json",
                        "{\"error\":\"No se pudo conectar con localhost:" + puerto + ". ¿Está encendido el servidor?\"}");
            }
        }
    }

    static final Map<String, String> TIPOS = Map.of(".html", "text/html; charset=utf-8",
            ".css", "text/css; charset=utf-8", ".js", "text/javascript; charset=utf-8",
            ".svg", "image/svg+xml", ".png", "image/png", ".webp", "image/webp", ".ico", "image/x-icon",
            ".json", "application/json", ".pdf", "application/pdf", ".mp4", "video/mp4");

    static void estatico(HttpExchange ex) throws IOException {
        try (ex) {
            String ruta = URLDecoder.decode(ex.getRequestURI().getPath(), StandardCharsets.UTF_8);
            if (ruta.endsWith("/")) ruta += "index.html";
            Path f = WEB.resolve(ruta.substring(1)).normalize();
            if (!f.startsWith(WEB) || !Files.isRegularFile(f)) {
                enviar(ex, 404, "text/plain; charset=utf-8", "No encontrado");
                return;
            }
            String nombre = f.getFileName().toString();
            String ext = nombre.contains(".") ? nombre.substring(nombre.lastIndexOf('.')) : "";
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
            enviar(ex, 200, TIPOS.getOrDefault(ext, "application/octet-stream"), Files.readAllBytes(f));
        }
    }

    // ------------------------------------------------------------------
    //  Utilidades
    // ------------------------------------------------------------------

    static String parametro(HttpExchange ex, String nombre, String defecto) {
        String q = ex.getRequestURI().getRawQuery();
        if (q == null) return defecto;
        for (String par : q.split("&")) {
            int i = par.indexOf('=');
            if (i > 0 && par.substring(0, i).equals(nombre))
                return URLDecoder.decode(par.substring(i + 1), StandardCharsets.UTF_8);
        }
        return defecto;
    }

    static void enviar(HttpExchange ex, int codigo, String tipo, String cuerpo) throws IOException {
        enviar(ex, codigo, tipo, cuerpo.getBytes(StandardCharsets.UTF_8));
    }

    static void enviar(HttpExchange ex, int codigo, String tipo, byte[] datos) throws IOException {
        ex.getResponseHeaders().set("Content-Type", tipo);
        ex.sendResponseHeaders(codigo, datos.length == 0 ? -1 : datos.length);
        if (datos.length > 0) {
            try (OutputStream os = ex.getResponseBody()) { os.write(datos); }
        }
    }

    static String json(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '<' -> sb.append("\\u003c"); // seguro dentro de <script>
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.append('"').toString();
    }
}
