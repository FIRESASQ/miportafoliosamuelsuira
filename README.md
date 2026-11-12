# 🌊 Portafolio · Programación V — Samuel Suira

Portafolio del curso **Programación V** (Universidad Autónoma de Chiriquí, 2026-II). Es una página con temática de océano: empiezas en la superficie y, a medida que bajas, te adentras en el mar. Al bajar recorres:

- **Inicio**
- **Sobre mí**
- **Aplicaciones**, que se ejecutan de verdad desde la página.
- **Códigos fuente** de todos los laboratorios.

## Aplicaciones

| Programa | Lab | Qué hace |
|---|---|---|
| **Registro de estudiantes** | 4 | Página web para agregar, buscar, cambiar y borrar estudiantes. Todo queda guardado en una base de datos. |
| **Inventario de productos** | 5 | Página web que controla cuántas unidades hay de cada producto de una tienda. No deja sacar más de las que existen. |
| **Reservas de salones** | 7 | Programa que recibe reservas de salones de muchas personas al mismo tiempo, sin permitir dos reservas a la misma hora. |
| **Reservas de laboratorios** | 8 | Programa que guarda reservas de laboratorios. Pide una clave para hacer cambios y avisa cuando faltan datos o dos reservas chocan. |
| Programas de texto | 1, 2, 7, 8 | Facturas calculadas en paralelo, revisión de errores, cuenta bancaria, pago de empleados, pedidos de reserva y un menú de reservas. |

## Cómo probarlo

### 1. Probarlo en internet (sin instalar nada, también desde el celular)
Abre **https://firesasq.github.io/miportafoliosamuelsuira/**. Ahí los 13 programas funcionan dentro del navegador: cada uno está traducido a JavaScript desde su código Java original, con las mismas reglas y los mismos textos. Los datos de las páginas de estudiantes e inventario se guardan en el navegador de quien las usa.

### 2. Ejecutar el Java original con Docker
Solo hace falta [Docker Desktop](https://www.docker.com/products/docker-desktop/):

```bash
git clone https://github.com/FIRESASQ/miportafoliosamuelsuira.git
cd miportafoliosamuelsuira
docker compose up --build
```

Abre **http://localhost:9000**. La imagen compila los laboratorios, trae Tomcat y levanta MariaDB con los datos de ejemplo (`db/init.sql`). Para apagarlo: `Ctrl+C` y luego `docker compose down`.

### 3. Ejecutar en local sin Docker
Requisitos:
- **Java 21 o superior**
- **Maven**
- **MySQL o MariaDB** en el puerto 3306, con usuario `root` sin clave (por ejemplo, XAMPP)

Ejecuta **`iniciar.bat`** en Windows o **`./iniciar.sh`** en Linux/macOS, y abre http://localhost:9000.

La primera vez que ejecutas cada laboratorio, el portal:
- lo compila con Maven;
- crea las bases de datos que falten con `db/init.sql`;
- si no encuentra Tomcat, descarga Tomcat 10.1 desde archive.apache.org.

En Windows con XAMPP, también enciende MySQL solo.

| Servicio | Puerto |
|---|---|
| Portal (la página) | 9000 |
| Lab 8 · ReservasLab API | 8080 |
| Lab 4 · MVC Estudiantes | 8081 |
| Lab 5 · Inventario (Tomcat) | 8082 |
| Lab 7 · ReservaFE | 3000 |
| MySQL / MariaDB | 3306 |

## Cómo está hecho

```
portal/Portal.java   Servidor en Java puro (HttpServer del JDK). Sirve la web, arranca cada
                     laboratorio con ProcessBuilder, envía su salida a la terminal de la página
                     y hace de proxy para el probador de APIs. Solo ejecuta su propio catálogo.
web/                 La página: HTML, CSS y JavaScript sin frameworks.
  oceano.js          El mar: shader WebGL propio (cielo, olas, cruce de la superficie, rayos de luz,
                     cáusticas y oscuridad de las profundidades) controlado por el scroll.
  fuentes.js         Código fuente exportado para la versión web (java portal/Portal.java --exportar).
  navegador.js       Los programas traducidos a JavaScript para que funcionen en el navegador cuando el
                     portal Java no está encendido (GitHub Pages, celulares). Responde a las mismas rutas
                     que el portal, así el resto de la página funciona igual.
  docs/              Los documentos en PDF de los laboratorios 3 y 6.
labs/                Código de los laboratorios (proyectos Maven).
db/init.sql          Bases de datos de los labs 4 y 5 (se puede ejecutar varias veces).
```

## Publicar en GitHub Pages
1. Sube el repositorio a GitHub con la rama `main`.
2. En **Settings → Pages**, elige **Source: GitHub Actions**.
3. El flujo `.github/workflows/pages.yml` publica la carpeta `web/` en cada push.

---

Algunos proyectos parten del código base entregado en el curso (MVC Estudiantes, Inventario JSP y ReservasLab API). Las credenciales de `db/init.sql` y de los laboratorios son solo para la demo local.
