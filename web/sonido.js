// Sonido del océano, generado en el navegador (sin archivos de audio):
// olas, música suave y, bajo el agua, todo se escucha opaco. La profundidad sale de oceano.js.
// Los navegadores no permiten sonar sin un clic, por eso se activa con el botón "Sonido".
(() => {
  const boton = document.getElementById('sonido');
  if (!boton || !window.AudioContext) { if (boton) boton.hidden = true; return; }

  let ac = null, maestro, filtroAgua, olasGain, musicaGain, eco;
  let activo = false, bajoAgua = false;

  // ------------------------------------------------------------------
  //  Construcción de los sonidos
  // ------------------------------------------------------------------
  function ruido(segundos) {
    const b = ac.createBuffer(2, ac.sampleRate * segundos, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let ultimo = 0;
      for (let i = 0; i < d.length; i++) { // ruido "café": más grave y suave que el ruido blanco
        ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = ultimo * 3.5;
      }
    }
    return b;
  }

  function reverberacion(segundos) {
    const b = ac.createBuffer(2, ac.sampleRate * segundos, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    }
    const r = ac.createConvolver();
    r.buffer = b;
    return r;
  }

  function crear() {
    ac = new AudioContext();
    maestro = ac.createGain();
    maestro.gain.value = 0;
    filtroAgua = ac.createBiquadFilter();       // el filtro que hace que bajo el agua suene opaco
    filtroAgua.type = 'lowpass';
    filtroAgua.frequency.value = 16000;
    filtroAgua.Q.value = 0.8;
    filtroAgua.connect(maestro).connect(ac.destination);

    // Olas: dos capas de ruido filtrado, una por lado, que suben y bajan lentamente
    olasGain = ac.createGain();
    olasGain.gain.value = 0.24;
    olasGain.connect(filtroAgua);
    const base = ruido(4);
    [-0.6, 0.6].forEach((lado, k) => {
      const src = ac.createBufferSource();
      src.buffer = base; src.loop = true;
      src.playbackRate.value = 0.9 + k * 0.17;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      const g = ac.createGain();
      g.gain.value = 0.2;
      const pan = ac.createStereoPanner();
      pan.pan.value = lado;
      src.connect(f).connect(g).connect(pan).connect(olasGain);
      src.start();
      const ola = () => {
        if (!ac) return;
        const t = ac.currentTime, dur = 5 + Math.random() * 4;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.55 + Math.random() * 0.35, t, dur * 0.25);   // la ola llega
        g.gain.setTargetAtTime(0.12, t + dur * 0.45, dur * 0.3);              // y se retira
        f.frequency.setTargetAtTime(1300, t, dur * 0.25);
        f.frequency.setTargetAtTime(600, t + dur * 0.45, dur * 0.3);
        setTimeout(ola, dur * 1000);
      };
      setTimeout(ola, k * 2600);
    });

    // Música: acordes largos y suaves con notas sueltas tipo campanita
    eco = reverberacion(4);
    musicaGain = ac.createGain();
    musicaGain.gain.value = 0.16;
    const seco = ac.createGain(); seco.gain.value = 0.55;
    const humedo = ac.createGain(); humedo.gain.value = 0.7;
    musicaGain.connect(seco).connect(filtroAgua);
    musicaGain.connect(eco).connect(humedo).connect(filtroAgua);
    tocarAcordes();
    campanitas();
  }

  const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // Do maj7 · La m7 · Fa maj7 · Sol 6 (en notas MIDI)
  const ACORDES = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]];
  const ESCALA = [72, 74, 76, 79, 81, 84, 86, 88];
  let acorde = 0;

  function tocarAcordes() {
    if (!ac) return;
    const t = ac.currentTime, dur = 9;
    ACORDES[acorde % ACORDES.length].forEach((n, i) => {
      const o = ac.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = nota(n);
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.22 : 0.09, t + 3);    // entra despacio
      g.gain.setValueAtTime(i === 0 ? 0.22 : 0.09, t + dur - 1);
      g.gain.linearRampToValueAtTime(0, t + dur + 3);                    // y se desvanece encima del siguiente
      o.connect(g).connect(musicaGain);
      o.start(t); o.stop(t + dur + 3.2);
    });
    acorde++;
    setTimeout(tocarAcordes, dur * 1000);
  }

  function campanitas() {
    if (!ac) return;
    if (Math.random() < 0.7) {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = nota(ESCALA[Math.floor(Math.random() * ESCALA.length)]);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(musicaGain);
      o.start(t); o.stop(t + 3.6);
    }
    setTimeout(campanitas, 1400 + Math.random() * 2600);
  }

  // Chapuzón al cruzar la superficie
  function chapuzon() {
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = ruido(1);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    src.connect(f).connect(g).connect(maestro);
    src.start(t); src.stop(t + 1);
    for (let i = 0; i < 6; i++) setTimeout(burbuja, 120 + i * 90 + Math.random() * 120);
  }

  // Burbuja: un tono corto que sube rápido
  function burbuja() {
    if (!ac || !activo) return;
    const t = ac.currentTime, f0 = 250 + Math.random() * 350;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + 0.09);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const pan = ac.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    o.connect(g).connect(pan).connect(maestro);
    o.start(t); o.stop(t + 0.14);
  }

  // ------------------------------------------------------------------
  //  La profundidad controla qué tan opaco se escucha
  // ------------------------------------------------------------------
  setInterval(() => {
    if (!ac || !activo) return;
    const o = window.OCEANO?.estado;
    if (!o) return;
    const t = ac.currentTime;
    const ahoraBajo = o.cam < 0.02;
    if (ahoraBajo && !bajoAgua) chapuzon();
    bajoAgua = ahoraBajo;
    // Sobre el mar se oye todo claro; bajo el agua, solo los graves, y más apagado mientras más se baja
    const corte = o.cam > 0.4 ? 16000 : o.cam > 0.02 ? 2500 + 13500 * (o.cam - 0.02) / 0.38 : 520 - 300 * o.prof;
    filtroAgua.frequency.setTargetAtTime(corte, t, 0.25);
    olasGain.gain.setTargetAtTime(bajoAgua ? 0.15 - 0.09 * o.prof : 0.24, t, 0.4);
    musicaGain.gain.setTargetAtTime(bajoAgua ? 0.22 : 0.16, t, 0.6);
    if (bajoAgua && Math.random() < 0.06) burbuja();
  }, 120);

  // ------------------------------------------------------------------
  //  Botón de encendido
  // ------------------------------------------------------------------
  const guardar = (v) => { try { localStorage.setItem('sonido', v ? '1' : '0'); } catch { /* sin almacenamiento */ } };
  const recordado = (() => { try { return localStorage.getItem('sonido') === '1'; } catch { return false; } })();

  function pintar() {
    boton.textContent = activo ? '🔊 Sonido' : '🔇 Sonido';
    boton.title = activo ? 'Apagar el sonido' : 'Encender el sonido del mar';
    boton.classList.toggle('on', activo);
  }

  function encender() {
    if (!ac) crear();
    ac.resume();
    activo = true;
    bajoAgua = (window.OCEANO?.estado?.cam ?? 1) < 0.02;
    maestro.gain.setTargetAtTime(0.8, ac.currentTime, 1.2);   // entra suave
    pintar();
  }

  function apagar() {
    activo = false;
    if (ac) maestro.gain.setTargetAtTime(0, ac.currentTime, 0.4);
    pintar();
  }

  boton.onclick = (e) => {
    e.stopPropagation();
    if (activo) apagar(); else encender();
    guardar(activo);
  };

  // Si la última vez estaba encendido, suena con el primer clic o tecla en la página
  if (recordado) {
    const primero = () => { if (!activo) encender(); removeEventListener('pointerdown', primero); removeEventListener('keydown', primero); };
    addEventListener('pointerdown', primero);
    addEventListener('keydown', primero);
  }
  pintar();
})();
