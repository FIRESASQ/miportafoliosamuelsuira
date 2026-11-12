// Contenido del portafolio. Los "id" coinciden con el catálogo de portal/Portal.java.
// Las explicaciones están escritas para que las entienda alguien que no programa.

window.PORTAFOLIO = {
  // Programas con página web propia o que responden a otros programas
  apps: {
    'l4-mvc': {
      lab: 4, tipo: 'Página web', titulo: 'Registro de estudiantes',
      queHace: 'Una página para llevar la lista de estudiantes de una universidad. Puedes agregar estudiantes, buscarlos por nombre, cambiar sus datos o borrarlos. Todo queda guardado en una base de datos, así que no se pierde al cerrar la página.',
      como: 'Enciéndela y agrega un estudiante nuevo con el botón "Nuevo estudiante".',
      vista: 'iframe',
      fuente: 'laboratorio4/mvc-estudiantes/src/main/java/pa/ac/unachi/mvcestudiantes/controller/EstudianteController.java'
    },
    'l5-inventario': {
      lab: 5, tipo: 'Página web', titulo: 'Inventario de productos',
      queHace: 'Una página para controlar los productos de una tienda: cuántas unidades hay de cada uno, cuándo entran y cuándo salen. No deja sacar más unidades de las que existen.',
      como: 'Enciéndela e intenta sacar más unidades de las que hay: la página no lo permite y te avisa.',
      vista: 'iframe',
      fuente: 'laboratorio5/gestion-inventario-jsp/src/main/java/com/unachi/inventario/negocio/ExistenciaService.java'
    },
    'l7-servidor': {
      lab: 7, tipo: 'Servicio', titulo: 'Reservas de salones',
      queHace: 'Un programa que recibe pedidos para reservar salones de computadoras y el auditorio. Atiende a muchas personas al mismo tiempo y no deja que dos reserven el mismo salón a la misma hora.',
      como: 'Pulsa "Reservar" dos veces: la primera vez la reserva se acepta y la segunda se rechaza porque el salón ya está ocupado.',
      vista: 'api',
      opciones: { etiqueta: 'Cómo atiende los pedidos', valores: [['4', 'Con 4 trabajadores'], ['virtual', 'Con trabajadores ilimitados']] },
      fuente: 'laboratorio7/prototipo-java21/src/main/java/Servidor.java',
      peticiones: [
        { m: 'GET', p: '/api/espacios', t: 'Ver salones' },
        { m: 'GET', p: '/api/reservas', t: 'Ver reservas' },
        { m: 'POST', p: '/api/reservas', t: 'Reservar', b: '{"espacioId":1,"fecha":"2026-11-20","hora":"07:00","solicitante":"Samuel Suira"}' },
        { m: 'GET', p: '/api/lento?ms=500', t: 'Pedido que tarda' },
        { m: 'GET', p: '/api/estado', t: 'Pedidos atendidos', g: 5 }
      ]
    },
    'l8-api': {
      lab: 8, tipo: 'Servicio', titulo: 'Reservas de laboratorios',
      queHace: 'Un programa que guarda las reservas de los laboratorios de la universidad. Permite ver, crear, cambiar y cancelar reservas. Para hacer cambios pide una clave, y avisa cuando falta información o cuando dos reservas chocan de horario.',
      como: 'Quita la marca de "Enviar la clave" y prueba a crear una reserva: el programa la rechaza.',
      vista: 'api', apiKey: 'unachi-prog5',
      fuente: 'laboratorio8/ReservasLabAPI/src/reservas/servidor/ReservasHandler.java',
      peticiones: [
        { m: 'GET', p: '/api/reservas', t: 'Ver todas' },
        { m: 'GET', p: '/api/reservas/1', t: 'Ver la número 1' },
        { m: 'POST', p: '/api/reservas', t: 'Crear', b: '{"laboratorio":"LAB-3","solicitante":"Samuel Suira","fecha":"2026-11-24","horaInicio":"08:00","horaFin":"10:00"}' },
        { m: 'PUT', p: '/api/reservas/2', t: 'Cambiar la número 2', b: '{"laboratorio":"LAB-2","solicitante":"Grupo PROG V","fecha":"2026-11-22","horaInicio":"10:30","horaFin":"12:00"}' },
        { m: 'DELETE', p: '/api/reservas/3', t: 'Cancelar la número 3' },
        { m: 'POST', p: '/api/reservas', t: 'Crear una que choca', b: '{"laboratorio":"LAB-1","solicitante":"Luis Gómez","fecha":"2026-10-22","horaInicio":"08:00","horaFin":"09:00"}' }
      ]
    }
  },

  // Programas que muestran su resultado como texto
  programas: {
    'l1-main': { lab: 1, titulo: 'Mi primer proyecto', desc: 'Un programa pequeño organizado en tres partes: una guarda los datos de un estudiante, otra decide qué hacer y otra los muestra en pantalla.', fuente: 'laboratorio1/prog5-base/src/main/java/com/unachi/prog5/Main.java' },
    'l2-maestro': { lab: 2, titulo: 'Facturas en paralelo', desc: 'Divide 20 facturas en 4 grupos y las calcula al mismo tiempo, como si cuatro personas trabajaran a la vez. Al final suma el total con impuesto.', fuente: 'laboratorio2/lab2-patrones/src/main/java/MaestroEsclavoFacturas.java' },
    'l2-pipe': { lab: 2, titulo: 'Revisión de errores', desc: 'Lee el registro de lo que pasó en un sistema, se queda solo con los errores y cuenta cuántas veces se repitió cada tipo, paso a paso como en una cadena de producción.', fuente: 'laboratorio2/lab2-patrones/src/main/java/PipeFilterLogs.java' },
    'l2-cuenta': { lab: 2, titulo: 'Cuenta bancaria', desc: 'Una cuenta de banco sencilla: tiene un dueño y permite depositar y retirar dinero.', fuente: 'laboratorio2/lab2-cuenta-bancaria/src/objetos/CuentaBancaria.java' },
    'l2-taller': { lab: 2, titulo: 'Pago de empleados', desc: 'Calcula el pago del mes de un gerente, unos vendedores y un operario. Cada tipo de empleado cobra de forma distinta.', fuente: 'laboratorio2/lab2-taller-poo/codigo_completo/Main.java' },
    'l7-cliente': { lab: 7, titulo: 'Pedir una reserva', desc: 'Pregunta qué salones hay y reserva uno a tu nombre. Si lo ejecutas dos veces, la segunda vez el salón ya está ocupado.', fuente: 'laboratorio7/prototipo-java21/src/main/java/Cliente.java', requiere: 'l7-servidor', argsTxt: ['Tu nombre'] },
    'l7-carga': { lab: 7, titulo: 'Prueba de muchos pedidos', desc: 'Envía muchos pedidos al mismo tiempo y mide cuánto tarda en responderlos todos.', fuente: 'laboratorio7/prototipo-java21/src/main/java/Carga.java', requiere: 'l7-servidor', argsTxt: ['Pedido', 'Cantidad'] },
    'l8-demo': { lab: 8, titulo: 'Recorrido completo', desc: 'Prueba todo lo que sabe hacer el programa de reservas: ver, crear, cambiar y cancelar reservas, los avisos de error y cuánto tarda en responder.', fuente: 'laboratorio8/ReservasLabAPI/src/reservas/cliente/ClienteConsola.java', requiere: 'l8-api' },
    'l8-menu': { lab: 8, titulo: 'Menú de reservas', desc: 'Un menú en el que tú eliges qué hacer con las reservas. Escribe el número de la opción en la ventana de texto.', fuente: 'laboratorio8/ReservasLabAPI/src/reservas/cliente/ClienteConsola.java', requiere: 'l8-api', interactivo: true }
  },

  // Nombres cortos para los filtros de "Códigos fuente" (solo los laboratorios que tienen código)
  labs: {
    1: 'Lab 1 · Preparación del entorno de desarrollo',
    2: 'Lab 2 · Patrones Maestro-Esclavo y Pipe-Filter',
    4: 'Lab 4 · Selección de un patrón arquitectónico',
    5: 'Lab 5 · Escenario y requerimientos (capas)',
    7: 'Lab 7 · Escenario cliente-servidor ReservaFE',
    8: 'Lab 8 · Requisitos cliente-servidor'
  },

  // Las diapositivas de "Aplicaciones": una por laboratorio, en orden
  laboratorios: [
    {
      n: 1, nombre: 'Preparación del entorno de desarrollo',
      explicacion: 'Este laboratorio enseña a instalar y preparar las herramientas que se usan para programar. Al final se crea un primer programa ordenado en tres partes: una guarda los datos, otra decide qué hacer y otra muestra el resultado en pantalla.',
      programas: ['l1-main']
    },
    {
      n: 2, nombre: 'Modelado de patrones Maestro-Esclavo y Pipe-Filter',
      explicacion: 'Este laboratorio muestra dos maneras de repartir el trabajo dentro de un programa. En la primera, una parte principal divide una tarea grande entre varios ayudantes que trabajan a la vez. En la segunda, la información pasa por una serie de pasos, como en una cadena de producción. También incluye ejercicios con piezas que se parecen a cosas reales, como una cuenta de banco o un empleado.',
      programas: ['l2-maestro', 'l2-pipe', 'l2-cuenta', 'l2-taller']
    },
    {
      n: 3, nombre: 'Investigación aplicada de patrones de comunicación',
      explicacion: 'Este laboratorio es una investigación en equipo sobre las formas en que los programas de un sistema se comunican entre sí. Se elige una empresa real y se explica cómo lo hace. En este caso, Netflix: sus programas se avisan lo que está pasando (por ejemplo, que alguien empezó a ver una serie) sin tener que hablar directamente unos con otros.',
      pdf: {
        archivo: 'docs/lab3-patrones-de-comunicacion.pdf', titulo: 'Informe: la comunicación entre programas en Netflix', paginas: 13,
        portada: { titulo: 'Laboratorio N.º 3', subtitulo: 'Investigación aplicada de patrones de comunicación', datos: ['Programación V', 'Cristian Valdés · Samuel Suira · Dereck Martínez', 'David, Chiriquí'] },
        explicacion: 'El informe del laboratorio: cómo funciona este tipo de comunicación, cómo la usa Netflix, un dibujo de sus partes y las conclusiones.'
      }
    },
    {
      n: 4, nombre: 'Selección de un patrón arquitectónico para un caso dado',
      explicacion: 'Este laboratorio enseña a escoger la mejor manera de organizar una aplicación según el problema que resuelve. Como ejemplo práctico trae una página web que lleva la lista de estudiantes de una universidad, dividida en tres partes: la que guarda los datos, la que muestra la pantalla y la que conecta a las dos.',
      apps: ['l4-mvc']
    },
    {
      n: 5, nombre: 'Definición del escenario y los requerimientos — Patrón de capas',
      explicacion: 'Este laboratorio parte del problema de una tienda que llevaba su inventario en hojas de cálculo y define qué necesita. La solución es una página web que controla cuántas unidades hay de cada producto, organizada en capas, donde cada capa tiene una sola tarea. No deja sacar más unidades de las que existen.',
      apps: ['l5-inventario']
    },
    {
      n: 6, nombre: 'Especificación de requisitos de software',
      explicacion: 'Antes de construir un programa hay que escribir qué debe hacer y qué tan bien debe hacerlo. Este laboratorio enseña a hacerlo con un documento de requisitos, aplicado al inventario del laboratorio 5: qué funciones debe tener, qué tan rápido debe responder y cómo debe proteger la información.',
      pdf: {
        archivo: 'docs/lab6-requisitos-del-inventario.pdf', titulo: 'Documento de requisitos del inventario', paginas: 4,
        portada: { titulo: 'Especificación de Requisitos de Software', subtitulo: 'Sistema de Gestión de Inventario', datos: ['Laboratorio 6 · Programación V', 'Samuel Suira', 'David, Chiriquí · 2026'] },
        explicacion: 'La lista de lo que debe hacer el sistema de inventario, las metas de rapidez y seguridad que debe cumplir y las herramientas elegidas para construirlo.'
      }
    },
    {
      n: 7, nombre: 'Escenario cliente-servidor ReservaFE',
      explicacion: 'Este laboratorio muestra programas que se comunican por internet: uno guarda las reservas de los salones y los otros se las piden. También mide qué pasa cuando llegan muchos pedidos al mismo tiempo.',
      apps: ['l7-servidor'], programas: ['l7-cliente', 'l7-carga']
    },
    {
      n: 8, nombre: 'Requisitos del software para la arquitectura cliente-servidor',
      explicacion: 'Este laboratorio define las reglas de un programa que guarda las reservas de los laboratorios de la universidad y que otros programas pueden usar: qué pedidos acepta, cuándo los rechaza y qué tan rápido debe responder. Incluye el programa ya funcionando para comprobar esas reglas.',
      apps: ['l8-api'], programas: ['l8-demo', 'l8-menu']
    }
  ]
};
