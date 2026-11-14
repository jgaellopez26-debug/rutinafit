e/* RutinaFit — inicio de sesión y sincronización con Supabase
   Va junto a index.html. No toca tu código: guarda en la nube lo que la
   página ya guarda en localStorage (rutinas, asistencia y peso). */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://lzrqsergzaqtdeohnwxe.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_j7K_fDcoBn6GEeStBWZSRg_wByPxmhR'; // llave pública, segura gracias a RLS

  var SYNC_KEYS = ['rutinafit_week_v1', 'rutinafit_attendance_v1', 'rutinafit_weight_log_v1'];
  var DIRTY_KEY = 'rutinafit_dirty_v1';
  var OWNER_KEY = 'rutinafit_owner_v1';

  // Si la librería no cargó, la página sigue funcionando local como antes.
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('RutinaFit: no cargó supabase-js, se usa solo almacenamiento local.');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  var origSet = Storage.prototype.setItem;
  var session = null;
  var started = false;
  var timers = {};
  var isRecovery = /type=recovery/.test(location.hash);

  /* ---------- Ocultar la página hasta saber si hay sesión ---------- */
  var style = document.createElement('style');
  style.textContent =
    'html.auth-pending body{visibility:hidden}' +
    '#authOverlay{position:fixed;inset:0;z-index:1000;background:var(--void);overflow-y:auto;display:none;align-items:center;justify-content:center;padding:24px}' +
    '#authOverlay.open{display:flex}' +
    '.auth-card{width:100%;max-width:400px;background:var(--panel);border:1px solid #2E2F33;border-radius:8px;padding:32px;margin:auto}' +
    '.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}' +
    '.auth-card h2{font-family:"Anton",sans-serif;font-weight:400;font-size:28px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}' +
    '.auth-card p.auth-sub{color:var(--chalk-dim);font-size:14px;line-height:1.5;margin-bottom:24px}' +
    '.auth-tabs{display:flex;gap:6px;margin-bottom:22px;background:var(--panel-2);padding:4px;border-radius:var(--radius)}' +
    '.auth-tabs button{flex:1;background:none;border:none;color:var(--chalk-dim);padding:10px;border-radius:3px;cursor:pointer;font-family:"Work Sans",sans-serif;font-size:14px;font-weight:600}' +
    '.auth-tabs button.on{background:var(--volt);color:var(--volt-text)}' +
    '.auth-field{margin-bottom:16px}' +
    '.auth-field label{display:block;font-size:13px;color:var(--chalk-dim);margin-bottom:6px}' +
    '.auth-field input{width:100%;background:var(--panel-2);border:1px solid #2E2F33;color:var(--chalk);padding:13px 14px;border-radius:var(--radius);font-family:"Work Sans",sans-serif;font-size:15px}' +
    '.auth-field input:focus{outline:none;border-color:var(--volt)}' +
    '.auth-msg{font-size:13px;line-height:1.5;margin-bottom:16px;min-height:0}' +
    '.auth-msg.err{color:var(--blood)}' +
    '.auth-msg.ok{color:var(--chalk)}' +
    '#authSubmit{width:100%}' +
    '#authSubmit[disabled]{opacity:.6;cursor:wait;transform:none}' +
    '.auth-link{display:block;margin:16px auto 0;background:none;border:none;color:var(--chalk-dim);font-family:"Work Sans",sans-serif;font-size:13px;cursor:pointer;text-decoration:underline}' +
    '.auth-link:hover{color:var(--volt)}' +
    '#logoutBtn{background:transparent;border:1px solid var(--steel);color:var(--chalk);padding:10px 18px;font-family:"Space Mono",monospace;font-size:12px;text-transform:uppercase;letter-spacing:1px;cursor:pointer;border-radius:var(--radius);transition:all .2s ease}' +
    '#logoutBtn:hover{border-color:var(--blood);color:var(--blood)}' +
    '.cfg-card{margin-top:24px;background:var(--panel);border:1px solid #262729;border-radius:8px;padding:32px}' +
    '.cfg-field{margin-bottom:18px}' +
    '.cfg-field label{display:block;font-size:13px;color:var(--chalk-dim);margin-bottom:6px}' +
    '.cfg-field input[type=text],.cfg-field input[type=time]{background:var(--panel-2);border:1px solid #2E2F33;color:var(--chalk);padding:12px 14px;border-radius:var(--radius);font-family:"Work Sans",sans-serif;font-size:15px;color-scheme:dark}' +
    '.cfg-field input[type=text]{width:100%}' +
    '.cfg-field input:focus{outline:none;border-color:var(--volt)}' +
    '.cfg-help{font-size:12px;color:var(--chalk-dim);margin:-8px 0 18px;line-height:1.5}' +
    '.cfg-hora{display:flex;gap:8px;align-items:center;margin-bottom:8px}' +
    '.cfg-hora button,#cfgAddHora{background:transparent;border:1px solid var(--steel);color:var(--chalk);padding:10px 14px;border-radius:var(--radius);cursor:pointer;font-family:"Work Sans",sans-serif;font-size:13px}' +
    '.cfg-hora button:hover,#cfgAddHora:hover{border-color:var(--volt);color:var(--volt)}' +
    '.cfg-days{display:flex;flex-wrap:wrap;gap:8px}' +
    '.cfg-days button{background:var(--panel-2);border:1px solid #2E2F33;color:var(--chalk-dim);padding:9px 14px;border-radius:20px;cursor:pointer;font-family:"Work Sans",sans-serif;font-size:13px}' +
    '.cfg-days button.on{background:var(--volt);border-color:var(--volt);color:var(--volt-text);font-weight:600}' +
    '.cfg-check{display:flex;align-items:center;gap:10px;font-size:14px;margin-bottom:18px;cursor:pointer}' +
    '.cfg-preview{background:var(--panel-2);border:1px solid #262729;border-radius:var(--radius);padding:14px 16px;margin-bottom:18px;font-size:14px;line-height:1.5}' +
    '.cfg-preview strong{display:block;margin-bottom:4px}' +
    '@media (max-width:600px){.auth-card,.cfg-card{padding:24px}}';
  document.head.appendChild(style);
  document.documentElement.classList.add('auth-pending');
  function reveal() { document.documentElement.classList.remove('auth-pending'); }
  setTimeout(reveal, 6000); // por si algo falla, nunca dejamos la página en blanco

  /* ---------- Sincronización ---------- */
  function getDirty() {
    try { return JSON.parse(localStorage.getItem(DIRTY_KEY) || '[]'); } catch (e) { return []; }
  }
  function setDirty(list) {
    origSet.call(localStorage, DIRTY_KEY, JSON.stringify(list));
  }
  function markDirty(key) {
    var d = getDirty();
    if (d.indexOf(key) === -1) { d.push(key); setDirty(d); }
  }
  function clearDirty(key) {
    setDirty(getDirty().filter(function (k) { return k !== key; }));
  }

  async function push(key) {
    if (!session) return false;
    var raw = localStorage.getItem(key);
    if (raw === null) { clearDirty(key); return true; }
    try {
      var res = await sb.from('rutinas').upsert(
        { user_id: session.user.id, nombre: key, datos: { raw: raw }, actualizada_en: new Date().toISOString() },
        { onConflict: 'user_id,nombre' }
      );
      if (res.error) { console.warn('RutinaFit: no se pudo guardar en la nube', res.error.message); return false; }
      clearDirty(key);
      return true;
    } catch (e) {
      console.warn('RutinaFit: sin conexión, se guardará después', e);
      return false;
    }
  }

  function schedule(key) {
    if (!session) return;
    markDirty(key);
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () { delete timers[key]; push(key); }, 800);
  }

  async function flush() {
    var keys = Object.keys(timers);
    keys.forEach(function (k) { clearTimeout(timers[k]); delete timers[k]; });
    var pending = getDirty();
    for (var i = 0; i < pending.length; i++) { await push(pending[i]); }
  }

  // Cada vez que la página guarda en localStorage una de nuestras claves, la subimos.
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
    if (this === window.localStorage && SYNC_KEYS.indexOf(k) !== -1) schedule(k);
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  async function pull() {
    // 1) Lo que quedó pendiente de subir (por ejemplo, cambios hechos sin internet)
    var pending = getDirty();
    for (var i = 0; i < pending.length; i++) { await push(pending[i]); }
    var stillDirty = getDirty();

    // 2) Traer lo que hay en la nube
    var res;
    try {
      res = await sb.from('rutinas').select('nombre,datos').in('nombre', SYNC_KEYS);
    } catch (e) { return; }
    if (res.error) { console.warn('RutinaFit: no se pudo leer la nube', res.error.message); return; }

    var remote = {};
    (res.data || []).forEach(function (r) {
      if (r.datos && typeof r.datos.raw === 'string') remote[r.nombre] = r.datos.raw;
    });

    var changed = false;
    for (var j = 0; j < SYNC_KEYS.length; j++) {
      var k = SYNC_KEYS[j];
      if (stillDirty.indexOf(k) !== -1) continue;
      if (Object.prototype.hasOwnProperty.call(remote, k)) {
        if (localStorage.getItem(k) !== remote[k]) {
          origSet.call(localStorage, k, remote[k]);
          changed = true;
        }
      } else if (localStorage.getItem(k) !== null) {
        await push(k); // primera vez: subimos lo que ya tenías en este dispositivo
      }
    }
    if (changed) location.reload();
  }

  /* ---------- Interfaz de acceso ---------- */
  var mode = 'login';
  var overlay;

  function $(id) { return document.getElementById(id); }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-logo"><div class="logo-mark"></div><div class="logo-text">RutinaFit</div></div>' +
        '<h2 id="authTitle"></h2>' +
        '<p class="auth-sub" id="authSub"></p>' +
        '<div class="auth-tabs" id="authTabs">' +
          '<button type="button" data-mode="login">Entrar</button>' +
          '<button type="button" data-mode="signup">Crear cuenta</button>' +
        '</div>' +
        '<div class="auth-field" id="fEmail"><label for="authEmail">Correo</label>' +
          '<input id="authEmail" type="email" autocomplete="email" placeholder="tu@correo.com"></div>' +
        '<div class="auth-field" id="fPass"><label for="authPass">Contraseña</label>' +
          '<input id="authPass" type="password" placeholder="Mínimo 6 caracteres"></div>' +
        '<div class="auth-field" id="fPass2"><label for="authPass2">Repite la contraseña</label>' +
          '<input id="authPass2" type="password" autocomplete="new-password"></div>' +
        '<div class="auth-msg" id="authMsg" role="status"></div>' +
        '<button type="button" class="btn-primary" id="authSubmit"></button>' +
        '<button type="button" class="auth-link" id="authLink"></button>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelectorAll('#authTabs button').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    $('authSubmit').addEventListener('click', submit);
    $('authLink').addEventListener('click', function () {
      setMode(mode === 'login' ? 'forgot' : 'login');
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(); }
    });
  }

  function msg(text, type) {
    var el = $('authMsg');
    el.textContent = text || '';
    el.className = 'auth-msg' + (type ? ' ' + type : '');
  }

  function setMode(m) {
    mode = m;
    msg('');
    var tabs = $('authTabs');
    var show = function (id, on) { $(id).style.display = on ? '' : 'none'; };
    var titles = {
      login: ['Inicia sesión', 'Entra para ver tus rutinas en cualquier dispositivo.', 'Entrar', '¿Olvidaste tu contraseña?'],
      signup: ['Crea tu cuenta', 'Tus rutinas se guardan en la nube y las ves en tu compu y en tu celular.', 'Crear cuenta', ''],
      forgot: ['Recupera tu contraseña', 'Escribe tu correo y te mandamos un enlace para elegir una nueva.', 'Enviar enlace', 'Volver a iniciar sesión'],
      recovery: ['Elige una nueva contraseña', 'Úsala la próxima vez que entres.', 'Guardar contraseña', '']
    };
    var t = titles[m];
    $('authTitle').textContent = t[0];
    $('authSub').textContent = t[1];
    $('authSubmit').textContent = t[2];
    $('authLink').textContent = t[3];
    show('authLink', !!t[3]);
    show('authTabs', m === 'login' || m === 'signup');
    show('fEmail', m !== 'recovery');
    show('fPass', m !== 'forgot');
    show('fPass2', m === 'recovery');
    $('authPass').setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    tabs.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-mode') === m);
    });
  }

  function showAuth(m) {
    if (!overlay) buildOverlay();
    setMode(m || 'login');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    reveal();
  }
  function hideAuth() {
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function traducir(err) {
    var m = (err && err.message ? err.message : '').toLowerCase();
    if (m.indexOf('invalid login') !== -1) return 'Correo o contraseña incorrectos.';
    if (m.indexOf('email not confirmed') !== -1) return 'Falta confirmar tu correo. Revisa tu bandeja y abre el enlace.';
    if (m.indexOf('already registered') !== -1) return 'Ese correo ya tiene cuenta. Prueba entrando.';
    if (m.indexOf('at least 6') !== -1 || m.indexOf('weak') !== -1) return 'La contraseña debe tener al menos 6 caracteres.';
    if (m.indexOf('rate limit') !== -1 || m.indexOf('too many') !== -1) return 'Se hicieron muchos intentos. Espera unos minutos y vuelve a probar.';
    if (m.indexOf('valid email') !== -1 || m.indexOf('invalid email') !== -1) return 'Escribe un correo válido.';
    if (m.indexOf('same password') !== -1) return 'Elige una contraseña distinta a la anterior.';
    if (m.indexOf('failed to fetch') !== -1 || m.indexOf('network') !== -1) return 'No hay conexión. Revisa tu internet y vuelve a intentar.';
    return 'No se pudo completar. Intenta de nuevo.';
  }

  async function submit() {
    var btn = $('authSubmit');
    var email = $('authEmail').value.trim();
    var pass = $('authPass').value;
    var redirect = location.origin + location.pathname;
    msg('');

    if (mode !== 'recovery' && !email) { msg('Escribe tu correo.', 'err'); return; }
    if ((mode === 'login' || mode === 'signup' || mode === 'recovery') && !pass) { msg('Escribe tu contraseña.', 'err'); return; }
    if ((mode === 'signup' || mode === 'recovery') && pass.length < 6) { msg('La contraseña debe tener al menos 6 caracteres.', 'err'); return; }
    if (mode === 'recovery' && pass !== $('authPass2').value) { msg('Las contraseñas no coinciden.', 'err'); return; }

    btn.disabled = true;
    try {
      if (mode === 'login') {
        var r = await sb.auth.signInWithPassword({ email: email, password: pass });
        if (r.error) { msg(traducir(r.error), 'err'); return; }
        session = r.data.session;
        start();
      } else if (mode === 'signup') {
        var s = await sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirect } });
        if (s.error) { msg(traducir(s.error), 'err'); return; }
        if (s.data.user && s.data.user.identities && s.data.user.identities.length === 0) {
          msg('Ese correo ya tiene cuenta. Prueba entrando.', 'err');
          return;
        }
        if (s.data.session) {
          session = s.data.session;
          start();
        } else {
          msg('Te mandamos un correo. Abre el enlace para confirmar tu cuenta y luego entra aquí.', 'ok');
        }
      } else if (mode === 'forgot') {
        var f = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (f.error) { msg(traducir(f.error), 'err'); return; }
        msg('Listo. Si ese correo tiene cuenta, te llegará un enlace para cambiar la contraseña.', 'ok');
      } else if (mode === 'recovery') {
        var u = await sb.auth.updateUser({ password: pass });
        if (u.error) { msg(traducir(u.error), 'err'); return; }
        history.replaceState(null, '', location.pathname);
        location.reload();
      }
    } catch (e) {
      msg(traducir(e), 'err');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Botón de salir ---------- */
  function addLogoutButton() {
    if ($('logoutBtn')) return;
    var holder = document.querySelector('.nav-actions');
    if (!holder) return;
    var b = document.createElement('button');
    b.id = 'logoutBtn';
    b.type = 'button';
    b.textContent = 'Salir';
    if (session && session.user && session.user.email) b.title = session.user.email;
    b.addEventListener('click', logout);
    holder.insertBefore(b, holder.firstChild);
  }

  async function logout() {
    await flush();
    if (getDirty().length > 0) {
      var seguir = confirm('Hay cambios que todavía no se guardaron en la nube (¿sin internet?). Si sales ahora se pierden. ¿Salir de todos modos?');
      if (!seguir) return;
    }
    await dropPush();
    try { await sb.auth.signOut(); } catch (e) {}
    SYNC_KEYS.concat([DIRTY_KEY, OWNER_KEY]).forEach(function (k) { localStorage.removeItem(k); });
    location.reload();
  }

  /* ---------- Personalizar el aviso (texto, horas y días) ---------- */
  var DIAS_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var DIAS_NOMBRE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var cfg = { titulo: 'Hoy toca: {tipo} 💪', cuerpo: '{ejercicios}', horas: ['07:00'], dias: [0, 1, 2, 3, 4, 5, 6], saltar: false };

  function renderTemplate(t, v) {
    return t.replace(/\{tipo\}/g, v.tipo).replace(/\{ejercicios\}/g, v.ejercicios).replace(/\{dia\}/g, v.dia);
  }

  function previewVars() {
    var idx = (new Date().getDay() + 6) % 7;
    var v = { tipo: 'Pecho', ejercicios: 'Press banca · Aperturas · Fondos', dia: DIAS_NOMBRE[idx] };
    try {
      var week = JSON.parse(localStorage.getItem('rutinafit_week_v1') || 'null');
      var d = week && week[DIAS_NOMBRE[idx]];
      if (d && d.tipo) {
        v.tipo = d.tipo;
        v.ejercicios = (d.ejercicios || []).map(function (e) {
          return typeof e === 'string' ? e : e.name + (e.detail ? ' — ' + e.detail : '');
        }).join(' · ') || 'Abre la app y revisa tu plan.';
      }
    } catch (e) {}
    return v;
  }

  function updatePreview() {
    var box = $('cfgPreview');
    if (!box) return;
    var v = previewVars();
    var t = document.createElement('strong');
    t.textContent = renderTemplate($('cfgTitulo').value || 'RutinaFit', v);
    box.textContent = '';
    box.appendChild(t);
    box.appendChild(document.createTextNode(renderTemplate($('cfgCuerpo').value, v)));
  }

  function cfgMsg(text, type) {
    var el = $('cfgMsg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-msg' + (type ? ' ' + type : '');
  }

  function horaRow(value) {
    var row = document.createElement('div');
    row.className = 'cfg-hora';
    row.innerHTML = '<input type="time" step="300" value="' + value + '"><button type="button">Quitar</button>';
    row.querySelector('button').addEventListener('click', function () {
      if ($('cfgHoras').children.length > 1) row.remove();
    });
    return row;
  }

  function fillPanel() {
    if (!$('notifSettings')) return;
    $('cfgTitulo').value = cfg.titulo;
    $('cfgCuerpo').value = cfg.cuerpo;
    $('cfgSaltar').checked = !!cfg.saltar;
    $('cfgHoras').innerHTML = '';
    cfg.horas.forEach(function (h) { $('cfgHoras').appendChild(horaRow(h)); });
    $('cfgDias').querySelectorAll('button').forEach(function (b, i) {
      b.classList.toggle('on', cfg.dias.indexOf(i) !== -1);
    });
    updatePreview();
  }

  function buildSettingsPanel() {
    if ($('notifSettings')) return;
    var anchor = document.querySelector('#hoy .hoy-card');
    if (!anchor) return;
    var card = document.createElement('div');
    card.id = 'notifSettings';
    card.className = 'cfg-card';
    card.innerHTML =
      '<h3 class="card-title">Personaliza tu aviso</h3>' +
      '<div class="cfg-field"><label for="cfgTitulo">Título</label><input type="text" id="cfgTitulo" maxlength="60"></div>' +
      '<div class="cfg-field"><label for="cfgCuerpo">Mensaje</label><input type="text" id="cfgCuerpo" maxlength="140"></div>' +
      '<p class="cfg-help">Puedes usar {tipo} (tu tipo de día), {ejercicios} (la lista del día) y {dia}.</p>' +
      '<div class="cfg-field"><label>Horas del aviso (te avisa a cada hora que agregues)</label><div id="cfgHoras"></div>' +
        '<button type="button" id="cfgAddHora">Agregar otra hora</button></div>' +
      '<div class="cfg-field"><label>Días en que avisa</label><div class="cfg-days" id="cfgDias"></div></div>' +
      '<label class="cfg-check"><input type="checkbox" id="cfgSaltar"> No avisar si ya marqué que fui al gym hoy</label>' +
      '<div class="cfg-preview" id="cfgPreview"></div>' +
      '<button type="button" class="btn-primary" id="cfgSave">Guardar aviso</button>' +
      '<div class="auth-msg" id="cfgMsg" role="status" style="margin-top:14px"></div>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);

    DIAS_ABBR.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = d;
      b.addEventListener('click', function () { b.classList.toggle('on'); });
      $('cfgDias').appendChild(b);
    });
    $('cfgAddHora').addEventListener('click', function () {
      if ($('cfgHoras').children.length >= 4) { cfgMsg('Máximo 4 horas al día.', 'err'); return; }
      $('cfgHoras').appendChild(horaRow('19:00'));
    });
    $('cfgTitulo').addEventListener('input', updatePreview);
    $('cfgCuerpo').addEventListener('input', updatePreview);
    $('cfgSave').addEventListener('click', saveConfig);
    fillPanel();
  }

  async function loadConfig() {
    try {
      var res = await sb.from('notif_config').select('*').maybeSingle();
      if (res.data) {
        cfg = {
          titulo: res.data.titulo,
          cuerpo: res.data.cuerpo,
          horas: res.data.horas && res.data.horas.length ? res.data.horas : ['07:00'],
          dias: res.data.dias && res.data.dias.length ? res.data.dias : [0, 1, 2, 3, 4, 5, 6],
          saltar: res.data.saltar_si_asistio
        };
      }
    } catch (e) { /* se queda con los valores por defecto */ }
    fillPanel();
  }

  async function saveConfig() {
    if (!session) return;
    var horas = Array.prototype.map.call($('cfgHoras').querySelectorAll('input'), function (i) { return i.value; })
      .filter(function (h) { return /^\d{2}:\d{2}$/.test(h); })
      .map(function (h) {
        var p = h.split(':');
        var m = Math.floor(parseInt(p[1], 10) / 5) * 5; // los avisos salen cada 5 minutos
        return p[0] + ':' + (m < 10 ? '0' : '') + m;
      });
    horas = horas.filter(function (h, i) { return horas.indexOf(h) === i; }).sort();
    var dias = [];
    $('cfgDias').querySelectorAll('button').forEach(function (b, i) { if (b.classList.contains('on')) dias.push(i); });

    if (!horas.length) { cfgMsg('Agrega al menos una hora.', 'err'); return; }
    if (!dias.length) { cfgMsg('Elige al menos un día.', 'err'); return; }

    var btn = $('cfgSave');
    btn.disabled = true;
    cfgMsg('');
    try {
      var res = await sb.from('notif_config').upsert({
        user_id: session.user.id,
        activo: true,
        titulo: $('cfgTitulo').value.trim() || 'RutinaFit',
        cuerpo: $('cfgCuerpo').value.trim(),
        horas: horas,
        dias: dias,
        saltar_si_asistio: $('cfgSaltar').checked,
        zona: (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Mexico_City',
        actualizada_en: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (res.error) { cfgMsg('No se pudo guardar. Intenta de nuevo.', 'err'); return; }
      cfg = { titulo: $('cfgTitulo').value.trim() || 'RutinaFit', cuerpo: $('cfgCuerpo').value.trim(), horas: horas, dias: dias, saltar: $('cfgSaltar').checked };
      fillPanel();
      var extra = (pushSupported() && Notification.permission !== 'granted')
        ? ' Falta tocar «Activar avisos» arriba para recibirlos en este celular.' : '';
      cfgMsg('Guardado.' + extra, 'ok');
    } catch (e) {
      cfgMsg('No hay conexión. Intenta de nuevo.', 'err');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Notificaciones push (llegan con la app cerrada) ---------- */
  var VAPID_PUBLIC = 'BPiHwdlZmBPBS59fyk4mHCDlnpnixz-iyoEw_f2SancF6F1DnGNh3otYq7FhP9dosJCm_z2QOM7kgsxmCMVwOUI';
  var NOTIF_KEY = 'rutinafit_notif_enabled';

  function urlB64ToUint8(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Registra este dispositivo en la nube para recibir avisos con la app cerrada.
  async function ensurePush() {
    if (!session || !pushSupported()) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem(NOTIF_KEY) !== 'true') return;
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8(VAPID_PUBLIC)
        });
      }
      var j = sub.toJSON();
      var res = await sb.from('push_subscriptions').upsert(
        { user_id: session.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
        { onConflict: 'endpoint' }
      );
      if (res.error) console.warn('RutinaFit: no se pudo guardar la suscripción', res.error.message);
    } catch (e) {
      console.warn('RutinaFit: no se pudo activar el push', e);
    }
  }

  // Quita este dispositivo de la lista de avisos.
  async function dropPush() {
    if (!pushSupported()) return;
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) {
        var endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (session) await sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    } catch (e) { /* no pasa nada */ }
  }

  // Cuando tocas "Activar avisos", además del aviso local registramos el push.
  function hookNotifButton() {
    var btn = document.getElementById('notifBtn');
    if (!btn || btn.getAttribute('data-push-hooked')) return;
    btn.setAttribute('data-push-hooked', '1');
    btn.addEventListener('click', async function () {
      try { await Notification.requestPermission(); } catch (e) {}
      setTimeout(function () {
        if (localStorage.getItem(NOTIF_KEY) === 'true') ensurePush(); else dropPush();
      }, 400);
    });
  }

  /* ---------- Arranque ---------- */
  async function start() {
    if (started || !session) return;
    started = true;
    hideAuth();

    // Si en este dispositivo había datos de otra cuenta, no los mezclamos.
    var owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== session.user.id) {
      SYNC_KEYS.concat([DIRTY_KEY]).forEach(function (k) { localStorage.removeItem(k); });
      origSet.call(localStorage, OWNER_KEY, session.user.id);
      location.reload();
      return;
    }
    if (!owner) origSet.call(localStorage, OWNER_KEY, session.user.id);

    addLogoutButton();
    hookNotifButton();
    buildSettingsPanel();
    await pull();
    reveal();
    ensurePush();
    loadConfig();
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    sb.auth.onAuthStateChange(function (event, s) {
      // Importante: no llamar a Supabase directamente dentro de este callback.
      if (event === 'PASSWORD_RECOVERY') {
        isRecovery = true;
        setTimeout(function () { showAuth('recovery'); }, 0);
      } else if (event === 'SIGNED_IN' && s && !isRecovery) {
        session = s;
        setTimeout(start, 0);
      } else if (event === 'SIGNED_OUT') {
        session = null;
        if (started) { started = false; setTimeout(function () { showAuth('login'); }, 0); }
      } else if (s) {
        session = s;
      }
    });

    sb.auth.getSession().then(function (r) {
      session = r.data && r.data.session ? r.data.session : null;
      if (isRecovery) { showAuth('recovery'); return; }
      if (session) start(); else showAuth('login');
    }).catch(function () { showAuth('login'); });
];
  });
})();
