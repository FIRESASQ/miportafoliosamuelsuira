// El océano del fondo: un shader WebGL (superficie, cruce de la línea del agua y profundidades)
// El desplazamiento de la página controla la profundidad de la cámara.
(() => {
  const estado = { cam: 1.6, prof: 0, metros: 0, pausado: false, t: 0 };

  // ------------------------------------------------------------------
  //  Profundidad a partir del scroll
  // ------------------------------------------------------------------
  function calcularProfundidad() {
    const h = innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - h);
    const y = scrollY;
    estado.cam = 1.6 - (y / h) * 2.7;                       // > 0: sobre el mar · < 0: bajo el agua
    const inicio = h * 0.59;                                // donde la cámara cruza la superficie
    estado.prof = Math.min(1, Math.max(0, (y - inicio) / Math.max(1, max - inicio)));
    estado.metros = estado.cam > 0 ? 0 : Math.max(1, Math.round(10994 * Math.pow(estado.prof, 2.1)));
  }

  // ------------------------------------------------------------------
  //  Shader del océano
  // ------------------------------------------------------------------
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uCam, uDeep;

const vec3 SOL = vec3(0.32, 0.20, -0.93);

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * ruido(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// Altura del mar: varias ondas direccionales más un poco de ruido
float mar(vec2 p, float t) {
  float h = 0.30 * sin(dot(p, vec2(0.38, 0.92)) * 0.55 + t * 1.10);
  h += 0.22 * sin(dot(p, vec2(-0.70, 0.70)) * 0.80 + t * 1.40);
  h += 0.12 * sin(dot(p, vec2(0.95, -0.30)) * 1.60 + t * 2.10);
  h += 0.07 * sin(dot(p, vec2(-0.20, -0.98)) * 2.70 + t * 2.70);
  h += 0.16 * (ruido(p * 0.6 + vec2(t * 0.25, t * 0.15)) - 0.5);
  return h;
}
vec3 normalMar(vec2 p, float t, float e) {
  float h = mar(p, t);
  return normalize(vec3(h - mar(p + vec2(e, 0.0), t), e, h - mar(p + vec2(0.0, e), t)));
}

vec3 cieloLiso(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.66, 0.88, 0.98), vec3(0.08, 0.40, 0.80), pow(y, 0.5));
  float s = max(dot(rd, normalize(SOL)), 0.0);
  return c + vec3(1.0, 0.86, 0.62) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.30);
}

vec3 cielo(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.66, 0.88, 0.98), vec3(0.08, 0.40, 0.80), pow(y, 0.5));
  float s = max(dot(rd, normalize(SOL)), 0.0);
  c += vec3(1.0, 0.86, 0.62) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.30);
  vec2 cp = rd.xz / max(rd.y, 0.04) * 0.9 + vec2(uTime * 0.015, uTime * 0.004);
  float nube = smoothstep(0.52, 0.85, fbm(cp));
  c = mix(c, vec3(1.0), nube * 0.75 * smoothstep(0.0, 0.2, rd.y));
  return c;
}

// Cáusticas: bordes de celdas de Voronoi que se mueven con el tiempo
float caustica(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.5 + 0.45 * sin(uTime * 0.8 + 6.2831 * hash2(i + g));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return pow(1.0 - smoothstep(0.0, 0.3, d2 - d1), 3.0);
}

vec3 sobreElMar(vec2 uv) {
  float camY = max(uCam, 0.03);
  float acerc = 1.0 - clamp(camY / 1.6, 0.0, 1.0);
  vec3 ro = vec3(0.0, 0.35 + camY * 1.4, -uTime * 1.6);
  vec3 rd = normalize(vec3(uv.x, uv.y - 0.08 - acerc * 0.22, -1.45));
  if (rd.y >= 0.0) return cielo(rd);
  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  vec3 n = normalMar(p.xz, uTime, 0.03 + t * 0.004);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(12.0, 80.0, t)));
  vec3 r = reflect(rd, n); r.y = abs(r.y);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  float h = mar(p.xz, uTime);
  vec3 agua = mix(vec3(0.0, 0.17, 0.28), vec3(0.02, 0.52, 0.60), clamp(h * 0.9 + 0.45, 0.0, 1.0) * 0.65);
  agua += vec3(0.02, 0.30, 0.28) * pow(clamp(dot(n, normalize(SOL)) * 0.5 + 0.5, 0.0, 1.0), 4.0) * 0.5;
  vec3 c = mix(agua, cieloLiso(r), fres);
  c += vec3(1.0, 0.92, 0.75) * pow(max(dot(r, normalize(SOL)), 0.0), 300.0) * 3.0;
  float espuma = smoothstep(0.30, 0.55, h + (ruido(p.xz * 1.6 + uTime * 0.4) - 0.5) * 0.5);
  c = mix(c, vec3(0.93, 0.98, 1.0), espuma * 0.55 * (1.0 - smoothstep(4.0, 40.0, t)));
  c = mix(c, cieloLiso(normalize(vec3(rd.x, 0.02, rd.z))), smoothstep(25.0, 110.0, t));
  return c;
}

vec3 bajoElAgua(vec2 uv) {
  float camY = -max(-uCam, 0.03);
  float d = uDeep;
  vec3 ro = vec3(0.0, camY * 3.0 - d * 6.0, -uTime * 0.5);
  float mira = mix(0.26, -0.02, smoothstep(0.0, 0.3, d));
  vec3 rd = normalize(vec3(uv.x, uv.y + mira, -1.3));

  vec3 claro = vec3(0.03, 0.46, 0.60), medio = vec3(0.01, 0.15, 0.30), abismo = vec3(0.0, 0.012, 0.035);
  vec3 base = mix(claro, medio, smoothstep(0.0, 0.45, d));
  base = mix(base, abismo, smoothstep(0.38, 0.95, d));
  vec3 c = base * (0.45 + 0.75 * smoothstep(-0.7, 0.9, rd.y));
  float luz = 1.0 - smoothstep(0.0, 0.7, d);

  // La superficie vista desde abajo: ventana de Snell, reflexión interna y cáusticas
  if (rd.y > 0.0 && luz > 0.0) {
    float t = -ro.y / rd.y;
    vec3 p = ro + rd * t;
    vec3 n = normalMar(p.xz * 1.2, uTime, 0.06);
    vec3 tr = refract(rd, -n, 1.33);
    vec3 sup = dot(tr, tr) > 0.0 ? cieloLiso(normalize(tr)) * 0.85 : base * 1.4 + vec3(0.0, 0.06, 0.08);
    sup += vec3(0.55, 0.95, 1.0) * caustica(p.xz * 0.7) * 0.28;
    c = mix(c, sup, exp(-t * 0.06) * luz);
  }

  // Rayos de luz que bajan inclinados
  float a = uv.x * 1.25 + uv.y * 0.45;
  float rayos = ruido(vec2(a * 5.0 + uTime * 0.12, uTime * 0.07)) * ruido(vec2(a * 11.0 - uTime * 0.17, 3.0));
  c += vec3(0.45, 0.85, 0.95) * pow(rayos, 1.6) * 1.1 * smoothstep(-0.9, 0.9, uv.y) * luz * 0.5;

  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 c;
  if (uCam > 0.75) {
    c = sobreElMar(uv);
  } else if (uCam < -0.75) {
    c = bajoElAgua(uv);
  } else {
    // La cámara cruza la superficie: línea de agua ondulante sobre el lente
    float linea = 0.022 * sin(uv.x * 4.0 + uTime * 1.6) + 0.012 * sin(uv.x * 9.0 - uTime * 2.3) + 0.006 * sin(uv.x * 21.0 + uTime * 3.4);
    float k = uCam * 0.75 + uv.y * 0.5 - linea;
    vec3 arriba = sobreElMar(uv), abajo = bajoElAgua(uv);
    c = mix(abajo, arriba, smoothstep(-0.008, 0.008, k));
    c += vec3(0.85, 0.97, 1.0) * exp(-abs(k) * 70.0) * 0.55;
    c = mix(c, c * vec3(0.8, 0.95, 1.0), smoothstep(0.0, -0.05, k) * 0.3);
  }
  c *= 1.0 - 0.32 * dot(uv * 0.75, uv * 0.75);
  gl_FragColor = vec4(c, 1.0);
}`;

  const lienzo = document.getElementById('oceano');
  const gl = lienzo.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  let prog = null, u = {};
  let escala = innerWidth > 1400 ? 0.42 : 0.55; // resolución interna; se ajusta según el rendimiento

  function compilar(tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  if (gl) {
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uTime', 'uCam', 'uDeep'].forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    } catch (err) {
      console.warn('Océano sin WebGL:', err);
      prog = null;
    }
  }
  if (!prog) document.body.classList.add('sin-webgl');

  function ajustar() {
    if (!prog) return;
    lienzo.width = Math.round(innerWidth * escala);
    lienzo.height = Math.round(innerHeight * escala);
    gl.viewport(0, 0, lienzo.width, lienzo.height);
  }
  addEventListener('resize', ajustar);
  ajustar();

  // ------------------------------------------------------------------
  //  Bucle principal
  // ------------------------------------------------------------------
  let ultimo = performance.now(), promedio = 16, cuadros = 0;
  function cuadro(ahora) {
    const dt = Math.min(50, ahora - ultimo);
    ultimo = ahora;
    calcularProfundidad();
    if (!estado.pausado) estado.t += dt * 0.001;

    if (prog) {
      gl.uniform2f(u.uRes, lienzo.width, lienzo.height);
      gl.uniform1f(u.uTime, estado.t);
      gl.uniform1f(u.uCam, estado.cam);
      gl.uniform1f(u.uDeep, estado.prof);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Resolución adaptable: si el equipo va lento, el shader usa menos píxeles
    promedio = promedio * 0.95 + dt * 0.05;
    if (++cuadros % 45 === 0 && prog) {
      if (promedio > 19 && escala > 0.25) { escala = Math.max(0.25, escala * 0.82); ajustar(); }
      else if (promedio < 14 && escala < 0.6) { escala = Math.min(0.6, escala * 1.06); ajustar(); }
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  window.OCEANO = {
    estado,
    pausar() { estado.pausado = !estado.pausado; return estado.pausado; }
  };
})();
