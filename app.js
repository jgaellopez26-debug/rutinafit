// =====================================================
// 1. CAMBIAR DE PANTALLA CON EL MENÚ
// =====================================================
const botones = document.querySelectorAll(".menu a");
const pantallas = document.querySelectorAll("section");

botones.forEach(function (boton) {
  boton.addEventListener("click", function (evento) {
    evento.preventDefault();

    const destino = boton.getAttribute("href").slice(1);

    pantallas.forEach(function (pantalla) {
      pantalla.classList.remove("activa");
    });
    botones.forEach(function (b) {
      b.classList.remove("activo");
    });

    document.getElementById(destino).classList.add("activa");
    boton.classList.add("activo");

    document.getElementById("titulo-barra").textContent =
      boton.querySelector(".texto").textContent;
  });
});

// =====================================================
// 2. TEMPORIZADOR DE DESCANSO
// =====================================================
let segundos = 60;
let reloj = null;

const pantallaTiempo = document.getElementById("tiempo");
const botonDescanso = document.getElementById("btn-descanso");

function mostrarTiempo() {
  const min = String(Math.floor(segundos / 60)).padStart(2, "0");
  const seg = String(segundos % 60).padStart(2, "0");
  pantallaTiempo.textContent = min + ":" + seg;
}

botonDescanso.addEventListener("click", function () {
  clearInterval(reloj);
  segundos = 60;
  mostrarTiempo();
  botonDescanso.textContent = "Reiniciar";

  reloj = setInterval(function () {
    segundos = segundos - 1;
    mostrarTiempo();

    if (segundos <= 0) {
      clearInterval(reloj);
      botonDescanso.textContent = "Iniciar descanso";
    }
  }, 1000);
});

// =====================================================
// 3. RUTINAS
// =====================================================
const rutinasPorDefecto = [null, null, null, null, null, null, null];

const rutinas = JSON.parse(localStorage.getItem("rutinas")) || rutinasPorDefecto;
const nombresDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const botonesDia = document.querySelectorAll(".dia-btn");
const detalle = document.getElementById("detalle");
const hoy = (new Date().getDay() + 6) % 7;

const editor = document.getElementById("editor");
const edTitulo = document.getElementById("editor-titulo");
const edNombre = document.getElementById("ed-nombre");
const edGrupo = document.getElementById("ed-grupo");
const edLista = document.getElementById("ed-lista");
const edAgregar = document.getElementById("ed-agregar");
const edGuardar = document.getElementById("ed-guardar");
const edCancelar = document.getElementById("ed-cancelar");
const edEliminar = document.getElementById("ed-eliminar");

let diaEditando = null;

function guardarRutinas() {
  localStorage.setItem("rutinas", JSON.stringify(rutinas));
}

function limpiar(texto) {
  const caja = document.createElement("div");
  caja.textContent = texto;
  return caja.innerHTML;
}

function rotularBotones() {
  botonesDia.forEach(function (boton, indice) {
    const rutina = rutinas[indice];
    boton.querySelector("small").textContent = rutina ? rutina.grupo : "—";
  });
}

function mostrarDia(indice) {
  botonesDia.forEach(function (b) {
    b.classList.remove("elegido");
  });
  botonesDia[indice].classList.add("elegido");

  const rutina = rutinas[indice];

  if (rutina === null) {
    detalle.innerHTML =
      '<p class="vacio">Sin rutina</p>' +
      '<button class="btn-editar">+ Crear rutina</button>';
  } else {
    let lista = "";
    rutina.ejercicios.forEach(function (e) {
      lista += '<div class="ejercicio"><span>' + limpiar(e.nombre) + '</span><span class="gris">' + limpiar(e.series) + "</span></div>";
    });

    detalle.innerHTML =
      "<h2>" + limpiar(rutina.nombre) + "</h2>" + lista +
      '<div class="acciones">' +
      '<button class="btn-editar contorno">✏️ Editar rutina</button>' +
      '<button class="btn-copiar contorno">📋 Copiar a otro día</button>' +
      "</div>" +
      '<div class="copiar" hidden></div>';
  }

  detalle.querySelector(".btn-editar").addEventListener("click", function () {
    abrirEditor(indice);
  });

  const botonCopiar = detalle.querySelector(".btn-copiar");
  if (botonCopiar !== null) {
    botonCopiar.addEventListener("click", function () {
      abrirCopiar(indice);
    });
  }
}

function abrirCopiar(origen) {
  const caja = detalle.querySelector(".copiar");

  if (!caja.hidden) {
    caja.hidden = true;
    return;
  }

  let html = '<p class="etiqueta-t">COPIAR A…</p><div class="dias-copiar">';
  nombresDias.forEach(function (nombre, i) {
    if (i !== origen) {
      html += '<button class="contorno" data-destino="' + i + '">' + nombre + "</button>";
    }
  });
  html += "</div>";

  caja.innerHTML = html;
  caja.hidden = false;

  caja.querySelectorAll("button").forEach(function (boton) {
    boton.addEventListener("click", function () {
      copiarRutina(origen, Number(boton.dataset.destino));
    });
  });
}

function copiarRutina(origen, destino) {
  if (rutinas[destino] !== null) {
    const ok = confirm(nombresDias[destino] + " ya tiene una rutina (" + rutinas[destino].nombre + "). ¿Reemplazarla?");
    if (!ok) {
      return;
    }
  }

  rutinas[destino] = JSON.parse(JSON.stringify(rutinas[origen]));
  guardarRutinas();
  refrescar(destino);
}

function agregarFila(nombre, series) {
  const fila = document.createElement("div");
  fila.className = "fila-ejercicio";
  fila.innerHTML =
    '<input type="text" class="f-nombre" placeholder="Ejercicio">' +
    '<input type="text" class="f-series" placeholder="4 x 10">' +
    '<button class="quitar">🗑</button>';

  fila.querySelector(".f-nombre").value = nombre;
  fila.querySelector(".f-series").value = series;
  fila.querySelector(".quitar").addEventListener("click", function () {
    fila.remove();
  });

  edLista.appendChild(fila);
}

function abrirEditor(indice) {
  diaEditando = indice;
  const rutina = rutinas[indice];
  edLista.innerHTML = "";

  if (rutina === null) {
    edTitulo.textContent = "Nueva rutina";
    edNombre.value = "";
    edGrupo.value = "";
    agregarFila("", "");
    edEliminar.hidden = true;
  } else {
    edTitulo.textContent = "Editar rutina";
    edNombre.value = rutina.nombre;
    edGrupo.value = rutina.grupo;
    rutina.ejercicios.forEach(function (e) {
      agregarFila(e.nombre, e.series);
    });
    edEliminar.hidden = false;
  }

  detalle.hidden = true;
  editor.hidden = false;
}

function cerrarEditor() {
  editor.hidden = true;
  detalle.hidden = false;
}

function refrescar(indice) {
  rotularBotones();
  cerrarEditor();
  mostrarDia(indice);
  dibujarInicio();
  dibujarEntrenar();
}

botonesDia.forEach(function (boton, indice) {
  boton.addEventListener("click", function () {
    cerrarEditor();
    mostrarDia(indice);
  });
});

edAgregar.addEventListener("click", function () {
  agregarFila("", "");
});

edCancelar.addEventListener("click", cerrarEditor);

edGuardar.addEventListener("click", function () {
  const nombre = edNombre.value.trim();

  if (nombre === "") {
    alert("Ponle un nombre a la rutina");
    return;
  }

  const ejercicios = [];
  edLista.querySelectorAll(".fila-ejercicio").forEach(function (fila) {
    const n = fila.querySelector(".f-nombre").value.trim();
    const s = fila.querySelector(".f-series").value.trim();
    if (n !== "") {
      ejercicios.push({ nombre: n, series: s });
    }
  });

  rutinas[diaEditando] = {
    nombre: nombre,
    grupo: edGrupo.value.trim() || nombre,
    ejercicios: ejercicios
  };

  guardarRutinas();
  refrescar(diaEditando);
});

edEliminar.addEventListener("click", function () {
  if (confirm("¿Eliminar la rutina de este día?")) {
    rutinas[diaEditando] = null;
    guardarRutinas();
    refrescar(diaEditando);
  }
});

rotularBotones();
botonesDia[hoy].classList.add("hoy");
mostrarDia(hoy);

// =====================================================
// 4. PROGRESO (datos reales)
// =====================================================
let sesiones = JSON.parse(localStorage.getItem("sesiones")) || [];

function guardarSesiones() {
  localStorage.setItem("sesiones", JSON.stringify(sesiones));
}

// ---- Gráficas ----
function miniBarras(valores) {
  const max = Math.max(...valores) || 1;
  let html = "";
  valores.forEach(function (v) {
    html += '<span style="height:' + ((v / max) * 100) + '%"></span>';
  });
  return html;
}

function miniLinea(valores) {
  const ancho = 100;
  const alto = 40;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = (max - min) || 1;
  const paso = ancho / (valores.length - 1);

  const puntos = valores.map(function (v, i) {
    return (i * paso) + "," + (alto - ((v - min) / rango) * alto);
  }).join(" ");

  return '<svg viewBox="0 0 ' + ancho + " " + alto + '" preserveAspectRatio="none">' +
    '<polyline points="' + puntos + '" fill="none" stroke="#3654FF" stroke-width="2" vector-effect="non-scaling-stroke" />' +
    "</svg>";
}

function graficaPeso(valores, etiquetas, minY, maxY) {
  const ancho = 400;
  const alto = 180;
  const izq = 34;
  const der = 12;
  const arriba = 14;
  const abajo = 28;
  const anchoUtil = ancho - izq - der;
  const altoUtil = alto - arriba - abajo;
  const base = arriba + altoUtil;

  function posY(v) {
    return base - ((v - minY) / (maxY - minY)) * altoUtil;
  }

  let svg = '<svg viewBox="0 0 ' + ancho + " " + alto + '">';

  [minY, (minY + maxY) / 2, maxY].forEach(function (g) {
    const y = posY(g);
    svg += '<line x1="' + izq + '" y1="' + y + '" x2="' + (ancho - der) + '" y2="' + y + '" stroke="#2A3236" />';
    svg += '<text x="' + (izq - 6) + '" y="' + (y + 4) + '" fill="#8A9499" font-size="11" text-anchor="end">' + g + "</text>";
  });

  const paso = anchoUtil / (valores.length - 1);
  const puntos = valores.map(function (v, i) {
    return (izq + i * paso) + "," + posY(v);
  });

  svg += '<polygon points="' + puntos.join(" ") + " " + (izq + anchoUtil) + "," + base + " " + izq + "," + base + '" fill="#3654FF" opacity="0.15" />';
  svg += '<polyline points="' + puntos.join(" ") + '" fill="none" stroke="#3654FF" stroke-width="2" />';

  valores.forEach(function (v, i) {
    svg += '<circle cx="' + (izq + i * paso) + '" cy="' + posY(v) + '" r="3" fill="#3654FF" />';
  });

  etiquetas.forEach(function (texto, i) {
    const x = izq + i * (anchoUtil / (etiquetas.length - 1));
    let anclaje = "middle";
    if (i === 0) {
      anclaje = "start";
    }
    if (i === etiquetas.length - 1) {
      anclaje = "end";
    }
    svg += '<text x="' + x + '" y="' + (alto - 8) + '" fill="#8A9499" font-size="11" text-anchor="' + anclaje + '">' + texto + "</text>";
  });

  const ultimo = valores[valores.length - 1];
  svg += '<text x="' + (izq + anchoUtil) + '" y="' + (posY(ultimo) - 10) + '" fill="#FFFFFF" font-size="12" font-weight="bold" text-anchor="end">' + ultimo + " kg</text>";

  return svg + "</svg>";
}

// ---- Fechas y cálculos ----
function textoFecha(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mes + "-" + dia;
}

function haceCuantos(texto) {
  const hoyFecha = new Date(textoFecha(new Date()) + "T00:00:00");
  const fecha = new Date(texto + "T00:00:00");
  return Math.round((hoyFecha - fecha) / 86400000);
}

function fechaCorta(texto) {
  const partes = texto.split("-");
  return partes[2] + "/" + partes[1];
}

function sesionesEntre(desde, hasta) {
  return sesiones.filter(function (s) {
    const edad = haceCuantos(s.fecha);
    return edad >= desde && edad < hasta;
  });
}

function sumarMinutos(lista) {
  let total = 0;
  lista.forEach(function (s) {
    total += s.minutos;
  });
  return total;
}

function cambio(actual, anterior) {
  if (anterior === 0) {
    return actual > 0 ? "▲ Nuevo" : "—";
  }
  const porcentaje = Math.round(((actual - anterior) / anterior) * 100);
  return (porcentaje >= 0 ? "▲ +" : "▼ ") + porcentaje + "%";
}

function formatoTiempo(min) {
  if (min < 60) {
    return min + " min";
  }
  return (Math.round(min / 6) / 10) + " h";
}

function porSemana(campo) {
  const semanas = [0, 0, 0, 0, 0, 0, 0];
  sesiones.forEach(function (s) {
    const semana = Math.floor(haceCuantos(s.fecha) / 7);
    if (semana >= 0 && semana < 7) {
      semanas[6 - semana] += campo === "minutos" ? s.minutos / 60 : 1;
    }
  });
  return semanas;
}

function clave(nombre) {
  return nombre.trim().toLowerCase();
}

function listaEjercicios() {
  const mapa = {};
  sesiones.forEach(function (s) {
    s.ejercicios.forEach(function (e) {
      if (!mapa[clave(e.nombre)]) {
        mapa[clave(e.nombre)] = e.nombre;
      }
    });
  });
  return mapa;
}

function mejorKg(sesion, claveEj) {
  let mejor = 0;
  sesion.ejercicios.forEach(function (e) {
    if (clave(e.nombre) === claveEj && e.kg > mejor) {
      mejor = e.kg;
    }
  });
  return mejor;
}

function puntosEjercicio(claveEj, dias) {
  const ordenadas = sesionesEntre(0, dias).sort(function (a, b) {
    return a.fecha.localeCompare(b.fecha);
  });
  const puntos = [];
  ordenadas.forEach(function (s) {
    const kg = mejorKg(s, claveEj);
    if (kg > 0) {
      puntos.push({ fecha: s.fecha, kg: kg });
    }
  });
  return puntos;
}

function records() {
  const mejores = {};
  sesiones.forEach(function (s) {
    s.ejercicios.forEach(function (e) {
      const c = clave(e.nombre);
      if (e.kg > 0 && (!mejores[c] || e.kg > mejores[c].kg)) {
        mejores[c] = { nombre: e.nombre, kg: e.kg };
      }
    });
  });
  return Object.values(mejores)
    .sort(function (a, b) {
      return b.kg - a.kg;
    })
    .slice(0, 5);
}

function calcularRacha() {
  const dias = {};
  sesiones.forEach(function (s) {
    dias[s.fecha] = true;
  });

  let racha = 0;
  const d = new Date();
  if (!dias[textoFecha(d)]) {
    d.setDate(d.getDate() - 1);
  }
  while (dias[textoFecha(d)]) {
    racha++;
    d.setDate(d.getDate() - 1);
  }
  return racha;
}

// ---- Dibujar la pantalla ----
const selRango = document.getElementById("rango");
const selEjercicio = document.getElementById("sel-ejercicio");

function ponerCambio(id, texto) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.classList.toggle("baja", texto.startsWith("▼"));
}

function dibujarCalendario() {
  const letras = ["L", "M", "X", "J", "V", "S", "D"];
  const dias = {};
  sesiones.forEach(function (s) {
    dias[s.fecha] = true;
  });

  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));

  let html = "";
  letras.forEach(function (letra, i) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    const hecho = dias[textoFecha(dia)];
    html += '<div class="cal-dia"><span>' + letra + '</span><div class="punto' + (hecho ? " hecho" : "") + '">' + (hecho ? "✓" : "") + "</div></div>";
  });
  document.getElementById("calendario").innerHTML = html;
}

function dibujarProgreso() {
  dibujarResumen();
  const dias = Number(selRango.value);
  const actuales = sesionesEntre(0, dias);
  const anteriores = sesionesEntre(dias, dias * 2);
  const minActual = sumarMinutos(actuales);
  const minAnterior = sumarMinutos(anteriores);

  // Tarjetas de arriba
  document.getElementById("total-entrenos").textContent = actuales.length;
  document.getElementById("total-tiempo").textContent = formatoTiempo(minActual);
  ponerCambio("cambio-entrenos", cambio(actuales.length, anteriores.length));
  ponerCambio("cambio-tiempo", cambio(minActual, minAnterior));

  const hayDatos = sesiones.length > 0;
  document.getElementById("mini-barras").innerHTML = hayDatos ? miniBarras(porSemana("entrenos")) : "";
  document.getElementById("mini-linea").innerHTML = hayDatos ? miniLinea(porSemana("minutos")) : "";

  // Selector de ejercicio
  const mapa = listaEjercicios();
  const claves = Object.keys(mapa);
  const anterior = selEjercicio.value;
  selEjercicio.innerHTML = "";

  if (claves.length === 0) {
    selEjercicio.innerHTML = "<option>Sin ejercicios</option>";
    selEjercicio.disabled = true;
  } else {
    selEjercicio.disabled = false;
    claves.forEach(function (c) {
      const opcion = document.createElement("option");
      opcion.value = c;
      opcion.textContent = mapa[c];
      selEjercicio.appendChild(opcion);
    });
    if (claves.indexOf(anterior) !== -1) {
      selEjercicio.value = anterior;
    }
  }

  // Gráfica de peso
  const grafica = document.getElementById("grafica-peso");
  const puntos = claves.length > 0 ? puntosEjercicio(selEjercicio.value, dias) : [];

  if (puntos.length < 2) {
    grafica.innerHTML = '<p class="vacio">Registra al menos 2 entrenamientos con este ejercicio para ver tu evolución.</p>';
  } else {
    const kgs = puntos.map(function (p) {
      return p.kg;
    });
    const minY = Math.floor(Math.min(...kgs) / 10) * 10;
    let maxY = Math.ceil(Math.max(...kgs) / 10) * 10;
    if (maxY === minY) {
      maxY = minY + 10;
    }
    const etiquetas = [fechaCorta(puntos[0].fecha), fechaCorta(puntos[puntos.length - 1].fecha)];
    grafica.innerHTML = graficaPeso(kgs, etiquetas, minY, maxY);
  }

  // Récords
  const lista = records();
  document.getElementById("records").innerHTML =
    lista.length === 0
      ? '<p class="vacio">Aún no hay récords</p>'
      : lista.map(function (r) {
          return '<div class="record"><span>' + limpiar(r.nombre) + "</span><strong>" + r.kg + " kg</strong></div>";
        }).join("");

  // Calendario y logro
  dibujarCalendario();

  const racha = calcularRacha();
  const logro = document.getElementById("logro");
  if (racha >= 7) {
    logro.innerHTML = '<span class="logro__icono">🛡️</span><div><h3>Constante</h3><p class="gris">Entrena 7 días seguidos</p></div>';
  } else {
    logro.innerHTML = '<span class="logro__icono apagado">🛡️</span><div><h3>Sin logros todavía</h3><p class="gris">Entrena 7 días seguidos para desbloquear Constante. Llevas ' + racha + "</p></div>";
  }

  // Historial
  const historial = document.getElementById("historial");
  if (sesiones.length === 0) {
    historial.innerHTML = '<p class="vacio">Todavía no registras entrenamientos</p>';
    return;
  }

  const ordenadas = sesiones.slice().sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha);
  }).slice(0, 20);

  historial.innerHTML = ordenadas.map(function (s) {
    const nombres = s.ejercicios.map(function (e) {
      return limpiar(e.nombre);
    }).join(", ");
    return '<div class="sesion"><div><strong>' + fechaCorta(s.fecha) + '</strong><p class="gris">' + s.minutos + " min · " + (nombres || "Sin ejercicios") + '</p></div><button class="quitar" data-id="' + s.id + '">🗑</button></div>';
  }).join("");

  historial.querySelectorAll(".quitar").forEach(function (boton) {
    boton.addEventListener("click", function () {
      if (confirm("¿Borrar este entrenamiento?")) {
        sesiones = sesiones.filter(function (s) {
          return s.id !== Number(boton.dataset.id);
        });
        guardarSesiones();
        dibujarProgreso();
      }
    });
  });
}

// ---- Formulario para registrar entrenamientos a mano ----
const formSesion = document.getElementById("form-sesion");
const panelProgreso = document.getElementById("panel-progreso");
const fsFecha = document.getElementById("fs-fecha");
const fsMinutos = document.getElementById("fs-minutos");
const fsLista = document.getElementById("fs-lista");

function agregarFilaSesion() {
  const fila = document.createElement("div");
  fila.className = "fila-ejercicio";
  fila.innerHTML =
    '<input type="text" class="f-nombre" placeholder="Ejercicio">' +
    '<input type="number" class="f-kg" placeholder="kg">' +
    '<input type="number" class="f-reps" placeholder="reps">' +
    '<button class="quitar">🗑</button>';

  fila.querySelector(".quitar").addEventListener("click", function () {
    fila.remove();
  });

  fsLista.appendChild(fila);
}

function abrirFormSesion() {
  fsFecha.value = textoFecha(new Date());
  fsMinutos.value = "";
  fsLista.innerHTML = "";
  agregarFilaSesion();
  panelProgreso.hidden = true;
  formSesion.hidden = false;
}

function cerrarFormSesion() {
  formSesion.hidden = true;
  panelProgreso.hidden = false;
}

document.getElementById("btn-registrar").addEventListener("click", abrirFormSesion);
document.getElementById("fs-agregar").addEventListener("click", agregarFilaSesion);
document.getElementById("fs-cancelar").addEventListener("click", cerrarFormSesion);

document.getElementById("fs-guardar").addEventListener("click", function () {
  if (fsFecha.value === "") {
    alert("Elige la fecha");
    return;
  }

  const minutos = Number(fsMinutos.value) || 0;
  const ejercicios = [];

  fsLista.querySelectorAll(".fila-ejercicio").forEach(function (fila) {
    const nombre = fila.querySelector(".f-nombre").value.trim();
    const kg = Number(fila.querySelector(".f-kg").value) || 0;
    const reps = Number(fila.querySelector(".f-reps").value) || 0;
    if (nombre !== "") {
      ejercicios.push({ nombre: nombre, kg: kg, reps: reps });
    }
  });

  if (minutos === 0 && ejercicios.length === 0) {
    alert("Agrega la duración o al menos un ejercicio");
    return;
  }

  sesiones.push({
    id: Date.now(),
    fecha: fsFecha.value,
    minutos: minutos,
    ejercicios: ejercicios
  });

  guardarSesiones();
  cerrarFormSesion();
  dibujarProgreso();
});

selRango.addEventListener("change", dibujarProgreso);
selEjercicio.addEventListener("change", dibujarProgreso);

dibujarProgreso();

// =====================================================
// 5. INICIO: la rutina que toca hoy
// =====================================================
function dibujarResumen() {
  // Fecha del lunes de esta semana
  const lunes = new Date();
  lunes.setDate(lunes.getDate() - hoy);
  const desde = textoFecha(lunes);
  const hasta = textoFecha(new Date());

  const diasEntrenados = {};
  let minutos = 0;

  sesiones.forEach(function (s) {
    if (s.fecha >= desde && s.fecha <= hasta) {
      diasEntrenados[s.fecha] = true;
      minutos += s.minutos;
    }
  });

  const hechos = Object.keys(diasEntrenados).length;
  const planeados = rutinas.filter(function (r) {
    return r !== null;
  }).length;
  const porcentaje = planeados === 0 ? 0 : Math.min(100, Math.round((hechos / planeados) * 100));

  document.getElementById("semana-texto").textContent = hechos + " / " + planeados;
  document.getElementById("anillo-semana").style.setProperty("--porcentaje", porcentaje);
  document.getElementById("semana-tiempo").textContent = formatoTiempo(minutos);

  const racha = calcularRacha();
  const textoRacha = racha + (racha === 1 ? " día" : " días");
  document.getElementById("inicio-racha").textContent = textoRacha;
  document.getElementById("menu-racha").textContent = textoRacha;
}

function dibujarInicio() {
  dibujarResumen();
  const titulo = document.getElementById("inicio-rutina");
  const detalleDia = document.getElementById("inicio-dia");
  const subtituloEntrenar = document.getElementById("entrenar-rutina");

  if (rutinas[hoy] !== null) {
    titulo.textContent = rutinas[hoy].nombre;
    detalleDia.textContent = "Hoy";
    subtituloEntrenar.textContent = rutinas[hoy].nombre;
    return;
  }

  subtituloEntrenar.textContent = "Sin rutina hoy";

  for (let i = 1; i <= 6; i++) {
    const indice = (hoy + i) % 7;
    if (rutinas[indice] !== null) {
      titulo.textContent = rutinas[indice].nombre;
      detalleDia.textContent = i === 1 ? "Mañana" : nombresDias[indice];
      return;
    }
  }

  titulo.textContent = "Sin rutinas";
  detalleDia.textContent = "Crea una en Rutinas";
}

dibujarInicio();

// =====================================================
// 6. ENTRENAR: la rutina de hoy
// =====================================================
const listaEntrenar = document.getElementById("entrenar-lista");
const botonTerminar = document.getElementById("btn-terminar");
let inicioEntreno = null;

function guardarEnCurso() {
  const series = [];

  listaEntrenar.querySelectorAll(".serie").forEach(function (fila) {
    series.push({
      kg: fila.querySelector(".s-kg").value,
      reps: fila.querySelector(".s-reps").value,
      lista: fila.classList.contains("lista")
    });
  });

  localStorage.setItem("entreno_en_curso", JSON.stringify({
    fecha: textoFecha(new Date()),
    rutina: rutinas[hoy].nombre,
    inicio: inicioEntreno,
    series: series
  }));
}

function restaurarEnCurso() {
  const guardado = JSON.parse(localStorage.getItem("entreno_en_curso"));

  if (
    guardado === null ||
    guardado.fecha !== textoFecha(new Date()) ||
    guardado.rutina !== rutinas[hoy].nombre
  ) {
    return;
  }

  const filas = listaEntrenar.querySelectorAll(".serie");

  guardado.series.forEach(function (s, i) {
    if (filas[i] === undefined) {
      return;
    }
    filas[i].querySelector(".s-kg").value = s.kg;
    filas[i].querySelector(".s-reps").value = s.reps;
    if (s.lista) {
      filas[i].classList.add("lista");
    }
  });

  inicioEntreno = guardado.inicio;
}

function dibujarEntrenar() {
  const rutina = rutinas[hoy];
  inicioEntreno = null;

  if (rutina === null || rutina.ejercicios.length === 0) {
    listaEntrenar.innerHTML = '<div class="tarjeta"><p class="vacio">Hoy no tienes una rutina con ejercicios. Crea una en la sección Rutinas.</p></div>';
    botonTerminar.hidden = true;
    return;
  }

  botonTerminar.hidden = false;
  let html = "";

  rutina.ejercicios.forEach(function (e, i) {
    const partes = String(e.series).toLowerCase().split("x");
    const cantidad = Math.min(partes.length > 1 ? parseInt(partes[0]) || 3 : 3, 10);

    let filas = "";
    for (let n = 1; n <= cantidad; n++) {
      filas +=
        '<div class="serie"><span>Serie ' + n + "</span>" +
        '<input type="number" class="s-kg" placeholder="kg">' +
        '<input type="number" class="s-reps" placeholder="reps">' +
        '<button class="check">✓</button></div>';
    }

    html +=
      '<div class="tarjeta ej-entreno" data-i="' + i + '">' +
      '<p class="etiqueta-t">EJERCICIO ' + (i + 1) + " DE " + rutina.ejercicios.length + "</p>" +
      "<h2>" + limpiar(e.nombre) + "</h2>" +
      '<p class="gris">Objetivo: ' + limpiar(e.series) + "</p>" +
      filas +
      "</div>";
  });

  listaEntrenar.innerHTML = html;
  restaurarEnCurso();
}

// Guarda cada vez que escribes kg o reps
listaEntrenar.addEventListener("input", guardarEnCurso);

// Guarda cada vez que marcas o desmarcas una serie
listaEntrenar.addEventListener("click", function (evento) {
  const boton = evento.target.closest(".check");
  if (boton === null) {
    return;
  }

  boton.parentElement.classList.toggle("lista");

  if (inicioEntreno === null) {
    inicioEntreno = Date.now();
  }

  guardarEnCurso();
});

botonTerminar.addEventListener("click", function () {
  const rutina = rutinas[hoy];
  const ejercicios = [];

  listaEntrenar.querySelectorAll(".ej-entreno").forEach(function (tarjeta) {
    const nombre = rutina.ejercicios[Number(tarjeta.dataset.i)].nombre;
    let mejorKg = 0;
    let repsDelMejor = 0;
    let hizoAlguna = false;

    tarjeta.querySelectorAll(".serie.lista").forEach(function (fila) {
      const kg = Number(fila.querySelector(".s-kg").value) || 0;
      const reps = Number(fila.querySelector(".s-reps").value) || 0;
      hizoAlguna = true;

      if (kg > mejorKg || (kg === mejorKg && reps > repsDelMejor)) {
        mejorKg = kg;
        repsDelMejor = reps;
      }
    });

    if (hizoAlguna) {
      ejercicios.push({ nombre: nombre, kg: mejorKg, reps: repsDelMejor });
    }
  });

  if (ejercicios.length === 0) {
    alert("Marca con ✓ al menos una serie");
    return;
  }

  const inicio = inicioEntreno || Date.now();
  const minutos = Math.max(1, Math.round((Date.now() - inicio) / 60000));

  sesiones.push({
    id: Date.now(),
    fecha: textoFecha(new Date()),
    minutos: minutos,
    ejercicios: ejercicios
  });

  guardarSesiones();
  localStorage.removeItem("entreno_en_curso");
  dibujarProgreso();
  dibujarEntrenar();
  alert("¡Entrenamiento guardado! Fueron " + minutos + " min.");
});

dibujarEntrenar();

// Botón "Comenzar entrenamiento" de Inicio
const btnComenzar = document.getElementById("btn-comenzar");
if (btnComenzar !== null) {
  btnComenzar.addEventListener("click", function () {
    document.querySelector('.menu a[href="#entrenar"]').click();
  });
}

// =====================================================
// 7. SERVICE WORKER (para poder instalar la app)
// =====================================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
