// =====================================================
// NOTIFICACIONES PUSH: pedir permiso y guardar la suscripción
// =====================================================
const VAPID_PUBLICA = "BMVAnboM6gg-Zn07_K2E2JKX_PqI7S9wFSKlm9xEJTZqbjj4_9M68um0wCwucPOKiHXd-29KVZSWnsJmYbTux44";

const btnPush = document.getElementById("btn-push");
const estadoPush = document.getElementById("push-estado");

// La llave viene en texto y el navegador la quiere en bytes
function claveABytes(base64) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const limpia = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const texto = atob(limpia);
  const bytes = new Uint8Array(texto.length);

  for (let i = 0; i < texto.length; i++) {
    bytes[i] = texto.charCodeAt(i);
  }

  return bytes;
}

function soportaPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function activarNotificaciones() {
  if (!soportaPush()) {
    estadoPush.textContent = "Este navegador no soporta notificaciones.";
    return;
  }

  if (usuario === null) {
    estadoPush.textContent = "Inicia sesión primero.";
    return;
  }

  const permiso = await Notification.requestPermission();

  if (permiso !== "granted") {
    estadoPush.textContent = "No diste permiso. Puedes activarlo en los ajustes del sitio.";
    return;
  }

  try {
    const registro = await navigator.serviceWorker.ready;
    let suscripcion = await registro.pushManager.getSubscription();

    if (suscripcion === null) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveABytes(VAPID_PUBLICA)
      });
    }

    const datos = suscripcion.toJSON();

    const guardada = await nube.from("push_suscripciones").upsert(
      {
        user_id: usuario.id,
        endpoint: datos.endpoint,
        p256dh: datos.keys.p256dh,
        auth: datos.keys.auth
      },
      { onConflict: "endpoint" }
    );

    if (guardada.error) {
      throw guardada.error;
    }

    // Crea tu configuración de aviso con los valores por defecto (si no existía)
    await nube.from("aviso_config").upsert(
      { user_id: usuario.id },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    estadoPush.textContent = "Notificaciones activadas en este aparato ✓";
  } catch (error) {
    console.error(error);
    estadoPush.textContent = "No se pudo activar: " + error.message;
  }
}

async function revisarEstadoPush() {
  if (!soportaPush()) {
    estadoPush.textContent = "Este navegador no soporta notificaciones.";
    btnPush.hidden = true;
    return;
  }

  if (Notification.permission === "granted") {
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();

    if (suscripcion !== null) {
      estadoPush.textContent = "Notificaciones activadas en este aparato ✓";
    }
  }
}

btnPush.addEventListener("click", activarNotificaciones);
revisarEstadoPush();