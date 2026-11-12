// Salidas reales grabadas al ejecutar cada laboratorio (se muestran en la versión estática).
window.GRABACIONES = {
 "programas": {
  "l1-main": "Hola Programacion V\nModelo: Student{id='2026-001', name='Nombre Apellido'}\n",
  "l2-maestro": "[Maestro] Repartiendo 20 facturas en 4 sublotes...\n  [Esclavo 4] procesó 5 facturas -> subtotal: 911.50, ITBMS: 63.81\n  [Esclavo 2] procesó 5 facturas -> subtotal: 544.00, ITBMS: 38.08\n  [Esclavo 1] procesó 5 facturas -> subtotal: 360.25, ITBMS: 25.22\n  [Esclavo 3] procesó 5 facturas -> subtotal: 727.75, ITBMS: 50.94\n\n===== REPORTE CONSOLIDADO DE FACTURACIÓN =====\nFacturas procesadas : 20\nSubtotal            : 2543.50\nTotal ITBMS (7%)    : 178.05\nTOTAL CON IMPUESTO   : 2721.55\n",
  "l2-pipe": "[Filtro 1 - Filtrado de errores] 9 líneas -> 6 relevantes (ERROR/WARN)\n[Filtro 2 - Agregación por tipo] 3 tipos de error distintos encontrados\n[Filtro 3 - Generación de reporte] reporte final construido\n\n===== REPORTE DE INCIDENCIAS =====\n- ConexionBD           : 2 ocurrencia(s)\n- Timeout              : 2 ocurrencia(s)\n- Autenticacion        : 2 ocurrencia(s)\n\n",
  "l2-cuenta": "10.0\n10.0\nEl estado es 1\nEnrique100.0\nOperacion de Deposito Exitosa\n",
  "l2-taller": "===== REPORTE DE NÓMINA =====\nTipo       | Nombre       | Cédula     | Salario final\n---------------------------------------------------------------\nGerente    | Ana Pérez    | 8-123-456  | $1600.00\nVendedor   | Luis Gómez   | 4-789-012  | $1050.00\nVendedor   | Carla Ruiz   | 1-456-789  | $1400.00\nOperario   | José Ríos    | 9-321-654  | $745.00\n---------------------------------------------------------------\nTOTAL A PAGAR ESTE MES: $4795.00\n\n===== VENDEDORES CON COMISIÓN DESTACADA (> $500) =====\nCarla Ruiz generó una comisión de $600.00\n",
  "l7-cliente": "Espacios disponibles: [{\"id\":1,\"nombre\":\"Laboratorio de Cómputo 1\",\"capacidad\":30},{\"id\":2,\"nombre\":\"Laboratorio de Cómputo 2\",\"capacidad\":25},{\"id\":3,\"nombre\":\"Auditorio\",\"capacidad\":120}]\nRespuesta del servidor: 201 {\"id\":1,\"espacioId\":1,\"fecha\":\"2026-10-20\",\"hora\":\"07:00\",\"solicitante\":\"Samuel Suira\"}\n",
  "l7-carga": "Enviando 20 solicitudes simultáneas a /api/lento?ms=500 ...\nTiempo total:            2616 ms\nRespuesta más rápida:    605 ms\nRespuesta más lenta:     2585 ms\nPromedio por solicitud:  1587 ms\nCódigos de estado:       {200=20}\n",
  "l8-demo": "\n>>> 1) Listar reservas iniciales\n  <- HTTP 200 (180 ms)\n  [{\"id\":1,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Prof. Flores\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"07:00\",\"horaFin\":\"08:35\",\"estado\":\"ACTIVA\"},\n   {\"id\":2,\"laboratorio\":\"LAB-2\",\"solicitante\":\"Grupo PROG V\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"09:00\",\"horaFin\":\"10:30\",\"estado\":\"ACTIVA\"},\n   {\"id\":3,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Club de Robótica\",\"fecha\":\"2026-10-23\",\"horaInicio\":\"14:00\",\"horaFin\":\"16:00\",\"estado\":\"ACTIVA\"}]\n\n>>> 2) Crear reserva válida (201 Created)\n  <- HTTP 201 (6 ms)\n  {\"id\":4,\"laboratorio\":\"LAB-3\",\"solicitante\":\"Ana Pérez\",\"fecha\":\"2026-10-24\",\"horaInicio\":\"08:00\",\"horaFin\":\"10:00\",\"estado\":\"ACTIVA\"}\n\n>>> 3) Crear reserva que choca con #1 (409 Conflict)\n  <- HTTP 409 (12 ms)\n  {\"error\":409,\"mensaje\":\"Choque de horario con la reserva #1 (07:00-08:35)\"}\n\n>>> 4) Crear reserva con datos incompletos (400 Bad Request)\n  <- HTTP 400 (4 ms)\n  {\"error\":400,\"mensaje\":\"Campos obligatorios: laboratorio, solicitante, fecha, horaInicio, horaFin\"}\n\n>>> 5) Consultar reserva inexistente (404 Not Found)\n  <- HTTP 404 (4 ms)\n  {\"error\":404,\"mensaje\":\"No existe la reserva con id 99\"}\n\n>>> 6) Modificar reserva #2 (200 OK)\n  <- HTTP 200 (3 ms)\n  {\"id\":2,\"laboratorio\":\"LAB-2\",\"solicitante\":\"Grupo PROG V\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"10:30\",\"horaFin\":\"12:00\",\"estado\":\"ACTIVA\"}\n\n>>> 7) Cancelar reserva #3 (204 No Content)\n  <- HTTP 204 (3 ms)\n\n>>> 8) Escribir sin API key (401 Unauthorized) - RNF-01 Seguridad\n  <- HTTP 401 (0 ms)\n  {\"error\":401,\"mensaje\":\"Falta o es inválido el encabezado X-API-KEY\"}\n\n>>> 9) Prueba de carga - RNF-02 Rendimiento / RNF-04 Concurrencia\nEnviando 20 solicitudes GET en paralelo...\nExitosas: 20/20 | promedio: 9 ms | máximo: 19 ms | total: 23 ms\nCUMPLE RNF-02 (tiempo de respuesta <= 500 ms)\n",
  "l8-menu": "\n===== CLIENTE RESERVAS DE LABORATORIO =====\n1. Listar reservas            (GET)\n2. Consultar reserva por id   (GET)\n3. Crear reserva              (POST)\n4. Modificar reserva          (PUT)\n5. Cancelar reserva           (DELETE)\n6. Prueba de carga RNF (20 solicitudes simultáneas)\n0. Salir\nOpción:   <- HTTP 200 (71 ms)\n  [{\"id\":1,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Prof. Flores\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"07:00\",\"horaFin\":\"08:35\",\"estado\":\"ACTIVA\"},\n   {\"id\":2,\"laboratorio\":\"LAB-2\",\"solicitante\":\"Grupo PROG V\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"10:30\",\"horaFin\":\"12:00\",\"estado\":\"ACTIVA\"},\n   {\"id\":4,\"laboratorio\":\"LAB-3\",\"solicitante\":\"Ana Pérez\",\"fecha\":\"2026-10-24\",\"horaInicio\":\"08:00\",\"horaFin\":\"10:00\",\"estado\":\"ACTIVA\"}]\n\n===== CLIENTE RESERVAS DE LABORATORIO =====\n1. Listar reservas            (GET)\n2. Consultar reserva por id   (GET)\n3. Crear reserva              (POST)\n4. Modificar reserva          (PUT)\n5. Cancelar reserva           (DELETE)\n6. Prueba de carga RNF (20 solicitudes simultáneas)\n0. Salir\nOpción: Hasta luego.\n"
 },
 "api": {
  "l7-servidor": [
   {
    "status": 200,
    "ms": 250,
    "cuerpo": "[{\"id\":1,\"nombre\":\"Laboratorio de Cómputo 1\",\"capacidad\":30},{\"id\":2,\"nombre\":\"Laboratorio de Cómputo 2\",\"capacidad\":25},{\"id\":3,\"nombre\":\"Auditorio\",\"capacidad\":120}]"
   },
   {
    "status": 200,
    "ms": 9,
    "cuerpo": "[]"
   },
   {
    "status": 201,
    "ms": 10,
    "cuerpo": "{\"id\":1,\"espacioId\":1,\"fecha\":\"2026-11-20\",\"hora\":\"07:00\",\"solicitante\":\"Samuel Suira\"}"
   },
   {
    "status": 200,
    "ms": 507,
    "cuerpo": "{\"tipo\":\"espera (E/S)\",\"ms\":500}"
   },
   {
    "status": 200,
    "ms": 288,
    "cuerpo": "{\"tipo\":\"cálculo (CPU)\",\"ms\":300}"
   },
   {
    "status": 200,
    "ms": 4,
    "cuerpo": "{\"estado\":\"ok\",\"solicitudesAtendidas\":6}"
   }
  ],
  "l8-api": [
   {
    "status": 200,
    "ms": 93,
    "cuerpo": "[{\"id\":1,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Prof. Flores\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"07:00\",\"horaFin\":\"08:35\",\"estado\":\"ACTIVA\"},{\"id\":2,\"laboratorio\":\"LAB-2\",\"solicitante\":\"Grupo PROG V\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"09:00\",\"horaFin\":\"10:30\",\"estado\":\"ACTIVA\"},{\"id\":3,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Club de Robótica\",\"fecha\":\"2026-10-23\",\"horaInicio\":\"14:00\",\"horaFin\":\"16:00\",\"estado\":\"ACTIVA\"}]"
   },
   {
    "status": 200,
    "ms": 9,
    "cuerpo": "{\"id\":1,\"laboratorio\":\"LAB-1\",\"solicitante\":\"Prof. Flores\",\"fecha\":\"2026-10-22\",\"horaInicio\":\"07:00\",\"horaFin\":\"08:35\",\"estado\":\"ACTIVA\"}"
   },
   {
    "status": 201,
    "ms": 5,
    "cuerpo": "{\"id\":4,\"laboratorio\":\"LAB-3\",\"solicitante\":\"Samuel Suira\",\"fecha\":\"2026-11-24\",\"horaInicio\":\"08:00\",\"horaFin\":\"10:00\",\"estado\":\"ACTIVA\"}"
   },
   {
    "status": 200,
    "ms": 4,
    "cuerpo": "{\"id\":2,\"laboratorio\":\"LAB-2\",\"solicitante\":\"Grupo PROG V\",\"fecha\":\"2026-11-22\",\"horaInicio\":\"10:30\",\"horaFin\":\"12:00\",\"estado\":\"ACTIVA\"}"
   },
   {
    "status": 204,
    "ms": 4,
    "cuerpo": ""
   },
   {
    "status": 409,
    "ms": 9,
    "cuerpo": "{\"error\":409,\"mensaje\":\"Choque de horario con la reserva #1 (07:00-08:35)\"}"
   }
  ]
 }
};
