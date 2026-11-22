// =====================================================
// LOGIN Y SINCRONIZACIÓN CON SUPABASE
// =====================================================
const SUPABASE_URL = "https://lzrqsergzaqtdeohnwxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_j7K_fDcoBn6GEeStBWZSRg_wByPxmhR";

const nube = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const pantallaLogin = document.getElementById("login");
const loginCorreo = document.getElementById("login-correo");
const loginClave = document.getElementById("login-clave");
const loginMensaje = document.getElementById("login-mensaje");
const perfilCorreo = document.getElementById("perfil-correo");

const vistaEntrar = document.getElementById("vista-entrar");
const vistaCrear = document.getElementById("vista-crear");
const regCorreo = document.getElementById("reg-correo");
const regClave = document.getElementById("reg-clave");
const regClave2 = document.getElementById("reg-clave2");
const regMensaje = document.getElementById("reg-mensaje");

let usuario = null;
let temporizadorSubida = null;

function mostrarMensaje(texto, esExito, elemento) {
  const destino = elemento || loginMensaje;
  destino.textContent = texto;
  destino.classList.toggle("ok", esExito === true);
}

function mostrarVista(cual) {
  vistaEntrar.hidden = cual !== "entrar";
  vistaCrear.hidden = cual !== "crear";
  mostrarMensaje("", false);
  mostrarMensaje("", false, regMensaje);
}

// ---- Subir y bajar datos ----
async function subirDatos() {
  if (usuario === null) {
    return;
  }

  const respuesta = await nube.from("datos_usuario").upsert({
    user_id: usuario.id,
    rutinas: rutinas,
    sesiones: sesiones,
    actualizado: new Date().toISOString()
  });

  if (respuesta.error) {
    console.error("No se pudo subir:", respuesta.error.message);
  }
}

function programarSubida() {
  clearTimeout(temporizadorSubida);
  temporizadorSubida = setTimeout(subirDatos, 800);
}

// Cada vez que app.js guarda en el navegador, también subimos a la nube
const guardarRutinasLocal = guardarRutinas;
guardarRutinas = function () {
  guardarRutinasLocal();
  programarSubida();
};

const guardarSesionesLocal = guardarSesiones;
guardarSesiones = function () {
  guardarSesionesLocal();
  programarSubida();
};

async function sincronizar() {
  const respuesta = await nube
    .from("datos_usuario")
    .select("rutinas, sesiones")
    .maybeSingle();

  if (respuesta.error) {
    console.error("No se pudo bajar:", respuesta.error.message);
    return;
  }

  // Cuenta nueva (todavía no tiene nada en la nube): empieza desde cero
  if (respuesta.data === null) {
    rutinas.splice(0, rutinas.length, null, null, null, null, null, null, null);
    sesiones = [];
    guardarRutinasLocal();
    guardarSesionesLocal();
    localStorage.removeItem("entreno_en_curso");

    await subirDatos();
    refrescar(hoy);
    dibujarProgreso();
    return;
  }

  // Si ya hay datos en la nube, esos mandan
  if (respuesta.data.rutinas) {
    rutinas.splice(0, rutinas.length, ...respuesta.data.rutinas);
    guardarRutinasLocal();
  }

  if (respuesta.data.sesiones) {
    sesiones = respuesta.data.sesiones;
    guardarSesionesLocal();
  }

  refrescar(hoy);
  dibujarProgreso();
}

// ---- Entrar y salir ----
function entrar(user) {
  usuario = user;
  pantallaLogin.hidden = true;
  perfilCorreo.textContent = user.email;

  // setTimeout evita un bloqueo de supabase-js dentro de este evento
  setTimeout(sincronizar, 0);
}

nube.auth.onAuthStateChange(function (evento, sesion) {
  if (sesion) {
    if (usuario === null) {
      entrar(sesion.user);
    }
  } else {
    usuario = null;
    pantallaLogin.hidden = false;
  }
});

// ---- Iniciar sesión ----
document.getElementById("login-entrar").addEventListener("click", async function () {
  const correo = loginCorreo.value.trim();
  const clave = loginClave.value;

  if (correo === "" || clave.length < 6) {
    mostrarMensaje("Escribe tu correo y una contraseña de al menos 6 caracteres", false);
    return;
  }

  mostrarMensaje("Entrando...", true);

  const respuesta = await nube.auth.signInWithPassword({ email: correo, password: clave });

  if (respuesta.error) {
    mostrarMensaje("Correo o contraseña incorrectos, o falta confirmar tu correo", false);
  }
});

// ---- Cambiar entre "iniciar sesión" y "crear cuenta" ----
document.getElementById("login-crear").addEventListener("click", function () {
  mostrarVista("crear");
});

document.getElementById("reg-volver").addEventListener("click", function () {
  mostrarVista("entrar");
});

// ---- Crear cuenta ----
document.getElementById("reg-crear").addEventListener("click", async function () {
  const correo = regCorreo.value.trim();
  const clave = regClave.value;

  if (correo === "" || clave.length < 6) {
    mostrarMensaje("Escribe tu correo y una contraseña de al menos 6 caracteres", false, regMensaje);
    return;
  }

  if (clave !== regClave2.value) {
    mostrarMensaje("Las contraseñas no coinciden", false, regMensaje);
    return;
  }

  mostrarMensaje("Creando cuenta...", true, regMensaje);

  const respuesta = await nube.auth.signUp({ email: correo, password: clave });

  if (respuesta.error) {
    mostrarMensaje(respuesta.error.message, false, regMensaje);
  } else if (respuesta.data.session === null) {
    mostrarMensaje("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.", true, regMensaje);
  }
});

// ---- Cerrar sesión ----
document.getElementById("btn-salir").addEventListener("click", async function () {
  if (!confirm("¿Cerrar sesión?")) {
    return;
  }

  await subirDatos();
  await nube.auth.signOut();

  localStorage.removeItem("rutinas");
  localStorage.removeItem("sesiones");
  localStorage.removeItem("entreno_en_curso");
  location.reload();
});
