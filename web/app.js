// Lógica del portafolio: modo en vivo (portal Java) o demostración (GitHub Pages),
// aplicaciones, terminal y códigos fuente.
(() => {
  const D = window.PORTAFOLIO;
  const G = window.GRABACIONES || { programas: {}, api: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  let estado = null;        // último api/estado
  let enLinea = false;      // ¿responde el portal local?
  let comprobado = false;   // ya se intentó contactar al portal
  const iniciando = new Set();
  const nombreDe = (id) => D.apps[id]?.titulo || D.programas[id]?.titulo || id;
  const appDe = (id) => estado?.apps?.[id];

  // ------------------------------------------------------------------
  //  Comunicación con el portal
  // ------------------------------------------------------------------
  async function get(url) {
    const r = await fetch(url, { cache: 'no-store' });
    const t = await r.text();
    const j = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }
  async function post(url, body = '') {
    const r = await fetch(url, { method: 'POST', headers: { 'X-Portal': '1', 'Content-Type': 'text/plain; charset=utf-8' }, body });
    const t = await r.text();
    const j = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }

  function toast(msg, error = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('error', error);
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), error ? 6000 : 3200);
  }

  function urlRepositorio() {
    const h = location.hostname;
    if (h.endsWith('.github.io')) {
      const usuario = h.split('.')[0];
      const repo = location.pathname.split('/').filter(Boolean)[0] || `${usuario}.github.io`;
      return `https://github.com/${usuario}/${repo}`;
    }
    return 'https://github.com/FIRESASQ/miportafoliosamuelsuira';
  }

  // ------------------------------------------------------------------
  //  Carga, navegación y animaciones de entrada
  // ------------------------------------------------------------------
  function cargar() {
    let n = 0;
    const tick = () => {
      n = Math.min(100, n + Math.ceil((100 - n) / 8));
      $('#loaderNum').textContent = n;
      $('#loaderWater').style.height = n + '%';
      if (n < 100) setTimeout(tick, 45);
      else setTimeout(() => $('#loader').classList.add('done'), 350);
    };
    tick();
  }

  function separarLetras() {
    $$('.titulo-ola').forEach((h) => {
      let i = 0;
      [...h.childNodes].forEach((nodo) => {
        if (nodo.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...nodo.textContent].forEach((ch) => {
            const s = document.createElement('span');
            s.className = 'letra';
            s.textContent = ch === ' ' ? ' ' : ch;
            s.style.transitionDelay = (i++ * 0.035) + 's';
            frag.appendChild(s);
          });
          nodo.replaceWith(frag);
        } else {
          nodo.classList.add('letra');
          nodo.style.transitionDelay = (i++ * 0.035 + 0.1) + 's';
        }
      });
    });
  }

  // Los elementos aparecen al entrar en pantalla y desaparecen al salir, bajando o subiendo.
  // Al salir se recuerda por dónde se fueron para que vuelvan a entrar desde ese lado.
  function revelar() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting) {
        el.classList.add('in');
      } else {
        el.classList.remove('in');
        el.dataset.lado = e.boundingClientRect.top < 0 ? 'arriba' : 'abajo';
      }
      $$('.titulo-ola', el).forEach((t) => t.classList.toggle('in', e.isIntersecting));
    }), { rootMargin: '-6% 0px -6% 0px' });
    $$('.reveal, .aparece').forEach((el) => io.observe(el));
  }

  function contar(el, fin) {
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 1600);
      el.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))).toLocaleString('es');
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function navegacion() {
    const links = $$('#navLinks a');
    const secciones = links.map((a) => $(a.getAttribute('href')));
    const zonas = [[0, 'Superficie'], [1, 'Zona epipelágica'], [200, 'Zona mesopelágica'], [1000, 'Zona batipelágica'], [4000, 'Zona abisal'], [6000, 'Zona hadal']];
    const marcar = () => {
      const y = scrollY + innerHeight * 0.35;
      let actual = 0;
      secciones.forEach((s, i) => { if (s && s.offsetTop <= y) actual = i; });
      links.forEach((a, i) => a.classList.toggle('active', i === actual));
    };
    addEventListener('scroll', marcar, { passive: true });
    marcar();
    let ultimaMarca = -1;
    const profundimetro = () => {
      const o = window.OCEANO?.estado;
      if (o && o.metros + o.prof !== ultimaMarca) {
        ultimaMarca = o.metros + o.prof;
        const m = o.metros;
        $('#pfMetros').textContent = (m ? '−' : '') + m.toLocaleString('es') + ' m';
        $('#pfZona').textContent = zonas.filter(([d]) => m >= d).pop()[1];
        $('#pfMarca').style.top = (o.cam > 0 ? 0 : Math.min(100, 4 + o.prof * 96)) + '%';
      }
      requestAnimationFrame(profundimetro);
    };
    profundimetro();
    $('#burger').onclick = () => $('#navLinks').classList.toggle('open');
    links.forEach((a) => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));
    $('#pausa').onclick = () => { const p = window.OCEANO?.pausar(); $('#pausa').textContent = p ? '▶' : '❚❚'; };
    $('#subir').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ------------------------------------------------------------------
  //  Banner del modo (en vivo / demostración)
  // ------------------------------------------------------------------
  function pintarModo() {
    const pill = $('#modoPill');
    if (enLinea) {
      pill.innerHTML = '<i class="dot on"></i><span>En vivo</span>';
      $('#modoBanner').innerHTML = `<span class="ico-modo">⚡</span><div>
        <h4>Todo funciona en vivo</h4>
        <p>Cada botón ▶ abre el programa de verdad en esta computadora. La primera vez tarda un poco más porque el programa se prepara antes de abrirse.</p></div>`;
    } else {
      const repo = urlRepositorio();
      pill.innerHTML = '<i class="dot demo"></i><span>Demostración</span>';
      $('#modoBanner').innerHTML = `<span class="ico-modo">🌊</span><div>
        <h4>Estás viendo la versión de internet</h4>
        <p>En esta versión los programas muestran <b class="grabada">resultados reales que se grabaron</b> cuando se ejecutaron. Para abrirlos de verdad, descarga el proyecto en tu computadora con estos comandos:</p>
        <pre><span class="c"># necesitas tener instalado Docker Desktop</span>
git clone ${esc(repo)}.git
cd ${esc(repo.split('/').pop())}
docker compose up --build
<span class="c"># luego abre http://localhost:9000 en tu navegador</span></pre></div>`;
    }
  }

  // ------------------------------------------------------------------
  //  Páginas web y servicios
  // ------------------------------------------------------------------
  const URLS = { 'l4-mvc': 'http://localhost:8081/estudiantes', 'l5-inventario': 'http://localhost:8082/gestion-inventario/',
    'l7-servidor': 'http://localhost:3000/api/espacios', 'l8-api': 'http://localhost:8080/api/reservas' };
  const PUERTOS = { 'l4-mvc': 8081, 'l5-inventario': 8082, 'l7-servidor': 3000, 'l8-api': 8080 };

  // Tarjeta de una página web o servicio. Si es la única app del laboratorio, el título y la
  // explicación ya están arriba en la diapositiva y no se repiten.
  function htmlApp(id, sola) {
    const a = D.apps[id];
    return `
      <article class="card app" id="app-${id}" data-app="${id}">
        <div class="app-top">
          <span class="chip">${esc(a.tipo)}</span>
          <span class="status"><i class="dot"></i><span class="st-txt">apagada</span></span>
        </div>
        ${sola ? '' : `<div><h4 class="app-titulo">${esc(a.titulo)}</h4><p class="que-hace">${esc(a.queHace)}</p></div>`}
        <div class="window">
          <div class="window-bar"><i></i><i></i><i></i><span class="url">${esc(URLS[id])}</span>
            ${a.vista === 'iframe' ? '<button class="mini" data-recargar title="Recargar">⟳</button>' : ''}
            <button class="mini" data-pestana title="Abrir en una pestaña nueva">↗</button>
          </div>
          <div class="screen"></div>
        </div>
        <p class="como">💡 ${esc(a.como)}</p>
        <div class="app-foot">
          <div class="grp">
            <button class="run" data-toggle>▶ Encender</button>
            ${a.opciones ? `<select data-opcion title="${esc(a.opciones.etiqueta)}">${a.opciones.valores.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>` : ''}
          </div>
          <div class="grp">
            <button class="mini" data-consola>&gt;_ Ver mensajes</button>
            <button class="mini" data-ver-codigo="${esc(a.fuente)}">‹/› Código</button>
          </div>
        </div>
      </article>`;
  }

  function conectarApp(card) {
    const id = card.dataset.app;
    $('[data-toggle]', card).onclick = () => (appDe(id)?.corriendo ? detenerApp(id) : iniciarApp(id));
    $('[data-consola]', card).onclick = () => abrirTab(id, true);
    $('[data-pestana]', card).onclick = () => {
      if (!enLinea) return toast('En la versión de internet esta página no está encendida. Descarga el proyecto para abrirla.', true);
      open(URLS[id], '_blank');
    };
    $('[data-recargar]', card)?.addEventListener('click', () => { const f = $('iframe', card); if (f) f.src = f.src; });
  }

  function actualizarApps() {
    Object.keys(D.apps).forEach((id) => {
      const card = $('#app-' + id);
      if (!card) return;
      const a = D.apps[id];
      const s = appDe(id) || {};
      const demo = comprobado && !enLinea;
      const cargando = iniciando.has(id) || (s.corriendo && !s.listo);
      const fase = { 'base de datos': 'preparando los datos…', compilando: 'preparando el programa…', ejecutando: 'abriendo…', preparando: 'preparando…' }[s.fase] || 'abriendo…';
      const txt = demo ? (a.vista === 'api' ? 'resultados grabados' : 'solo en tu computadora')
        : iniciando.has(id) ? 'encendiendo…' : s.corriendo ? (s.listo ? 'encendida' : fase) : 'apagada';
      $('.dot', card).className = 'dot ' + (s.listo ? 'on' : cargando ? 'warn' : demo ? 'demo' : '');
      $('.st-txt', card).textContent = txt;
      card.classList.toggle('live', !!s.listo);
      const btn = $('[data-toggle]', card);
      btn.disabled = iniciando.has(id);
      btn.classList.toggle('stop', !!s.corriendo);
      btn.textContent = demo ? (a.vista === 'api' ? '▶ Probar' : '▶ Cómo abrirla') : iniciando.has(id) ? 'Encendiendo…' : s.corriendo ? '■ Apagar' : '▶ Encender';
      const sel = $('[data-opcion]', card);
      if (sel) sel.disabled = !!s.corriendo || demo;

      const screen = $('.screen', card);
      const modo = demo ? (a.vista === 'api' && card.dataset.demoApi ? 'demo-api' : 'demo') : s.listo ? 'listo' : cargando ? 'cargando' : 'apagado';
      if (screen.dataset.modo === modo) return;
      screen.dataset.modo = modo;
      screen.classList.toggle('api-mode', modo === 'demo-api' || (modo === 'listo' && a.vista === 'api'));
      if (modo === 'apagado') {
        screen.innerHTML = `<div class="placeholder"><span class="big">⏻</span>Está apagada.<br>Pulsa <b>▶ Encender</b> para abrirla.</div>`;
      } else if (modo === 'cargando') {
        screen.innerHTML = `<div class="placeholder"><div class="sonar"></div>Abriendo…<br><small>La primera vez puede tardar un minuto.</small></div>`;
      } else if (modo === 'demo') {
        screen.innerHTML = a.vista === 'iframe'
          ? `<div class="placeholder"><span class="big">🐋</span>Esta página guarda información en una base de datos, por eso solo se puede abrir en tu computadora.<br><small>Mira arriba cómo descargar el proyecto.</small></div>`
          : `<div class="placeholder"><span class="big">⇄</span>Pulsa <b>▶ Probar</b> para ver cómo respondió este programa.</div>`;
      } else if (a.vista === 'iframe') {
        screen.innerHTML = `<iframe src="${esc(URLS[id])}" title="${esc(a.titulo)}" loading="lazy"></iframe>`;
      } else {
        screen.innerHTML = probadorApi(id, modo === 'demo-api');
        conectarProbador(id, screen, modo === 'demo-api');
      }
    });
  }

  async function iniciarApp(id) {
    if (comprobado && !enLinea) {
      const card = $('#app-' + id);
      if (D.apps[id].vista === 'api') { card.dataset.demoApi = '1'; actualizarApps(); }
      else { $('#modoBanner').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Descarga el proyecto en tu computadora para abrir esta página.'); }
      return;
    }
    if (iniciando.has(id)) return;
    const sel = $(`#app-${id} [data-opcion]`);
    iniciando.add(id);
    actualizarApps();
    abrirTab(id, false);
    try {
      estado = await post(`api/apps/${id}/iniciar`, sel ? sel.value : '');
      toast(`${nombreDe(id)}: abriendo…`);
    } catch (e) {
      toast(e.message, true);
    } finally {
      iniciando.delete(id);
      actualizarTodo();
    }
  }

  async function detenerApp(id) {
    try {
      estado = await post(`api/apps/${id}/detener`);
      toast(`${nombreDe(id)}: apagado`);
    } catch (e) { toast(e.message, true); }
    actualizarTodo();
  }

  // ---------- probador de los servicios ----------
  function probadorApi(id, demo) {
    const a = D.apps[id];
    return `<div class="api">
      <div class="api-presets">${a.peticiones.map((p, i) => `<button data-preset="${i}">${esc(p.t)}</button>`).join('')}</div>
      ${a.apiKey ? '<label class="api-clave"><input type="checkbox" data-clave checked> Enviar la clave de acceso</label>' : ''}
      <details class="api-avanzado"><summary>Escribir mi propio pedido</summary>
      <form class="api-req">
        <select name="m">${['GET', 'POST', 'PUT', 'DELETE'].map((m) => `<option>${m}</option>`).join('')}</select>
        <input class="field" name="p" value="${esc(a.peticiones[0].p)}" spellcheck="false">
        <button class="run" type="submit">Enviar</button>
        <textarea name="b" placeholder="Cuerpo JSON (para POST / PUT)" spellcheck="false"></textarea>
      </form></details>
      <pre class="api-res">${demo ? 'Elige un botón de arriba para ver la respuesta que se grabó.' : 'Elige un botón de arriba para enviarle un pedido al programa.'}</pre>
    </div>`;
  }

  function mostrarRespuesta(res, status, texto, ms, m, ruta, grabada) {
    let cuerpo = texto;
    try { cuerpo = JSON.stringify(JSON.parse(texto), null, 2); } catch { /* no es JSON */ }
    const cls = status < 300 ? 'ok' : status < 500 ? 'wrn' : 'err';
    const motivo = { 200: 'Listo', 201: 'Aceptado: se creó', 204: 'Listo: se canceló', 400: 'Rechazado: faltan datos', 401: 'Rechazado: falta la clave de acceso', 404: 'No existe', 409: 'Rechazado: choca con otra reserva', 502: 'El programa no responde' }[status] || `Respuesta ${status}`;
    res.innerHTML = `<span class="st ${cls}">${motivo}</span>  <span class="muted">respondió en ${ms ?? '?'} milisegundos</span>${grabada ? '  <span class="grabada">· grabado</span>' : ''}\n\n${esc(cuerpo || '(sin datos)')}`;
  }

  function conectarProbador(id, screen, demo) {
    const a = D.apps[id];
    const form = $('form', screen);
    const res = $('.api-res', screen);
    let preset = null;
    $$('[data-preset]', screen).forEach((b) => b.onclick = () => {
      preset = +b.dataset.preset;
      const p = a.peticiones[preset];
      form.m.value = p.m; form.p.value = p.p; form.b.value = p.b || '';
      form.requestSubmit();
    });
    form.oninput = () => { preset = null; };
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const m = form.m.value;
      const ruta = form.p.value.startsWith('/') ? form.p.value : '/' + form.p.value;
      if (demo) {
        const g = preset != null ? G.api[id]?.[a.peticiones[preset].g ?? preset] : null;
        if (a.apiKey && !$('[data-clave]', screen).checked && m !== 'GET') {
          return mostrarRespuesta(res, 401, '{"error":401,"mensaje":"Falta o es inválido el encabezado X-API-KEY"}', 1, m, ruta, true);
        }
        if (!g) {
          res.innerHTML = '<span class="grabada">En la versión de internet solo están las respuestas grabadas de los botones de arriba.</span>\nDescarga el proyecto para enviar tus propios pedidos.';
          return;
        }
        res.innerHTML = '<span class="muted">enviando…</span>';
        await espera(Math.min(700, 120 + g.ms));
        return mostrarRespuesta(res, g.status, g.cuerpo, g.ms, m, ruta, true);
      }
      const headers = { 'X-Portal': '1', 'Content-Type': 'application/json' };
      if (a.apiKey && $('[data-clave]', screen).checked) headers['X-API-KEY'] = a.apiKey;
      res.innerHTML = `<span class="muted">${m} ${esc(ruta)} …</span>`;
      try {
        const r = await fetch(`proxy/${PUERTOS[id]}${ruta}`, { method: m, headers, body: m === 'GET' || m === 'DELETE' ? undefined : form.b.value });
        mostrarRespuesta(res, r.status, await r.text(), r.headers.get('X-Tiempo-Ms'), m, ruta, false);
      } catch (e) {
        res.innerHTML = `<span class="err">${esc(e.message)}</span>`;
      }
    };
  }

  // ------------------------------------------------------------------
  //  Programas de texto
  // ------------------------------------------------------------------
  function htmlProgramas(ids) {
    return `
      <article class="card lab-grupo">
        ${ids.map((id) => {
          const p = D.programas[id];
          return `
        <div class="prog" id="prog-${id}">
          <div class="prog-top"><h5>${esc(p.titulo)}</h5>${p.interactivo ? '<span class="tag">interactivo</span>' : ''}</div>
          <p>${esc(p.desc)}</p>
          ${p.argsTxt ? `<div class="prog-args">${p.argsTxt.map((t, i) => `<label>${esc(t)}<input class="field" data-arg="${i}"></label>`).join('')}</div>` : ''}
          <div class="prog-foot">
            <div class="grp">
              <button class="mini" data-ver-codigo="${esc(p.fuente)}">‹/› Código</button>
              <button class="run" data-run>▶ Ejecutar</button>
            </div>
          </div>
        </div>`;
        }).join('')}
      </article>`;
  }

  // Portada del documento dibujada en la página: el visor de PDF de Chrome se pinta por fuera
  // de las animaciones y deja manchas, así que el PDF completo se abre en otra pestaña.
  function htmlPdf(pdf) {
    const portada = pdf.portada || {};
    return `
      <article class="card pdf-card">
        <a class="pdf-hoja" href="${esc(pdf.archivo)}" target="_blank" rel="noopener" title="Abrir el PDF">
          <span class="hoja-uni">UNIVERSIDAD AUTÓNOMA DE CHIRIQUÍ</span>
          <span class="hoja-fac">Facultad de Economía · Escuela de Ciencias Computacionales</span>
          <span class="hoja-tit">${esc(portada.titulo || pdf.titulo)}</span>
          <span class="hoja-sub">${esc(portada.subtitulo || '')}</span>
          <span class="hoja-datos">${(portada.datos || []).map(esc).join('<br>')}</span>
          <span class="hoja-pag">${pdf.paginas} páginas</span>
        </a>
        <div class="pdf-info">
          <span class="chip">Documento PDF · ${pdf.paginas} páginas</span>
          <h4>${esc(pdf.titulo)}</h4>
          <p>${esc(pdf.explicacion)}</p>
          <div class="grp">
            <a class="run" href="${esc(pdf.archivo)}" target="_blank" rel="noopener">Abrir el PDF</a>
            <a class="mini" href="${esc(pdf.archivo)}" download>Descargar</a>
          </div>
        </div>
      </article>`;
  }

  // ------------------------------------------------------------------
  //  Diapositivas: un laboratorio debajo del otro, aparecen al bajar
  // ------------------------------------------------------------------
  function pintarDiapositivas() {
    const L = D.laboratorios;
    $('#diapoPuntos').innerHTML = L.map((l) => `<a href="#lab-${l.n}" title="Laboratorio ${l.n}: ${esc(l.nombre)}"><b>${l.n}</b><span>${esc(l.nombre)}</span></a>`).join('');
    $('#diapoPista').innerHTML = L.map((l) => {
      const apps = l.apps || [];
      const progs = l.programas || [];
      const requiere = progs.map((id) => D.programas[id].requiere).find(Boolean);
      return `
      <section class="diapo aparece" id="lab-${l.n}" aria-label="Laboratorio ${l.n} de ${L.length}">
        <header class="diapo-cab">
          <span class="lab-num">${String(l.n).padStart(2, '0')}</span>
          <div>
            <span class="prog-lab">LABORATORIO ${l.n} DE ${L.length}</span>
            <h3>${esc(l.nombre)}</h3>
            <p>${esc(l.explicacion)}</p>
          </div>
        </header>
        <div class="diapo-cuerpo">
          ${apps.map((id) => htmlApp(id, apps.length === 1 && !progs.length)).join('')}
          ${progs.length ? `${apps.length ? `<h4 class="diapo-sub">Programas que usan «${esc(nombreDe(requiere))}» <span class="need" data-need-de="${requiere}"></span></h4>` : ''}${htmlProgramas(progs)}` : ''}
          ${l.pdf ? htmlPdf(l.pdf) : ''}
        </div>
      </section>`;
    }).join('');

    $$('#diapoPista .app').forEach(conectarApp);
    const defecto = { 'l7-cliente': ['Samuel Suira'], 'l7-carga': ['/api/lento?ms=500', '20'] };
    Object.entries(defecto).forEach(([id, vals]) => $$(`#prog-${id} [data-arg]`).forEach((inp, i) => { inp.value = vals[i]; }));
    $$('#diapoPista .prog').forEach((card) => { $('[data-run]', card).onclick = () => ejecutarPrograma(card.id.slice(5)); });
  }

  /** Lleva a la diapositiva del laboratorio al que pertenece una app o programa. */
  function irALabDe(id) {
    const l = D.laboratorios.find((x) => (x.apps || []).includes(id) || (x.programas || []).includes(id));
    if (l) $('#lab-' + l.n).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function actualizarProgramas() {
    const demo = comprobado && !enLinea;
    Object.entries(D.programas).forEach(([id, p]) => {
      const card = $('#prog-' + id);
      if (!card) return;
      const s = appDe(id);
      const corre = s?.corriendo || reproduciendo.has(id);
      const btn = $('[data-run]', card);
      btn.classList.toggle('stop', !!corre);
      btn.textContent = corre ? '■ Detener' : demo ? '▶ Ver ejecución' : '▶ Ejecutar';
      $$('[data-arg]', card).forEach((i) => { i.disabled = demo; });
    });
    $$('[data-need-de]').forEach((need) => {
      const req = need.dataset.needDe;
      const listo = appDe(req)?.listo;
      need.classList.toggle('ok', !!listo || demo);
      need.textContent = demo ? `Resultados grabados con «${nombreDe(req)}» encendido`
        : listo ? `✓ «${nombreDe(req)}» está encendido` : `Necesitan «${nombreDe(req)}» (se enciende solo)`;
    });
  }

  async function ejecutarPrograma(id) {
    const p = D.programas[id];
    if (comprobado && !enLinea) return reproducir(id);
    const s = appDe(id);
    if (s?.corriendo) { await detenerApp(id); return; }
    if (p.requiere && !appDe(p.requiere)?.listo) {
      toast(`Encendiendo primero «${nombreDe(p.requiere)}»…`);
      await iniciarApp(p.requiere);
      for (let i = 0; i < 300 && !appDe(p.requiere)?.listo && appDe(p.requiere)?.corriendo; i++) { await espera(400); await refrescar(); }
      if (!appDe(p.requiere)?.listo) { toast(`«${nombreDe(p.requiere)}» no se pudo abrir. Mira sus mensajes.`, true); return; }
    }
    const args = $$(`#prog-${id} [data-arg]`).map((i) => i.value.trim()).join('\n');
    abrirTab(id, true);
    try {
      estado = await post(`api/apps/${id}/iniciar`, args);
      if (p.interactivo) setTimeout(() => $('#termInput').focus(), 300);
    } catch (e) { toast(e.message, true); }
    actualizarTodo();
  }

  // Modo demostración: reproduce la salida grabada como si se estuviera ejecutando
  const reproduciendo = new Set();
  async function reproducir(id) {
    if (reproduciendo.has(id)) { reproduciendo.delete(id); return; }
    const texto = G.programas[id];
    if (!texto) return toast('No hay grabación para este programa.', true);
    abrirTab(id, true);
    const t = tabs.get(id);
    t.texto = `<grabada>[resultado real grabado · en la versión de internet los programas no se ejecutan]</grabada>\n\n`;
    reproduciendo.add(id);
    actualizarProgramas();
    pintarSalida();
    const lineas = texto.split('\n');
    for (const l of lineas) {
      if (!reproduciendo.has(id)) { t.texto += '\n[detenido]\n'; break; }
      t.texto += l + '\n';
      if (tabActiva === id) pintarSalida();
      await espera(l.trim() ? 28 + Math.random() * 40 : 10);
    }
    if (reproduciendo.has(id)) t.texto += '\n[proceso terminado · código de salida 0]\n';
    reproduciendo.delete(id);
    if (tabActiva === id) pintarSalida();
    actualizarProgramas();
  }

  // ------------------------------------------------------------------
  //  Terminal
  // ------------------------------------------------------------------
  const tabs = new Map();
  let tabActiva = null;

  function abrirTab(id, mostrar) {
    if (!tabs.has(id)) tabs.set(id, { desde: 0, texto: '' });
    if (mostrar || !tabActiva) tabActiva = id;
    if (mostrar) $('#term').classList.add('open');
    pintarTabs();
    pintarSalida();
    leerLog(id);
  }

  function pintarTabs() {
    $('#termTabs').innerHTML = [...tabs.keys()].map((id) => {
      const s = appDe(id) || {};
      const vivo = s.corriendo || reproduciendo.has(id);
      return `<button class="term-tab ${id === tabActiva ? 'on' : ''}" data-tab="${id}"><i class="dot ${vivo ? 'on' : ''}"></i>${esc(nombreDe(id))}<span class="x" data-cerrar="${id}">✕</span></button>`;
    }).join('') || '<span class="muted" style="font-size:12px;padding:6px">Sin procesos. Ejecuta un programa para ver su salida aquí.</span>';
    $('#termCount').textContent = Object.values(estado?.apps || {}).filter((a) => a.corriendo).length + reproduciendo.size;
    $$('[data-tab]').forEach((b) => b.onclick = (e) => {
      const cerrar = e.target.dataset.cerrar;
      if (cerrar) { tabs.delete(cerrar); if (tabActiva === cerrar) tabActiva = tabs.keys().next().value || null; }
      else tabActiva = b.dataset.tab;
      pintarTabs(); pintarSalida();
    });
    pintarInfo();
  }

  function pintarInfo() {
    const info = $('#termInfo');
    if (!tabActiva) { info.innerHTML = ''; return; }
    const s = appDe(tabActiva) || {};
    if (!enLinea) {
      info.innerHTML = `<span>${esc(nombreDe(tabActiva))}</span><span class="grabada">resultado grabado</span>`;
      return;
    }
    const durac = s.inicio ? Math.round((Date.now() - s.inicio) / 1000) + ' s' : '—';
    info.innerHTML = `<span>${esc(nombreDe(tabActiva))}</span>
      <span>${s.corriendo ? `<span class="ok">● ${esc(s.fase || 'en ejecución')}</span>` : s.codigo != null ? `terminado · código ${s.codigo}` : 'detenido'}</span>
      ${s.puerto ? `<span>puerto ${s.puerto}</span>` : ''}<span>tiempo ${durac}</span>
      ${s.corriendo ? '<button class="mini" data-stop-tab style="padding:1px 8px">■ Detener</button>' : D.programas[tabActiva] ? '<button class="mini" data-rerun style="padding:1px 8px">▶ Ejecutar otra vez</button>' : ''}`;
    $('[data-stop-tab]', info)?.addEventListener('click', () => detenerApp(tabActiva));
    $('[data-rerun]', info)?.addEventListener('click', () => ejecutarPrograma(tabActiva));
  }

  function colorear(texto) {
    return esc(texto).split('\n').map((l) => l.startsWith('$ ') ? `<span class="cmd">${l}</span>`
      : /^\[(proceso|detenido|error|aviso)/.test(l) ? `<span class="sys">${l}</span>`
      : l.replace(/&lt;grabada&gt;(.*)&lt;\/grabada&gt;/, '<span class="grabada">$1</span>')).join('\n');
  }

  function pintarSalida() {
    const out = $('#termOut');
    const t = tabs.get(tabActiva);
    const abajo = out.scrollHeight - out.scrollTop - out.clientHeight < 60;
    out.innerHTML = t ? colorear(t.texto) : '';
    if (abajo) out.scrollTop = out.scrollHeight;
  }

  async function leerLog(id) {
    const t = tabs.get(id);
    if (!t || t.leyendo || !enLinea) return;
    t.leyendo = true;
    try {
      const r = await get(`api/apps/${id}/log?desde=${t.desde}`);
      if (r.siguiente < t.desde) t.texto = '';
      if (r.texto) {
        t.texto += r.texto;
        if (t.texto.length > 300000) t.texto = t.texto.slice(-250000);
        if (id === tabActiva) pintarSalida();
      }
      t.desde = r.siguiente;
    } catch { /* se reintenta en el siguiente ciclo */ }
    t.leyendo = false;
  }

  function terminal() {
    $('#termToggle').onclick = () => { $('#term').classList.toggle('open'); pintarTabs(); };
    $('#termClose').onclick = () => $('#term').classList.remove('open');    $('#termMax').onclick = () => $('#term').classList.toggle('max');
    $('#termClear').onclick = () => { const t = tabs.get(tabActiva); if (t) { t.texto = ''; pintarSalida(); } };
    $('#termIn').onsubmit = async (e) => {
      e.preventDefault();
      const inp = $('#termInput');
      if (!tabActiva) return;
      if (!enLinea) return toast('En la versión de internet no se puede escribir a los programas. Descarga el proyecto para usarlos.', true);
      try {
        await post(`api/apps/${tabActiva}/entrada`, inp.value);
        inp.value = '';
      } catch (err) { toast(err.message, true); }
    };
    setInterval(() => tabs.forEach((t, id) => { if (id === tabActiva || appDe(id)?.corriendo) leerLog(id); }), 450);
  }

  // ------------------------------------------------------------------
  //  Códigos fuente
  // ------------------------------------------------------------------
  let fuentes = [];
  let filtroLab = 0;
  let archivoActual = null;
  const ejecutables = {};

  async function cargarFuentes() {
    if (enLinea) {
      try { fuentes = await get('api/fuentes'); } catch { fuentes = []; }
    }
    if (!fuentes.length && window.FUENTES) fuentes = window.FUENTES.map(({ ruta, lineas }) => ({ ruta, lineas }));
    Object.entries(D.programas).forEach(([id, p]) => { ejecutables[p.fuente] ||= id; });
    Object.entries(D.apps).forEach(([id, a]) => { ejecutables[a.fuente] ||= id; });
    Object.assign(ejecutables, {
      'laboratorio7/prototipo-java21/src/main/java/Servidor.java': 'l7-servidor',
      'laboratorio8/ReservasLabAPI/src/reservas/servidor/ServidorReservas.java': 'l8-api',
      'laboratorio4/mvc-estudiantes/src/main/java/pa/ac/unachi/mvcestudiantes/MvcEstudiantesApplication.java': 'l4-mvc'
    });
    const codigo = fuentes.filter((f) => /\.(java|jsp|html)$/.test(f.ruta));
    const lineas = codigo.reduce((s, f) => s + f.lineas, 0);
    contar($('#statArchivos'), fuentes.length);
    contar($('#statLineas'), lineas);
    $('#vaultResumen').textContent = `${fuentes.length} archivos de ${Object.keys(D.labs).length} laboratorios, con ${lineas.toLocaleString('es')} líneas de código. Los que tienen ▶ se pueden ejecutar.`;
    $('#vaultFilters').innerHTML = [[0, 'Todos'], ...Object.keys(D.labs).map((n) => [+n, 'Lab ' + n])]
      .map(([n, t]) => `<button data-f="${n}" title="${esc(D.labs[n] || 'Todos los laboratorios')}">${t}</button>`).join('');
    $$('#vaultFilters button').forEach((b) => b.onclick = () => { filtroLab = +b.dataset.f; pintarArbol(); });
    $('#vaultSearch').oninput = pintarArbol;
    pintarArbol();
    if (!archivoActual) abrirArchivo('laboratorio2/lab2-patrones/src/main/java/MaestroEsclavoFacturas.java', false);
  }

  function pintarArbol() {
    $$('#vaultFilters button').forEach((b) => b.classList.toggle('on', +b.dataset.f === filtroLab));
    const q = $('#vaultSearch').value.toLowerCase();
    const grupos = {};
    fuentes.filter((f) => (!filtroLab || f.ruta.startsWith(`laboratorio${filtroLab}/`)) && f.ruta.toLowerCase().includes(q))
      .forEach((f) => { const lab = f.ruta.split('/')[0]; (grupos[lab] ||= []).push(f); });
    $('#vaultTree').innerHTML = Object.entries(grupos).map(([lab, fs]) => `
      <div class="vt-group">${esc(D.labs[lab.replace('laboratorio', '')] || lab)}</div>
      ${fs.map((f) => `<button class="vt-file ${f.ruta === archivoActual ? 'on' : ''}" data-ruta="${esc(f.ruta)}" title="${esc(f.ruta)}"><span>${ejecutables[f.ruta] ? '<i class="run-ico">▶</i>' : ''}${esc(f.ruta.split('/').pop())}</span><small>${f.lineas}</small></button>`).join('')}`).join('')
      || '<p class="muted" style="padding:12px;font-size:13px">Sin resultados.</p>';
    $$('#vaultTree .vt-file').forEach((b) => b.onclick = () => abrirArchivo(b.dataset.ruta, false));
  }

  async function leerArchivo(ruta) {
    const local = window.FUENTES?.find((f) => f.ruta === ruta);
    if (enLinea) {
      const r = await fetch('api/archivo?ruta=' + encodeURIComponent(ruta));
      if (r.ok) return r.text();
    }
    if (local) return local.codigo;
    throw new Error('No se pudo leer el archivo');
  }

  async function abrirArchivo(ruta, desplazar = true) {
    archivoActual = ruta;
    pintarArbol();
    if (desplazar) $('#vault').scrollIntoView({ behavior: 'smooth', block: 'center' });
    const f = fuentes.find((x) => x.ruta === ruta);
    $('#vaultFile').textContent = ruta.split('/').pop();
    $('#vaultMeta').textContent = `${ruta}${f ? ' · ' + f.lineas + ' líneas' : ''}`;
    const run = ejecutables[ruta];
    const bRun = $('#vaultRun');
    bRun.hidden = !run;
    bRun.onclick = () => {
      if (D.programas[run]) ejecutarPrograma(run);
      else { irALabDe(run); if (!appDe(run)?.corriendo) iniciarApp(run); }
    };
    try {
      const txt = await leerArchivo(ruta);
      $('#vaultCode').dataset.raw = txt;
      $('#vaultCode').innerHTML = `<code>${resaltar(txt, ruta)}</code>`;
      $('#vaultCode').scrollTop = 0;
    } catch (e) {
      $('#vaultCode').innerHTML = `<code>// ${esc(e.message)}</code>`;
    }
  }

  function resaltar(txt, ruta) {
    const lang = { java: 'java', jsp: 'xml', html: 'xml', xml: 'xml', sql: 'sql', css: 'css', md: 'markdown', properties: 'ini' }[ruta.split('.').pop()];
    let html = esc(txt);
    if (window.hljs && lang && hljs.getLanguage(lang)) {
      try { html = hljs.highlight(txt, { language: lang, ignoreIllegals: true }).value; } catch { /* sin resaltado */ }
    }
    // Cada línea se envuelve aparte, cerrando y reabriendo los <span> que cruzan saltos de línea
    const abiertos = [];
    return html.split('\n').map((linea) => {
      const prefijo = abiertos.join('');
      const re = /<span[^>]*>|<\/span>/g;
      let m;
      while ((m = re.exec(linea))) { if (m[0] === '</span>') abiertos.pop(); else abiertos.push(m[0]); }
      return `<span class="ln">${prefijo}${linea || ' '}${'</span>'.repeat(abiertos.length)}</span>`;
    }).join('');
  }

  function codigos() {
    $('#vaultCopy').onclick = async () => {
      try { await navigator.clipboard.writeText($('#vaultCode').dataset.raw || ''); toast('Código copiado'); } catch { toast('No se pudo copiar', true); }
    };
    document.addEventListener('click', (e) => {
      const ver = e.target.closest('[data-ver-codigo]');
      if (ver) abrirArchivo(ver.dataset.verCodigo);
    });
  }

  // ------------------------------------------------------------------
  //  Estado general
  // ------------------------------------------------------------------
  async function refrescar() {
    const antes = enLinea;
    try {
      estado = await get('api/estado');
      enLinea = true;
    } catch {
      enLinea = false;
    }
    const primera = !comprobado;
    comprobado = true;
    if (primera || antes !== enLinea) { pintarModo(); cargarFuentes(); }
    actualizarTodo();
  }

  function actualizarTodo() {
    actualizarApps();
    actualizarProgramas();
    pintarTabs();
  }

  // ------------------------------------------------------------------
  //  Inicio
  // ------------------------------------------------------------------
  cargar();
  separarLetras();
  pintarDiapositivas();
  $('#statApps').dataset.count = Object.keys(D.apps).length + Object.keys(D.programas).length;
  navegacion();
  terminal();
  codigos();
  addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#term').classList.remove('max'); });
  setTimeout(() => { revelar(); $$('[data-count]').forEach((el) => contar(el, +el.dataset.count)); }, 500);
  refrescar().then(() => setInterval(() => { if (enLinea || !location.hostname.endsWith('github.io')) refrescar(); }, 1500));
})();
