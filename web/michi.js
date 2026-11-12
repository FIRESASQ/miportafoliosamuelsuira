// Los michis bailando del final. Cada video trae fondo, y en cada cuadro se vuelve transparente:
//  - "blanco": el michi dibujado tiene fondo blanco. Se borra solo el blanco que toca el borde
//    (como un balde de pintura desde afuera), así el blanco de su pancita, dentro del contorno, se conserva.
//  - "verde": el gatito real tiene pantalla verde. Se borra el verde, se quita el reflejo verde del
//    pelaje y un óvalo suave desvanece los restos del cuarto (la cobija y el cojín).
(() => {
  const STICKERS = [
    { lienzo: 'michi', video: 'img/michi.mp4', modo: 'blanco' },
    { lienzo: 'michi2', video: 'img/michi2.mp4', modo: 'verde', lado: 256 }
  ];

  function blanco(d, ancho, alto, s) {
    const esFondo = (i) => d[i] > 222 && d[i + 1] > 222 && d[i + 2] > 222;
    s.visitado.fill(0);
    let fin = 0;
    const sembrar = (p) => { if (!s.visitado[p] && esFondo(p * 4)) { s.visitado[p] = 1; s.cola[fin++] = p; } };
    for (let x = 0; x < ancho; x++) { sembrar(x); sembrar((alto - 1) * ancho + x); }
    for (let y = 0; y < alto; y++) { sembrar(y * ancho); sembrar(y * ancho + ancho - 1); }
    for (let k = 0; k < fin; k++) {
      const p = s.cola[k];
      d[p * 4 + 3] = 0;
      const x = p % ancho;
      if (x > 0) sembrar(p - 1);
      if (x < ancho - 1) sembrar(p + 1);
      if (p >= ancho) sembrar(p - ancho);
      if (p < (alto - 1) * ancho) sembrar(p + ancho);
    }
    // Borde suave: los píxeles claros que tocan el fondo borrado quedan semitransparentes
    for (let k = 0; k < fin; k++) {
      const p = s.cola[k], x = p % ancho;
      for (const q of [x > 0 ? p - 1 : -1, x < ancho - 1 ? p + 1 : -1, p - ancho, p + ancho]) {
        if (q < 0 || q >= ancho * alto || s.visitado[q]) continue;
        const i = q * 4, claro = Math.min(d[i], d[i + 1], d[i + 2]);
        if (claro > 150) d[i + 3] = Math.min(d[i + 3], Math.round(255 * (255 - claro) / 105));
      }
    }
  }

  function verde(d, ancho, alto, s) {
    if (!s.ovalo) {
      // Óvalo alrededor del gatito (calculado una vez): 1 adentro, 0 afuera, con borde difuminado
      s.ovalo = new Float32Array(ancho * alto);
      for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
        const dx = (x / ancho - 0.47) / 0.31, dy = (y / alto - 0.54) / 0.47;
        const r = Math.sqrt(dx * dx + dy * dy);
        const abajo = 1 - Math.min(1, Math.max(0, (y / alto - 0.8) / 0.16));
        s.ovalo[y * ancho + x] = Math.min(1, Math.max(0, (1.08 - r) / 0.22)) * abajo;
      }
    }
    for (let p = 0, i = 0; p < ancho * alto; p++, i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const exceso = g - Math.max(r, b);            // cuánto "más verde" que los otros colores
      let a = exceso > 70 ? 0 : exceso > 25 ? (70 - exceso) / 45 : 1;
      if (exceso > 0) d[i + 1] = Math.max(r, b);     // quita el reflejo verde del pelaje
      d[i + 3] = Math.round(255 * a * s.ovalo[p]);
    }
  }

  STICKERS.forEach((s) => {
    const lienzo = document.getElementById(s.lienzo);
    if (!lienzo) return;
    const cx = lienzo.getContext('2d', { willReadFrequently: true });
    const video = document.createElement('video');
    Object.assign(video, { src: s.video, muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    video.setAttribute('muted', '');
    let ancho = 0, alto = 0, visible = false;

    video.addEventListener('loadeddata', () => {
      // el video grande se procesa a menor tamaño: se ve igual y cuesta mucho menos
      ancho = lienzo.width = s.lado || video.videoWidth;
      alto = lienzo.height = s.lado || video.videoHeight;
      s.visitado = new Uint8Array(ancho * alto);
      s.cola = new Int32Array(ancho * alto);
    });

    function dibujar() {
      if (visible && ancho && video.readyState >= 2) {
        cx.drawImage(video, 0, 0, ancho, alto);
        const img = cx.getImageData(0, 0, ancho, alto);
        (s.modo === 'verde' ? verde : blanco)(img.data, ancho, alto, s);
        cx.putImageData(img, 0, 0);
      }
      if (!visible) return;
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(dibujar);
      else requestAnimationFrame(dibujar);
    }

    // Solo bailan (y gastan procesador) cuando están en pantalla
    new IntersectionObserver(([e]) => {
      const antes = visible;
      visible = e.isIntersecting;
      if (visible) { video.play().catch(() => {}); if (!antes) dibujar(); } else video.pause();
    }, { rootMargin: '200px' }).observe(lienzo);
  });
})();
