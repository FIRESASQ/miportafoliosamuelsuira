// Los laboratorios funcionando dentro del navegador (GitHub Pages, celulares, o cuando no hay
// portal Java). Cada programa está traducido a JavaScript desde su código Java original, con
// las mismas reglas y los mismos textos. Responde con las mismas rutas que portal/Portal.java
// (api/estado, api/apps/..., proxy/...), así el resto de la página funciona igual en los dos casos.
(() => {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const ahora = () => performance.now();

  // ------------------------------------------------------------------
  //  Formatos como los de Java
  // ------------------------------------------------------------------
  const f2 = (n) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);   // %.2f
  const dbl = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n));             // println(double)
  const izq = (s, n) => String(s).padEnd(n);                                        // %-Ns
  const dos = (x) => String(x).padStart(2, '0');
  function horaJava(conMs) {                                                        // LocalTime
    const d = new Date();
    const h = `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
    return conMs ? `${h}.${String(d.getMilliseconds()).padStart(3, '0')}` : h;
  }
  const mapaJava = (obj) => '{' + Object.keys(obj).sort().map((k) => `${k}=${obj[k]}`).join(', ') + '}';
  const citar = (a) => (a.includes(' ') ? `"${a}"` : a);

  // Semáforo: limita cuántas tareas corren a la vez (pool de hilos, núcleos del procesador)
  function semaforo(cupos) {
    let libres = cupos;
    const cola = [];
    return {
      async tomar() { if (libres > 0) { libres--; return; } await new Promise((r) => cola.push(r)); },
      soltar() { if (cola.length) cola.shift()(); else libres++; }
    };
  }

  // Nombres de hilos como los de un ExecutorService: pool-1-thread-1, pool-1-thread-2, ...
  function hilos(max) {
    const usados = new Set();
    return {
      tomar() { for (let i = 1; i <= max; i++) if (!usados.has(i)) { usados.add(i); return i; } return max; },
      soltar(i) { usados.delete(i); }
    };
  }

  // ------------------------------------------------------------------
  //  Ejecuciones (lo mismo que guarda el portal Java por cada programa)
  // ------------------------------------------------------------------
  const EJ = {};
  function nuevaEjecucion(id) {
    const e = { texto: '', corriendo: true, listo: false, fase: 'ejecutando', codigo: null, inicio: Date.now(),
      cancelado: false, cola: [], esperando: null, servicio: null };
    EJ[id] = e;
    return e;
  }
  const log = (e, t) => { e.texto += t; };
  function consola(e) {
    return {
      print: (t) => log(e, t),
      println: (t = '') => log(e, t + '\n'),
      leerLinea: () => new Promise((r) => { if (e.cancelado) r(null); else if (e.cola.length) r(e.cola.shift()); else e.esperando = r; }),
      get cancelado() { return e.cancelado; }
    };
  }

  // ------------------------------------------------------------------
  //  Lab 7 · Servidor de reservas ReservaFE (Servidor.java)
  // ------------------------------------------------------------------
  function servidorReservaFE(modo, e) {
    const espacios = [
      { id: 1, nombre: 'Laboratorio de Cómputo 1', capacidad: 30 },
      { id: 2, nombre: 'Laboratorio de Cómputo 2', capacidad: 25 },
      { id: 3, nombre: 'Auditorio', capacidad: 120 }];
    const reservas = [];
    let atendidas = 0;
    const virtual = modo === 'virtual';
    const tamano = virtual ? Infinity : parseInt(modo, 10);
    const pool = semaforo(tamano);
    const nombres = hilos(virtual ? 1 : tamano);
    const nucleos = navigator.hardwareConcurrency || 4;
    const cpu = semaforo(nucleos);
    const jEspacio = (x) => `{"id":${x.id},"nombre":"${x.nombre}","capacidad":${x.capacidad}}`;
    const jReserva = (r) => `{"id":${r.id},"espacioId":${r.espacioId},"fecha":"${r.fecha}","hora":"${r.hora}","solicitante":"${r.solicitante}"}`;
    const texto = (json, clave) => { const m = new RegExp(`"${clave}"\\s*:\\s*"([^"]*)"`).exec(json); return m ? m[1] : null; };
    const numero = (json, clave) => { const m = new RegExp(`"${clave}"\\s*:\\s*(-?\\d+)`).exec(json); return m ? parseInt(m[1], 10) : null; };
    const parametro = (q, nombre, defecto) => {
      if (!q) return defecto;
      for (const par of q.split('&')) { const kv = par.split('='); if (kv.length === 2 && kv[0] === nombre) return parseInt(kv[1], 10); }
      return defecto;
    };

    log(e, `Servidor de reservas en http://localhost:3000 (hilos: ${modo}, núcleos: ${nucleos})\n`);

    return async function atender(metodo, ruta, query, cuerpo) {
      if (!ruta.startsWith('/api/')) return { status: 404, body: '<h1>404 Not Found</h1>No context found for request', tipo: 'text/html' };
      await pool.tomar();
      const hilo = virtual ? '' : `pool-1-thread-${nombres.tomar()}`;
      try {
        atendidas++;
        log(e, `${horaJava(true)}  ${izq(metodo, 6)} ${ruta}${query ? '?' + query : ''}  [${hilo}]\n`);
        if (metodo === 'GET' && ruta === '/api/espacios') return { status: 200, body: '[' + espacios.map(jEspacio).join(',') + ']' };
        if (metodo === 'GET' && ruta === '/api/reservas') return { status: 200, body: '[' + reservas.map(jReserva).join(',') + ']' };
        if (metodo === 'POST' && ruta === '/api/reservas') {
          const espacioId = numero(cuerpo, 'espacioId'), fecha = texto(cuerpo, 'fecha'), hora = texto(cuerpo, 'hora'), solicitante = texto(cuerpo, 'solicitante');
          if (espacioId == null || fecha == null || hora == null || solicitante == null)
            return { status: 400, body: '{"error":"espacioId, fecha, hora y solicitante son obligatorios"}' };
          if (!espacios.some((x) => x.id === espacioId)) return { status: 404, body: '{"error":"El espacio no existe"}' };
          if (reservas.some((r) => r.espacioId === espacioId && r.fecha === fecha && r.hora === hora))
            return { status: 409, body: '{"error":"Ese espacio ya está reservado en esa fecha y hora"}' };
          const nueva = { id: reservas.length + 1, espacioId, fecha, hora, solicitante };
          reservas.push(nueva);
          return { status: 201, body: jReserva(nueva) };
        }
        if (metodo === 'GET' && ruta === '/api/lento') {
          const ms = parametro(query, 'ms', 500);
          await espera(ms);                                   // el hilo queda ocupado esperando
          return { status: 200, body: `{"tipo":"espera (E/S)","ms":${ms}}` };
        }
        if (metodo === 'GET' && ruta === '/api/bloqueante') {
          const ms = parametro(query, 'ms', 500);
          await cpu.tomar();                                  // el cálculo ocupa un núcleo del procesador
          try { await espera(ms); } finally { cpu.soltar(); }
          return { status: 200, body: `{"tipo":"cálculo (CPU)","ms":${ms}}` };
        }
        if (metodo === 'GET' && ruta === '/api/estado') return { status: 200, body: `{"estado":"ok","solicitudesAtendidas":${atendidas}}` };
        return { status: 404, body: '{"error":"Ruta no encontrada"}' };
      } finally {
        if (!virtual) nombres.soltar(parseInt(hilo.split('-').pop(), 10));
        pool.soltar();
      }
    };
  }

  // ------------------------------------------------------------------
  //  Lab 8 · ReservasLab API (modelo, datos, negocio y servidor)
  // ------------------------------------------------------------------
  class Validacion extends Error { constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; } }

  function servidorReservasLab(e) {
    const LABS = ['LAB-1', 'LAB-2', 'LAB-3'];
    const tabla = new Map();
    let secuencia = 0;
    const vacio = (s) => s == null || s.trim() === '';
    const texto = (s) => (s == null ? 'null' : '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
    const jReserva = (r) => `{"id":${r.id},"laboratorio":${texto(r.laboratorio)},"solicitante":${texto(r.solicitante)},"fecha":${texto(r.fecha)},"horaInicio":${texto(r.horaInicio)},"horaFin":${texto(r.horaFin)},"estado":${texto(r.estado)}}`;
    const jError = (c, m) => `{"error":${c},"mensaje":${texto(m)}}`;
    const guardar = (r) => { if (!r.id) r.id = ++secuencia; tabla.set(r.id, r); return r; };
    const listar = () => [...tabla.values()].sort((a, b) => a.id - b.id);

    function parsearPlano(json) {                       // Json.parsearPlano
      const m = {};
      if (json == null) return m;
      let s = json.trim();
      if (!s.startsWith('{') || !s.endsWith('}')) { const err = new Error('El cuerpo debe ser un objeto JSON'); err.malFormada = true; throw err; }
      s = s.substring(1, s.length - 1);
      let i = 0;
      while (i < s.length) {
        const ini = s.indexOf('"', i);
        if (ini < 0) break;
        const fin = s.indexOf('"', ini + 1);
        const clave = s.substring(ini + 1, fin);
        let j = s.indexOf(':', fin) + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        let valor;
        if (j < s.length && s[j] === '"') {
          let sb = '';
          j++;
          while (j < s.length && s[j] !== '"') { if (s[j] === '\\' && j + 1 < s.length) j++; sb += s[j]; j++; }
          valor = sb;
          j++;
        } else {
          let coma = s.indexOf(',', j);
          if (coma < 0) coma = s.length;
          valor = s.substring(j, coma).trim();
          j = coma;
        }
        m[clave] = valor;
        i = j + 1;
      }
      return m;
    }
    const aReserva = (json) => { const m = parsearPlano(json); return { laboratorio: m.laboratorio, solicitante: m.solicitante, fecha: m.fecha, horaInicio: m.horaInicio, horaFin: m.horaFin, estado: 'ACTIVA' }; };

    function obtener(id) { const r = tabla.get(id); if (!r) throw new Validacion(404, 'No existe la reserva con id ' + id); return r; }
    function validarDatos(r) {
      if (vacio(r.laboratorio) || vacio(r.solicitante) || vacio(r.fecha) || vacio(r.horaInicio) || vacio(r.horaFin))
        throw new Validacion(400, 'Campos obligatorios: laboratorio, solicitante, fecha, horaInicio, horaFin');
      if (!LABS.includes(r.laboratorio.toUpperCase())) throw new Validacion(400, 'Laboratorio inválido. Use: [' + LABS.join(', ') + ']');
      r.laboratorio = r.laboratorio.toUpperCase();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) throw new Validacion(400, 'La fecha debe tener formato yyyy-MM-dd');
      if (!/^\d{2}:\d{2}$/.test(r.horaInicio) || !/^\d{2}:\d{2}$/.test(r.horaFin)) throw new Validacion(400, 'Las horas deben tener formato HH:mm');
      if (r.horaInicio >= r.horaFin) throw new Validacion(400, 'horaInicio debe ser menor que horaFin');
    }
    function validarChoque(nueva, idIgnorado) {
      for (const r of tabla.values()) {
        if (r.laboratorio.toLowerCase() !== nueva.laboratorio.toLowerCase() || r.fecha !== nueva.fecha || r.id === idIgnorado) continue;
        if (nueva.horaInicio < r.horaFin && r.horaInicio < nueva.horaFin)
          throw new Validacion(409, `Choque de horario con la reserva #${r.id} (${r.horaInicio}-${r.horaFin})`);
      }
    }
    const crear = (r) => { validarDatos(r); validarChoque(r, 0); r.estado = 'ACTIVA'; return guardar(r); };

    // ServidorReservas.cargarDatosDemo
    crear({ laboratorio: 'LAB-1', solicitante: 'Prof. Flores', fecha: '2026-10-22', horaInicio: '07:00', horaFin: '08:35' });
    crear({ laboratorio: 'LAB-2', solicitante: 'Grupo PROG V', fecha: '2026-10-22', horaInicio: '09:00', horaFin: '10:30' });
    crear({ laboratorio: 'LAB-1', solicitante: 'Club de Robótica', fecha: '2026-10-23', horaInicio: '14:00', horaFin: '16:00' });

    ['==============================================', ' Servidor de Reservas de Laboratorios - UNACHI',
      ' Escuchando en http://localhost:8080/api/reservas', ' Hilos de atención: 10', ' (Ctrl+C para detener)',
      '=============================================='].forEach((l) => log(e, l + '\n'));

    const pool = semaforo(10);
    const nombres = hilos(10);
    return async function atender(metodo, ruta, query, cuerpo, cabeceras) {
      if (!ruta.startsWith('/api/reservas')) return { status: 404, body: '<h1>404 Not Found</h1>No context found for request', tipo: 'text/html' };
      await pool.tomar();
      const n = nombres.tomar();
      const t0 = ahora();
      let codigo, salida;
      try {
        await espera(1 + Math.random() * 3);
        const resto = ruta.substring('/api/reservas'.length);
        let id = null;
        if (resto !== '' && resto !== '/') {
          if (!/^\/-?\d+$/.test(resto)) throw new Validacion(400, 'El id debe ser numérico');
          id = parseInt(resto.substring(1), 10);
        }
        if (metodo !== 'GET' && cabeceras['X-API-KEY'] !== 'unachi-prog5') throw new Validacion(401, 'Falta o es inválido el encabezado X-API-KEY');
        if (metodo === 'GET' && id == null) { codigo = 200; salida = '[' + listar().map(jReserva).join(',') + ']'; }
        else if (metodo === 'GET') { codigo = 200; salida = jReserva(obtener(id)); }
        else if (metodo === 'POST' && id == null) { codigo = 201; salida = jReserva(crear(aReserva(cuerpo))); }
        else if (metodo === 'PUT' && id != null) {
          const actual = obtener(id);
          const cambios = aReserva(cuerpo);
          validarDatos(cambios);
          validarChoque(cambios, id);
          Object.assign(actual, { laboratorio: cambios.laboratorio, solicitante: cambios.solicitante, fecha: cambios.fecha, horaInicio: cambios.horaInicio, horaFin: cambios.horaFin });
          codigo = 200; salida = jReserva(guardar(actual));
        } else if (metodo === 'DELETE' && id != null) {
          if (!tabla.delete(id)) throw new Validacion(404, 'No existe la reserva con id ' + id);
          codigo = 204; salida = '';
        } else throw new Validacion(405, `Método ${metodo} no permitido en ${ruta}`);
      } catch (err) {
        if (err instanceof Validacion) { codigo = err.codigo; salida = jError(codigo, err.message); }
        else if (err.malFormada) { codigo = 400; salida = jError(400, 'Solicitud mal formada: ' + err.message); }
        else { codigo = 500; salida = jError(500, 'Error interno del servidor'); }
      } finally {
        nombres.soltar(n);
        pool.soltar();
      }
      log(e, `[${horaJava(false)}] ${izq(metodo, 6)} ${izq(ruta, 22)} -> ${codigo} (${Math.floor(ahora() - t0)} ms) [pool-1-thread-${n}]\n`);
      return { status: codigo, body: salida };
    };
  }

  // Pedido de un programa cliente a un servicio que corre en el navegador
  class SinConexion extends Error {}
  async function pedir(puerto, metodo, rutaCompleta, cuerpo = null, cabeceras = {}) {
    const id = PUERTOS[puerto];
    const ej = id && EJ[id];
    if (!ej || !ej.corriendo || !ej.listo || !ej.servicio) throw new SinConexion();
    const [ruta, query] = rutaCompleta.split('?');
    return ej.servicio(metodo, ruta, query || '', cuerpo, cabeceras);
  }

  // ------------------------------------------------------------------
  //  Programas de texto
  // ------------------------------------------------------------------
  const PROGRAMAS = {
    // Lab 1 · Main → AppController → ConsoleView
    'l1-main': async (io) => {
      const summary = (id, name) => `Student{id='${id}', name='${name}'}`;
      io.println('Hola Programacion V');
      io.println('Modelo: ' + summary('2026-001', 'Nombre Apellido'));
    },

    // Lab 2 · MaestroEsclavoFacturas
    'l2-maestro': async (io) => {
      const lote = [];
      for (let i = 1; i <= 20; i++) lote.push({ id: i, monto: 50 + i * 7.35 });
      const esclavos = 4, base = Math.floor(lote.length / esclavos), resto = lote.length % esclavos;
      const sublotes = [];
      for (let i = 0, ini = 0; i < esclavos; i++) {
        const tam = base + (i < resto ? 1 : 0);
        if (!tam) continue;
        sublotes.push(lote.slice(ini, ini + tam));
        ini += tam;
      }
      io.println(`[Maestro] Repartiendo ${lote.length} facturas en ${sublotes.length} sublotes...`);
      // Cada esclavo trabaja en paralelo: el orden en que terminan cambia en cada ejecución
      const parciales = await Promise.all(sublotes.map(async (sub, i) => {
        await espera(5 + Math.random() * 40);
        const sin = sub.reduce((s, f) => s + f.monto, 0), itbms = sin * 0.07;
        io.println(`  [Esclavo ${i + 1}] procesó ${sub.length} facturas -> subtotal: ${f2(sin)}, ITBMS: ${f2(itbms)}`);
        return { n: sub.length, sin, itbms, con: sin + itbms };
      }));
      const t = parciales.reduce((a, p) => ({ n: a.n + p.n, sin: a.sin + p.sin, itbms: a.itbms + p.itbms, con: a.con + p.con }), { n: 0, sin: 0, itbms: 0, con: 0 });
      io.println();
      io.println('===== REPORTE CONSOLIDADO DE FACTURACIÓN =====');
      io.println(`Facturas procesadas : ${t.n}`);
      io.println(`Subtotal            : ${f2(t.sin)}`);
      io.println(`Total ITBMS (7%)    : ${f2(t.itbms)}`);
      io.println(`TOTAL CON IMPUESTO   : ${f2(t.con)}`);
    },

    // Lab 2 · PipeFilterLogs
    'l2-pipe': async (io) => {
      const logs = [['INFO', '-'], ['ERROR', 'ConexionBD'], ['DEBUG', '-'], ['WARN', 'Timeout'], ['ERROR', 'Autenticacion'],
        ['ERROR', 'ConexionBD'], ['INFO', '-'], ['WARN', 'Timeout'], ['ERROR', 'Autenticacion']];
      const filtradas = logs.filter(([nivel]) => nivel === 'ERROR' || nivel === 'WARN');
      io.println(`[Filtro 1 - Filtrado de errores] ${logs.length} líneas -> ${filtradas.length} relevantes (ERROR/WARN)`);
      const conteos = new Map();
      filtradas.forEach(([, tipo]) => conteos.set(tipo, (conteos.get(tipo) || 0) + 1));
      io.println(`[Filtro 2 - Agregación por tipo] ${conteos.size} tipos de error distintos encontrados`);
      let reporte = '===== REPORTE DE INCIDENCIAS =====\n';
      conteos.forEach((n, tipo) => { reporte += `- ${izq(tipo, 20)} : ${n} ocurrencia(s)\n`; });
      io.println('[Filtro 3 - Generación de reporte] reporte final construido');
      io.println();
      io.println(reporte);
    },

    // Lab 2 · CuentaBancaria (objetos.Main)
    'l2-cuenta': async (io) => {
      class CuentaBancaria {
        constructor() { this.numerocuenta = null; this.nombrecuenta = null; this.saldo = 0; this.estado = 0; }
        setEstado(e) { if (e === 0 || e === 1) this.estado = e; }
        setSaldo(s) { if (s > 0) this.saldo = s; }
        depositar(m) { if (m > 0) { this.saldo += m; return 1; } return 0; }
      }
      const juan = new CuentaBancaria(), enrique = new CuentaBancaria();
      juan.numerocuenta = '1-2000-988';
      juan.setSaldo(10.0);
      io.println(dbl(juan.saldo));
      juan.setSaldo(-25.0);
      io.println(dbl(juan.saldo));
      juan.setEstado(1);
      io.println('El estado es ' + juan.estado);
      enrique.setSaldo(100.00);
      enrique.nombrecuenta = 'Enrique';
      io.println(enrique.nombrecuenta + dbl(enrique.saldo));
      enrique.setSaldo(1);
      io.println(enrique.depositar(0.9) === 1 ? 'Operacion de Deposito Exitosa' : 'Operacion de Deposito No Exitosa');
    },

    // Lab 2 · Taller POO: nómina con polimorfismo
    'l2-taller': async (io) => {
      const nomina = [
        { tipo: 'Gerente', nombre: 'Ana Pérez', cedula: '8-123-456', base: 1200, salario: () => 1200 + 400 },
        { tipo: 'Vendedor', nombre: 'Luis Gómez', cedula: '4-789-012', base: 800, salario: () => 800 + 5000 * 0.05 },
        { tipo: 'Vendedor', nombre: 'Carla Ruiz', cedula: '1-456-789', base: 800, salario: () => 800 + 12000 * 0.05 },
        { tipo: 'Operario', nombre: 'José Ríos', cedula: '9-321-654', base: 700, salario: () => 700 + 10 * 4.50 }];
      io.println('===== REPORTE DE NÓMINA =====');
      io.println(`${izq('Tipo', 10)} | ${izq('Nombre', 12)} | ${izq('Cédula', 10)} | Salario final`);
      io.println('---------------------------------------------------------------');
      let total = 0;
      for (const e of nomina) {
        io.println(`${izq(e.tipo, 10)} | ${izq(e.nombre, 12)} | ${izq(e.cedula, 10)} | $${f2(e.salario())}`);
        total += e.salario();
      }
      io.println('---------------------------------------------------------------');
      io.println(`TOTAL A PAGAR ESTE MES: $${f2(total)}`);
      io.println();
      io.println('===== VENDEDORES CON COMISIÓN DESTACADA (> $500) =====');
      for (const e of nomina) {
        const comision = e.salario() - e.base;
        if (e.tipo === 'Vendedor' && comision > 500) io.println(`${e.nombre} generó una comisión de $${f2(comision)}`);
      }
    },

    // Lab 7 · Cliente.java
    'l7-cliente': async (io, args) => {
      const solicitante = args.length > 0 ? args[0] : 'Estudiante';
      try {
        const r1 = await pedir(3000, 'GET', '/api/espacios');
        io.println('Espacios disponibles: ' + r1.body);
        const json = `{"espacioId":1,"fecha":"2026-10-20","hora":"07:00","solicitante":"${solicitante}"}`;
        const r2 = await pedir(3000, 'POST', '/api/reservas', json, { 'Content-Type': 'application/json' });
        io.println('Respuesta del servidor: ' + r2.status + ' ' + r2.body);
      } catch (err) {
        if (!(err instanceof SinConexion)) throw err;
        io.println('No se pudo conectar con el servidor en http://localhost:3000. ¿Está encendido?');
      }
    },

    // Lab 7 · Carga.java
    'l7-carga': async (io, args) => {
      const ruta = args.length > 0 ? args[0] : '/api/lento?ms=500';
      const cantidad = args.length > 1 ? parseInt(args[1], 10) : 20;
      if (Number.isNaN(cantidad)) throw new Error(`Exception in thread "main" java.lang.NumberFormatException: For input string: "${args[1]}"`);
      io.println(`Enviando ${cantidad} solicitudes simultáneas a ${ruta} ...`);
      const inicio = ahora();
      const res = await Promise.all(Array.from({ length: cantidad }, async (_, k) => {
        const t0 = ahora();
        try {
          const r = ruta === 'reservas'
            ? await pedir(3000, 'POST', '/api/reservas', `{"espacioId":3,"fecha":"2026-10-22","hora":"09:00","solicitante":"Cliente ${k + 1}"}`)
            : await pedir(3000, 'GET', ruta);
          return [r.status, Math.round(ahora() - t0)];
        } catch {
          return [-1, Math.round(ahora() - t0)];
        }
      }));
      const total = Math.round(ahora() - inicio);
      const tiempos = res.map((r) => r[1]);
      const codigos = {};
      res.forEach(([c]) => { const k = c === -1 ? 'ERROR' : String(c); codigos[k] = (codigos[k] || 0) + 1; });
      io.println('Tiempo total:            ' + total + ' ms');
      io.println('Respuesta más rápida:    ' + Math.min(...tiempos) + ' ms');
      io.println('Respuesta más lenta:     ' + Math.max(...tiempos) + ' ms');
      io.println('Promedio por solicitud:  ' + Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) + ' ms');
      io.println('Códigos de estado:       ' + mapaJava(codigos));
    },

    // Lab 8 · ClienteConsola en modo demo
    'l8-demo': async (io) => clienteReservas(io, true),

    // Lab 8 · ClienteConsola con menú interactivo
    'l8-menu': async (io) => clienteReservas(io, false)
  };

  // Lab 8 · ClienteConsola.java (demo automática y menú)
  async function clienteReservas(io, demo) {
    const URL = '/api/reservas';
    async function enviar(metodo, ruta, json, conClave = true) {
      const t0 = ahora();
      try {
        const r = await pedir(8080, metodo, ruta, json, conClave ? { 'X-API-KEY': 'unachi-prog5' } : {});
        return { codigo: r.status, cuerpo: r.body || '', ms: Math.floor(ahora() - t0) };
      } catch (err) {
        if (!(err instanceof SinConexion)) throw err;
        return { codigo: -1, cuerpo: 'No se pudo conectar: ¿el servidor está encendido?', ms: Math.floor(ahora() - t0) };
      }
    }
    const json = (lab, sol, fecha, hi, hf) => `{"laboratorio":"${lab}","solicitante":"${sol}","fecha":"${fecha}","horaInicio":"${hi}","horaFin":"${hf}"}`;
    function mostrar(r) {
      io.println('  <- ' + (r.codigo === -1 ? 'SIN CONEXIÓN' : 'HTTP ' + r.codigo) + ' (' + r.ms + ' ms)');
      if (r.cuerpo) io.println('  ' + r.cuerpo.split('},{').join('},\n   {'));
    }
    const paso = (t) => { io.println(); io.println('>>> ' + t); };
    async function pruebaDeCarga(n) {
      io.println(`Enviando ${n} solicitudes GET en paralelo...`);
      const t0 = ahora();
      const res = await Promise.all(Array.from({ length: n }, () => enviar('GET', URL, null)));
      const ok = res.filter((r) => r.codigo === 200).length;
      const suma = res.reduce((s, r) => s + r.ms, 0), max = Math.max(...res.map((r) => r.ms));
      io.println(`Exitosas: ${ok}/${n} | promedio: ${Math.floor(suma / n)} ms | máximo: ${max} ms | total: ${Math.floor(ahora() - t0)} ms`);
      io.println(max <= 500 ? 'CUMPLE RNF-02 (tiempo de respuesta <= 500 ms)' : 'NO CUMPLE RNF-02 (tiempo de respuesta <= 500 ms)');
    }

    if (demo) {
      paso('1) Listar reservas iniciales');
      mostrar(await enviar('GET', URL, null));
      paso('2) Crear reserva válida (201 Created)');
      mostrar(await enviar('POST', URL, json('LAB-3', 'Ana Pérez', '2026-10-24', '08:00', '10:00')));
      paso('3) Crear reserva que choca con #1 (409 Conflict)');
      mostrar(await enviar('POST', URL, json('LAB-1', 'Luis Gómez', '2026-10-22', '08:00', '09:00')));
      paso('4) Crear reserva con datos incompletos (400 Bad Request)');
      mostrar(await enviar('POST', URL, '{"laboratorio":"LAB-2"}'));
      paso('5) Consultar reserva inexistente (404 Not Found)');
      mostrar(await enviar('GET', URL + '/99', null));
      paso('6) Modificar reserva #2 (200 OK)');
      mostrar(await enviar('PUT', URL + '/2', json('LAB-2', 'Grupo PROG V', '2026-10-22', '10:30', '12:00')));
      paso('7) Cancelar reserva #3 (204 No Content)');
      mostrar(await enviar('DELETE', URL + '/3', null));
      paso('8) Escribir sin API key (401 Unauthorized) - RNF-01 Seguridad');
      const sinClave = await enviar('DELETE', URL + '/1', null, false);
      mostrar({ ...sinClave, ms: 0 });
      paso('9) Prueba de carga - RNF-02 Rendimiento / RNF-04 Concurrencia');
      await pruebaDeCarga(20);
      return;
    }

    const leerEntero = async () => {
      const l = await io.leerLinea();
      if (l === null) return null;
      return /^[+-]?\d+$/.test(l.trim()) ? parseInt(l.trim(), 10) : -99;
    };
    const leerTexto = async () => { const l = await io.leerLinea(); return l === null ? null : l.trim(); };
    async function pedirDatos() {
      const v = [];
      for (const p of ['Laboratorio (LAB-1/LAB-2/LAB-3): ', 'Solicitante: ', 'Fecha (yyyy-MM-dd): ', 'Hora inicio (HH:mm): ', 'Hora fin (HH:mm): ']) {
        io.print(p);
        const t = await leerTexto();
        if (t === null) return null;
        v.push(t);
      }
      return json(...v);
    }
    let op;
    do {
      io.println();
      ['===== CLIENTE RESERVAS DE LABORATORIO =====', '1. Listar reservas            (GET)', '2. Consultar reserva por id   (GET)',
        '3. Crear reserva              (POST)', '4. Modificar reserva          (PUT)', '5. Cancelar reserva           (DELETE)',
        '6. Prueba de carga RNF (20 solicitudes simultáneas)', '0. Salir'].forEach((l) => io.println(l));
      io.print('Opción: ');
      op = await leerEntero();
      if (op === null) return;
      if (op === 1) mostrar(await enviar('GET', URL, null));
      else if (op === 2) { io.print('Id: '); const id = await leerEntero(); if (id === null) return; mostrar(await enviar('GET', URL + '/' + id, null)); }
      else if (op === 3) { const d = await pedirDatos(); if (d === null) return; mostrar(await enviar('POST', URL, d)); }
      else if (op === 4) {
        io.print('Id a modificar: ');
        const id = await leerEntero(); if (id === null) return;
        const d = await pedirDatos(); if (d === null) return;
        mostrar(await enviar('PUT', URL + '/' + id, d));
      } else if (op === 5) { io.print('Id a cancelar: '); const id = await leerEntero(); if (id === null) return; mostrar(await enviar('DELETE', URL + '/' + id, null)); }
      else if (op === 6) await pruebaDeCarga(20);
      else if (op === 0) io.println('Hasta luego.');
      else io.println('Opción inválida.');
    } while (op !== 0);
  }

  // ------------------------------------------------------------------
  //  Páginas web (labs 4 y 5): se dibujan dentro del marco de la tarjeta
  // ------------------------------------------------------------------
  const guardarDatos = (clave, datos) => { try { localStorage.setItem(clave, JSON.stringify(datos)); } catch { /* sin almacenamiento */ } };
  const leerDatos = (clave, inicial) => { try { const v = localStorage.getItem(clave); if (v) return JSON.parse(v); } catch { /* sin almacenamiento */ } return inicial(); };
  const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Lab 4 · MVC Estudiantes (Spring Boot + Thymeleaf). Los datos iniciales son los de db/init.sql.
  function appEstudiantes() {
    const CLAVE = 'portafolio-lab4-estudiantes';
    const db = leerDatos(CLAVE, () => ({ seq: 2, estudiantes: [
      { id: 1, cedula: '4-123-456', nombre: 'Ana', apellido: 'González', correo: 'ana.gonzalez@ejemplo.com', carrera: 'Ingeniería de Software' },
      { id: 2, cedula: '4-234-567', nombre: 'Carlos', apellido: 'Rodríguez', correo: 'carlos.rodriguez@ejemplo.com', carrera: 'Ingeniería de Sistemas' }] }));
    const bootstrap = '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">';
    const doc = (titulo, cuerpo) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${h(titulo)}</title>${bootstrap}</head><body class="bg-light">${cuerpo}</body></html>`;

    function lista(buscar) {
      const q = (buscar || '').trim().toLowerCase();
      const filas = db.estudiantes.filter((e) => !q || e.nombre.toLowerCase().includes(q) || e.apellido.toLowerCase().includes(q));
      return doc('Estudiantes', `
<nav class="navbar navbar-dark bg-dark mb-4"><div class="container"><span class="navbar-brand">UNACHI · Ejemplo MVC</span></div></nav>
<div class="container">
  <div class="d-flex justify-content-between align-items-center mb-3">
    <div><h1 class="h3">Estudiantes</h1><p class="text-muted mb-0">CRUD con Spring MVC, Thymeleaf y MariaDB</p></div>
    <a class="btn btn-primary" href="/estudiantes/nuevo">Nuevo estudiante</a>
  </div>
  <form class="row g-2 mb-3" method="get" action="/estudiantes">
    <div class="col-md-9"><input class="form-control" type="text" name="buscar" value="${h(buscar || '')}" placeholder="Buscar por nombre o apellido"></div>
    <div class="col-md-3 d-grid"><button class="btn btn-outline-secondary" type="submit">Buscar</button></div>
  </form>
  <div class="card shadow-sm"><div class="table-responsive"><table class="table table-hover align-middle mb-0">
    <thead class="table-dark"><tr><th>ID</th><th>Cédula</th><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Carrera</th><th style="width: 170px;">Acciones</th></tr></thead>
    <tbody>
    ${filas.map((e) => `<tr><td>${e.id}</td><td>${h(e.cedula)}</td><td>${h(e.nombre)}</td><td>${h(e.apellido)}</td><td>${h(e.correo)}</td><td>${h(e.carrera)}</td>
      <td><a class="btn btn-sm btn-warning" href="/estudiantes/editar/${e.id}">Editar</a>
          <a class="btn btn-sm btn-danger" href="/estudiantes/eliminar/${e.id}" onclick="return confirm('¿Desea eliminar este estudiante?')">Eliminar</a></td></tr>`).join('')}
    ${filas.length ? '' : '<tr><td colspan="7" class="text-center py-4 text-muted">No hay estudiantes registrados.</td></tr>'}
    </tbody></table></div></div>
</div>`);
    }

    function formulario(titulo, e, errores = {}) {
      const campo = (nombre, etiqueta, tipo = 'text') => `<label class="form-label">${etiqueta}</label>
        <input class="form-control" type="${tipo}" name="${nombre}" value="${h(e[nombre])}">
        ${errores[nombre] ? `<div class="text-danger small">${h(errores[nombre])}</div>` : ''}`;
      return doc(titulo, `
<div class="container py-5"><div class="row justify-content-center"><div class="col-lg-8"><div class="card shadow-sm"><div class="card-body p-4">
  <h1 class="h3 mb-4">${h(titulo)}</h1>
  <form action="/estudiantes/guardar" method="post">
    <input type="hidden" name="id" value="${h(e.id ?? '')}">
    <div class="mb-3">${campo('cedula', 'Cédula')}</div>
    <div class="row"><div class="col-md-6 mb-3">${campo('nombre', 'Nombre')}</div><div class="col-md-6 mb-3">${campo('apellido', 'Apellido')}</div></div>
    <div class="mb-3">${campo('correo', 'Correo', 'email')}</div>
    <div class="mb-4">${campo('carrera', 'Carrera')}</div>
    <button class="btn btn-primary" type="submit">Guardar</button>
    <a class="btn btn-secondary" href="/estudiantes">Cancelar</a>
  </form>
</div></div></div></div></div>`);
    }

    const errorServidor = (ruta) => doc('Error', `<div class="container py-4"><h1>Whitelabel Error Page</h1>
      <p>This application has no explicit mapping for /error, so you are seeing this as a fallback.</p>
      <div>${new Date().toString()}</div><div>There was an unexpected error (type=Internal Server Error, status=500).</div></div>`);

    return {
      inicio: '/estudiantes',
      manejar(ruta, metodo, datos) {
        const [camino, query] = ruta.split('?');
        const params = new URLSearchParams(query || '');
        if (camino === '/' || camino === '') return { redirigir: '/estudiantes' };
        if (camino === '/estudiantes' && metodo === 'GET') return { html: lista(params.get('buscar')) };
        if (camino === '/estudiantes/nuevo') return { html: formulario('Nuevo estudiante', {}) };
        let m = /^\/estudiantes\/editar\/(\d+)$/.exec(camino);
        if (m) { const e = db.estudiantes.find((x) => x.id === +m[1]); return e ? { html: formulario('Editar estudiante', e) } : { html: errorServidor(camino), estado: 500 }; }
        m = /^\/estudiantes\/eliminar\/(\d+)$/.exec(camino);
        if (m) { db.estudiantes = db.estudiantes.filter((x) => x.id !== +m[1]); guardarDatos(CLAVE, db); return { redirigir: '/estudiantes' }; }
        if (camino === '/estudiantes/guardar' && metodo === 'POST') {
          const e = { id: datos.id ? +datos.id : null, cedula: datos.cedula || '', nombre: datos.nombre || '', apellido: datos.apellido || '', correo: datos.correo || '', carrera: datos.carrera || '' };
          const errores = {};
          const vacio = (s) => !s || !s.trim();
          if (vacio(e.cedula)) errores.cedula = 'La cédula es obligatoria';
          if (vacio(e.nombre)) errores.nombre = 'El nombre es obligatorio';
          if (vacio(e.apellido)) errores.apellido = 'El apellido es obligatorio';
          if (vacio(e.correo)) errores.correo = 'El correo es obligatorio';
          else if (!/^[^@\s]+@[^@\s]+$/.test(e.correo)) errores.correo = 'Ingrese un correo válido';
          if (vacio(e.carrera)) errores.carrera = 'La carrera es obligatoria';
          if (Object.keys(errores).length) return { html: formulario(e.id == null ? 'Nuevo estudiante' : 'Editar estudiante', e, errores) };
          // la cédula es única en la base de datos: repetirla da error 500, igual que en la aplicación real
          if (db.estudiantes.some((x) => x.cedula === e.cedula && x.id !== e.id)) return { html: errorServidor(camino), estado: 500 };
          if (e.id == null) { e.id = ++db.seq; db.estudiantes.push(e); }
          else { const i = db.estudiantes.findIndex((x) => x.id === e.id); if (i >= 0) db.estudiantes[i] = e; else db.estudiantes.push(e); }
          guardarDatos(CLAVE, db);
          return { redirigir: '/estudiantes' };
        }
        return { html: doc('Error', '<div class="container py-4"><h1>Whitelabel Error Page</h1><div>There was an unexpected error (type=Not Found, status=404).</div></div>'), estado: 404 };
      }
    };
  }

  // Lab 5 · Gestión de Inventario (JSP + Servlets). Usa la hoja de estilos original del proyecto.
  function appInventario() {
    const CLAVE = 'portafolio-lab5-inventario';
    const CTX = '/gestion-inventario';
    const db = leerDatos(CLAVE, () => ({ seqA: 3, articulos: [
      { id: 1, codigoBarra: '750001000001', nombre: 'Arroz 1kg', existencia: 50 },
      { id: 2, codigoBarra: '750001000002', nombre: 'Aceite vegetal 1L', existencia: 30 },
      { id: 3, codigoBarra: '750001000003', nombre: 'Azúcar 1kg', existencia: 0 }] }));
    const css = (window.FUENTES || []).find((f) => f.ruta.endsWith('gestion-inventario-jsp/src/main/webapp/css/style.css'))?.codigo || '';
    const doc = (titulo, cuerpo) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${h(titulo)}</title><style>${css}</style></head><body>${cuerpo}</body></html>`;
    const ordenados = () => [...db.articulos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const alerta = (error) => (error ? `<div class="alerta alerta-error">${h(error)}</div>` : '');
    const volver = `<p class="enlace-volver"><a href="${CTX}/index.jsp">&larr; Volver al menú principal</a></p>`;
    const guardar = () => guardarDatos(CLAVE, db);

    const menu = () => doc('Sistema de Gestión de Inventario', `<div class="contenedor">
  <header class="encabezado encabezado-centrado"><h1>Sistema de Gestión de Inventario</h1><p class="subtitulo">Arquitectura en tres capas — Presentación · Negocio · Datos</p></header>
  <nav class="menu-principal">
    <a class="tarjeta-menu" href="${CTX}/articulos"><h2>Gestión de Artículos</h2><p>Crear, listar, modificar y eliminar artículos del catálogo.</p></a>
    <a class="tarjeta-menu" href="${CTX}/existencias"><h2>Gestión de Existencias</h2><p>Consultar existencias y registrar entradas o salidas de inventario.</p></a>
  </nav></div>`);

    const listarArticulos = (error) => doc('Artículos — Inventario', `<div class="contenedor">
  <header class="encabezado"><h1>Gestión de Artículos</h1><a class="boton boton-primario" href="${CTX}/articulos?accion=nuevo">+ Nuevo artículo</a></header>
  ${alerta(error)}
  <table class="tabla"><thead><tr><th>Código de barra</th><th>Nombre</th><th>Acciones</th></tr></thead><tbody>
  ${ordenados().map((a) => `<tr><td>${h(a.codigoBarra)}</td><td>${h(a.nombre)}</td><td class="acciones">
    <a href="${CTX}/articulos?accion=editar&id=${a.id}">Editar</a>
    <a href="${CTX}/articulos?accion=eliminar&id=${a.id}" class="enlace-peligro" onclick="return confirm('¿Eliminar este artículo?');">Eliminar</a></td></tr>`).join('')}
  ${db.articulos.length ? '' : '<tr><td colspan="3" class="vacio">No hay artículos registrados.</td></tr>'}
  </tbody></table>${volver}</div>`);

    const formularioArticulo = (a, error) => {
      const titulo = a && a.id ? 'Editar artículo' : 'Nuevo artículo';
      return doc(titulo, `<div class="contenedor contenedor-angosto"><h1>${titulo}</h1>${alerta(error)}
  <form method="post" action="${CTX}/articulos" class="formulario">
    ${a && a.id ? `<input type="hidden" name="id" value="${a.id}">` : ''}
    <label for="codigoBarra">Código de barra</label><input type="text" id="codigoBarra" name="codigoBarra" value="${h(a?.codigoBarra)}" required maxlength="50">
    <label for="nombre">Nombre</label><input type="text" id="nombre" name="nombre" value="${h(a?.nombre)}" required maxlength="150">
    <div class="acciones-formulario"><button type="submit" class="boton boton-primario">Guardar</button><a class="boton boton-secundario" href="${CTX}/articulos">Cancelar</a></div>
  </form></div>`);
    };

    const listarExistencias = () => doc('Existencias — Inventario', `<div class="contenedor">
  <header class="encabezado"><h1>Gestión de Existencias</h1><a class="boton boton-primario" href="${CTX}/existencias?accion=movimiento">+ Registrar entrada / salida</a></header>
  <table class="tabla"><thead><tr><th>Código de barra</th><th>Artículo</th><th>Existencia actual</th></tr></thead><tbody>
  ${ordenados().map((a) => `<tr><td>${h(a.codigoBarra)}</td><td>${h(a.nombre)}</td><td class="${a.existencia === 0 ? 'texto-alerta' : ''}">${a.existencia}</td></tr>`).join('')}
  ${db.articulos.length ? '' : '<tr><td colspan="3" class="vacio">No hay existencias registradas.</td></tr>'}
  </tbody></table>${volver}</div>`);

    const formularioMovimiento = (error) => doc('Registrar movimiento de inventario', `<div class="contenedor contenedor-angosto"><h1>Registrar entrada o salida</h1>${alerta(error)}
  <form method="post" action="${CTX}/existencias" class="formulario">
    <label for="articuloId">Artículo</label><select id="articuloId" name="articuloId" required><option value="">-- Seleccione un artículo --</option>
    ${ordenados().map((a) => `<option value="${a.id}">${h(a.nombre)} (${h(a.codigoBarra)})</option>`).join('')}</select>
    <label for="tipo">Tipo de movimiento</label><select id="tipo" name="tipo" required><option value="entrada">Entrada</option><option value="salida">Salida</option></select>
    <label for="cantidad">Cantidad</label><input type="number" id="cantidad" name="cantidad" min="1" required>
    <div class="acciones-formulario"><button type="submit" class="boton boton-primario">Registrar</button><a class="boton boton-secundario" href="${CTX}/existencias">Cancelar</a></div>
  </form></div>`);

    const entero = (s) => (/^[+-]?\d+$/.test(String(s ?? '')) ? parseInt(s, 10) : null);

    return {
      inicio: CTX + '/',
      manejar(ruta, metodo, datos) {
        const [camino, query] = ruta.split('?');
        const p = new URLSearchParams(query || '');
        if (camino === CTX || camino === CTX + '/' || camino === CTX + '/index.jsp') return { html: menu() };
        if (camino === CTX + '/articulos' && metodo === 'POST') {
          const a = { id: datos.id ? +datos.id : null, codigoBarra: datos.codigoBarra, nombre: datos.nombre };
          let error = null;
          if (!a.nombre || !a.nombre.trim()) error = 'El nombre del artículo es obligatorio.';
          else if (!a.codigoBarra || !a.codigoBarra.trim()) error = 'El código de barra es obligatorio.';
          else if (db.articulos.some((x) => x.codigoBarra === a.codigoBarra && x.id !== a.id)) error = 'Ya existe un artículo registrado con ese código de barra.';
          if (error) return { html: formularioArticulo(a, error) };
          if (a.id) { const x = db.articulos.find((y) => y.id === a.id); if (x) { x.codigoBarra = a.codigoBarra; x.nombre = a.nombre; } }
          else db.articulos.push({ id: ++db.seqA, codigoBarra: a.codigoBarra, nombre: a.nombre, existencia: 0 });
          guardar();
          return { redirigir: CTX + '/articulos' };
        }
        if (camino === CTX + '/articulos') {
          const accion = p.get('accion') || 'listar';
          if (accion === 'nuevo') return { html: formularioArticulo(null) };
          if (accion === 'editar') return { html: formularioArticulo(db.articulos.find((x) => x.id === +p.get('id')) || null) };
          if (accion === 'eliminar') {
            const a = db.articulos.find((x) => x.id === +p.get('id'));
            if (a && a.existencia > 0) return { html: listarArticulos(`No se puede eliminar el artículo porque aún tiene existencias registradas (${a.existencia} unidades).`) };
            db.articulos = db.articulos.filter((x) => x.id !== +p.get('id'));
            guardar();
            return { redirigir: CTX + '/articulos' };
          }
          return { html: listarArticulos() };
        }
        if (camino === CTX + '/existencias' && metodo === 'POST') {
          const articuloId = entero(datos.articuloId), cantidad = entero(datos.cantidad);
          if (articuloId == null || cantidad == null) return { html: formularioMovimiento('Debe ingresar valores numéricos válidos.') };
          const tipo = datos.tipo === 'entrada' ? 'entrada' : 'salida';
          if (cantidad <= 0) return { html: formularioMovimiento(`La cantidad de ${tipo} debe ser mayor a cero.`) };
          const a = db.articulos.find((x) => x.id === articuloId);
          if (!a) return { html: formularioMovimiento('El artículo seleccionado no tiene un registro de existencia asociado.') };
          if (tipo === 'salida' && cantidad > a.existencia) return { html: formularioMovimiento(`No hay suficiente existencia. Disponible: ${a.existencia} unidades.`) };
          a.existencia += tipo === 'entrada' ? cantidad : -cantidad;
          guardar();
          return { redirigir: CTX + '/existencias' };
        }
        if (camino === CTX + '/existencias') return { html: p.get('accion') === 'movimiento' ? formularioMovimiento() : listarExistencias() };
        return { html: `<!DOCTYPE html><html><body><h1>HTTP Status 404 – Not Found</h1></body></html>`, estado: 404 };
      }
    };
  }

  const WEB = { 'l4-mvc': { puerto: 8081, crear: appEstudiantes }, 'l5-inventario': { puerto: 8082, crear: appInventario } };

  // ------------------------------------------------------------------
  //  Catálogo (mismos datos que el portal Java)
  // ------------------------------------------------------------------
  const CATALOGO = {
    'l1-main': { tipo: 'programa', clase: 'com.unachi.prog5.Main' },
    'l2-maestro': { tipo: 'programa', clase: 'MaestroEsclavoFacturas' },
    'l2-pipe': { tipo: 'programa', clase: 'PipeFilterLogs' },
    'l2-cuenta': { tipo: 'programa', clase: 'objetos.Main' },
    'l2-taller': { tipo: 'programa', clase: 'Main' },
    'l7-cliente': { tipo: 'programa', clase: 'Cliente', args: ['Samuel Suira'], admiteArgs: true },
    'l7-carga': { tipo: 'programa', clase: 'Carga', args: ['/api/lento?ms=500', '20'], admiteArgs: true },
    'l8-demo': { tipo: 'programa', clase: 'reservas.cliente.ClienteConsola', args: ['demo'] },
    'l8-menu': { tipo: 'programa', clase: 'reservas.cliente.ClienteConsola' },
    'l4-mvc': { tipo: 'servidor', puerto: 8081, url: 'http://localhost:8081/estudiantes', cmd: 'java -jar target/mvc-estudiantes-0.0.1-SNAPSHOT.jar --server.port=8081' },
    'l5-inventario': { tipo: 'servidor', puerto: 8082, url: 'http://localhost:8082/gestion-inventario/', cmd: 'java -cp bootstrap.jar;tomcat-juli.jar org.apache.catalina.startup.Bootstrap start' },
    'l7-servidor': { tipo: 'servidor', puerto: 3000, url: 'http://localhost:3000/api/espacios', clase: 'Servidor', args: ['4'], admiteArgs: true },
    'l8-api': { tipo: 'servidor', puerto: 8080, url: 'http://localhost:8080/api/reservas', clase: 'reservas.servidor.ServidorReservas' }
  };
  const PUERTOS = { 3000: 'l7-servidor', 8080: 'l8-api', 8081: 'l4-mvc', 8082: 'l5-inventario' };

  function estadoJson() {
    const apps = {};
    Object.entries(CATALOGO).forEach(([id, c]) => {
      const e = EJ[id];
      apps[id] = { tipo: c.tipo, corriendo: !!e?.corriendo, listo: !!(e?.corriendo && e.listo), fase: e ? e.fase : null,
        puerto: c.puerto || 0, url: c.url || null, args: c.args || [], codigo: e ? e.codigo : null, inicio: e ? e.inicio : 0 };
    });
    return { mysql: false, apps };
  }

  async function iniciar(id, args) {
    const c = CATALOGO[id];
    if (EJ[id]?.corriendo) return;
    if (c.puerto && Object.values(EJ).some((x) => x.corriendo && x.puerto === c.puerto))
      throw new Error(`El puerto ${c.puerto} ya está ocupado por otro programa.`);
    const efectivos = c.admiteArgs && args.length ? args : (c.args || []);
    const e = nuevaEjecucion(id);
    e.puerto = c.puerto;
    log(e, '$ ' + (c.cmd || `java -cp target/classes ${c.clase}${efectivos.length ? ' ' + efectivos.map(citar).join(' ') : ''}`) + '\n');

    if (c.tipo === 'servidor') {
      // un servidor queda encendido hasta que se apaga
      e.fase = 'ejecutando';
      setTimeout(() => {
        if (e.cancelado) return;
        if (id === 'l7-servidor') e.servicio = servidorReservaFE(efectivos[0], e);
        else if (id === 'l8-api') e.servicio = servidorReservasLab(e);
        else log(e, `Página lista en ${c.url}\n`);
        e.listo = true;
      }, 500 + Math.random() * 500);
      return;
    }

    (async () => {
      try {
        await PROGRAMAS[id](consola(e), efectivos);
        e.codigo = 0;
      } catch (err) {
        if (!e.cancelado) { log(e, (err.message || String(err)) + '\n'); e.codigo = 1; }
      }
      if (e.cancelado) e.codigo = 1;
      log(e, `\n[proceso terminado · código de salida ${e.codigo}]\n`);
      e.corriendo = false;
      e.fase = 'terminado';
    })();
  }

  function detener(id) {
    const e = EJ[id];
    if (!e || !e.corriendo) return;
    e.cancelado = true;
    if (e.esperando) { e.esperando(null); e.esperando = null; }
    log(e, '\n[detenido desde el portafolio]\n');
    if (CATALOGO[id].tipo === 'servidor') {
      e.codigo = 1;
      log(e, `\n[proceso terminado · código de salida 1]\n`);
      e.corriendo = false;
      e.fase = 'terminado';
    }
  }

  function entrada(id, linea) {
    const e = EJ[id];
    if (!e || !e.corriendo) throw new Error('El programa no está en ejecución');
    log(e, linea + '\n');
    if (e.esperando) { const r = e.esperando; e.esperando = null; r(linea); } else e.cola.push(linea);
  }

  // ------------------------------------------------------------------
  //  "fetch" del navegador: atiende las mismas rutas que el portal Java
  // ------------------------------------------------------------------
  function respuesta(status, texto, cabeceras = {}) {
    return { ok: status >= 200 && status < 300, status, statusText: '', headers: { get: (k) => cabeceras[k] ?? null }, text: async () => texto };
  }
  const json = (status, obj) => respuesta(status, JSON.stringify(obj), { 'Content-Type': 'application/json' });

  async function fetchLocal(url, opciones = {}) {
    const metodo = (opciones.method || 'GET').toUpperCase();
    const cuerpo = opciones.body ?? '';
    const [camino, query] = url.replace(/^\.?\//, '').split('?');
    const params = new URLSearchParams(query || '');
    try {
      if (camino === 'api/estado') return json(200, estadoJson());
      if (camino === 'api/fuentes') return json(200, (window.FUENTES || []).map(({ ruta, lineas }) => ({ ruta, lineas })));
      if (camino === 'api/archivo') {
        const f = (window.FUENTES || []).find((x) => x.ruta === params.get('ruta'));
        return f ? respuesta(200, f.codigo) : json(500, { error: 'Archivo no permitido' });
      }
      let m = /^api\/apps\/([\w-]+)\/(\w+)$/.exec(camino);
      if (m) {
        const [, id, accion] = m;
        if (!CATALOGO[id]) return json(404, { error: 'Aplicación desconocida' });
        if (accion === 'log') {
          const e = EJ[id];
          if (!e) return json(200, { texto: '', siguiente: 0 });
          let desde = parseInt(params.get('desde') || '0', 10);
          if (desde > e.texto.length) desde = 0;
          return json(200, { texto: e.texto.slice(desde), siguiente: e.texto.length });
        }
        if (accion === 'iniciar') { await iniciar(id, String(cuerpo).split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5)); return json(200, estadoJson()); }
        if (accion === 'detener') { detener(id); return json(200, estadoJson()); }
        if (accion === 'entrada') { entrada(id, String(cuerpo)); return json(200, { ok: true }); }
        return json(405, { error: 'Acción no válida' });
      }
      m = /^proxy\/(\d+)(\/.*)?$/.exec(camino);
      if (m) {
        const puerto = +m[1];
        const ruta = (m[2] || '/') + (query ? '?' + query : '');
        const cab = {};
        Object.entries(opciones.headers || {}).forEach(([k, v]) => { cab[k] = v; });
        const t0 = ahora();
        try {
          const r = await pedir(puerto, metodo, ruta, cuerpo || null, cab);
          return respuesta(r.status, r.body, { 'X-Tiempo-Ms': String(Math.floor(ahora() - t0)), 'Content-Type': r.tipo || 'application/json; charset=UTF-8' });
        } catch (err) {
          if (!(err instanceof SinConexion)) throw err;
          return json(502, { error: `No se pudo conectar con localhost:${puerto}. ¿Está encendido el servidor?` });
        }
      }
      return json(404, { error: 'Ruta no encontrada' });
    } catch (err) {
      return json(500, { error: err.message || String(err) });
    }
  }

  // ------------------------------------------------------------------
  //  Montar una página web (lab 4 o 5) dentro de un <iframe>
  // ------------------------------------------------------------------
  const apps = {};
  function montarWeb(id, iframe, alCambiar) {
    const def = WEB[id];
    apps[id] ||= def.crear();
    const app = apps[id];
    let actual = app.inicio;
    function ir(ruta, metodo = 'GET', datos = null) {
      const r = app.manejar(ruta, metodo, datos);
      if (r.redirigir) return ir(r.redirigir);
      actual = ruta;
      iframe.srcdoc = r.html;
      alCambiar(`http://localhost:${def.puerto}${ruta}`);
    }
    iframe.addEventListener('load', () => {
      const d = iframe.contentDocument;
      if (!d) return;
      // Los enlaces y formularios de la página se atienden aquí, como lo haría el servidor
      d.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[href]');
        if (!a || ev.defaultPrevented) return;
        const destino = a.getAttribute('href');
        if (!destino.startsWith('/')) return;
        ev.preventDefault();
        ir(destino);
      });
      d.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const f = ev.target;
        const datos = Object.fromEntries(new FormData(f));
        const accion = f.getAttribute('action');
        if ((f.getAttribute('method') || 'get').toLowerCase() === 'get') ir(`${accion}?${new URLSearchParams(datos)}`);
        else ir(accion, 'POST', datos);
      });
    });
    ir(actual);
    return { recargar: () => ir(actual) };
  }

  window.NAVEGADOR = { fetch: fetchLocal, montarWeb };
})();
