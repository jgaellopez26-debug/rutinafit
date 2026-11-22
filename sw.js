const CACHE = "rutinafit-v2";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./auth.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ARCHIVOS);
    })
  );
});

self.addEventListener("fetch", function (evento) {
  evento.respondWith(
    fetch(evento.request).catch(function () {
      return caches.match(evento.request);
    })
  );
});

// ---- Notificaciones push ----
self.addEventListener("push", function (evento) {
  let datos = { titulo: "RutinaFit", mensaje: "Hoy toca entrenar" };

  try {
    datos = evento.data.json();
  } catch (error) {
    // si no llega nada, se queda el aviso por defecto
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.mensaje,
      icon: "icon-192.png",
      badge: "icon-192.png"
    })
  );
});

// ---- Al tocar el aviso, abre la app ----
self.addEventListener("notificationclick", function (evento) {
  evento.notification.close();

  evento.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ventanas) {
      if (ventanas.length > 0) {
        return ventanas[0].focus();
      }
      return clients.openWindow("./index.html");
    })
  );
});
