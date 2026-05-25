const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario || usuario.rol !== "admin") {
  window.location.href = "index.html";
}

const socket = io();

let mapa = null;
let marcadores = [];
let marcadorAdmin = null;
let seguimientosGlobales = [];

const coloresAlumnos = {
  2: "#0d6efd", // Alumno 1 - azul
  3: "#6f42c1", // Alumno 2 - morado
  4: "#fd7e14", // Alumno 3 - naranja
};

inicializarMapa();

socket.on("actualizar-alertas", (alertas) => {
  renderizarAlertas(alertas);
});

socket.on("actualizar-seguimientos", (seguimientos) => {
  seguimientosGlobales = seguimientos;
  renderizarSeguimientos(seguimientos);
  renderizarHistorialSeguimientos(seguimientos);
  actualizarMapa(seguimientos);
});

socket.on("nueva-alerta", (alerta) => {
  alert(`Nueva alerta SOS de ${alerta.nombre}`);
});

function inicializarMapa() {
  mapa = L.map("mapaSeguimiento").setView([-16.3989, -71.535], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(mapa);
}

async function cargarDatos() {
  try {
    const respuestaAlertas = await fetch("/api/alertas");
    const alertas = await respuestaAlertas.json();

    const respuestaSeguimientos = await fetch("/api/seguimientos");
    const seguimientos = await respuestaSeguimientos.json();

    seguimientosGlobales = seguimientos;

    renderizarAlertas(alertas);
    renderizarSeguimientos(seguimientos);
    renderizarHistorialSeguimientos(seguimientos);
    actualizarMapa(seguimientos);
  } catch (error) {
    console.error("Error al cargar datos:", error);
    alert("No se pudieron cargar los datos del panel");
  }
}

function renderizarSeguimientos(seguimientos) {
  const lista = document.getElementById("listaSeguimientos");

  const activos = seguimientos.filter((s) => s.estado !== "LLEGÓ SEGURO");

  const total = activos.length;
  const riesgo = activos.filter((s) => s.estado === "SOS ACTIVADO").length;
  const finalizados = seguimientos.filter(
    (s) => s.estado === "LLEGÓ SEGURO"
  ).length;

  document.getElementById("totalSeguimientos").textContent = total;
  document.getElementById("seguimientosRiesgo").textContent = riesgo;
  document.getElementById("seguimientosFinalizados").textContent = finalizados;

  lista.innerHTML = "";

  if (activos.length === 0) {
    lista.innerHTML = `<p class="text-muted">No hay estudiantes en seguimiento activo.</p>`;
    return;
  }

  activos.forEach((seguimiento) => {
    lista.appendChild(crearTarjetaSeguimiento(seguimiento, true));
  });
}

function renderizarHistorialSeguimientos(seguimientos) {
  const contenedor = document.getElementById("historialSeguimientos");

  if (!contenedor) return;

  const finalizados = seguimientos.filter((s) => s.estado === "LLEGÓ SEGURO");

  contenedor.innerHTML = "";

  if (finalizados.length === 0) {
    contenedor.innerHTML = `<p class="text-muted">Todavía no hay recorridos finalizados.</p>`;
    return;
  }

  finalizados.forEach((seguimiento) => {
    contenedor.appendChild(crearTarjetaSeguimiento(seguimiento, false));
  });
}

function crearTarjetaSeguimiento(seguimiento, mostrarAccionMapa) {
  const card = document.createElement("div");

  card.className =
    seguimiento.estado === "SOS ACTIVADO"
      ? "alert-card active"
      : seguimiento.estado === "LLEGÓ SEGURO"
      ? "alert-card attended"
      : "alert-card tracking";

  card.style.borderLeftColor = obtenerColorMarcador(seguimiento);

  const colorAlumno = obtenerColorAlumno(seguimiento);

  const coordenadasTexto =
    seguimiento.latitud && seguimiento.longitud
      ? `${Number(seguimiento.latitud).toFixed(6)}, ${Number(
          seguimiento.longitud
        ).toFixed(6)}`
      : "Sin coordenadas reales";

  card.innerHTML = `
    <div class="alert-content">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h3 class="h5 mb-0">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${colorAlumno};margin-right:8px;"></span>
          ${seguimiento.nombre}
        </h3>

        <span class="badge ${obtenerClaseSeguimiento(seguimiento.estado)}">
          ${seguimiento.estado}
        </span>
      </div>

      <p class="mb-1"><strong>Ruta / punto de llegada:</strong> ${seguimiento.ruta}</p>
      <p class="mb-1"><strong>Ubicación escrita:</strong> ${seguimiento.ubicacion}</p>
      <p class="mb-1"><strong>Coordenadas:</strong> ${coordenadasTexto}</p>
      <p class="mb-1"><strong>Precisión:</strong> ${
        seguimiento.precision
          ? `${Math.round(seguimiento.precision)} metros`
          : "No disponible"
      }</p>
      <p class="mb-1"><strong>Fecha de salida:</strong> ${seguimiento.fechaSalida}</p>
      <p class="mb-1"><strong>Hora de salida:</strong> ${seguimiento.horaSalida}</p>
      <p class="mb-3"><strong>Hora de llegada:</strong> ${
        seguimiento.horaLlegada || "Pendiente"
      }</p>

      ${
        mostrarAccionMapa
          ? `<button class="btn btn-outline-primary btn-sm" onclick="verEnMapa(${seguimiento.id})">
              Ver en mapa
            </button>`
          : `<button class="btn btn-outline-secondary btn-sm" onclick="verEnMapa(${seguimiento.id})">
              Ver ubicación final
            </button>`
      }
    </div>
  `;

  return card;
}

function renderizarAlertas(alertas) {
  const lista = document.getElementById("listaAlertas");

  const total = alertas.length;
  const activas = alertas.filter((a) => a.estado === "ACTIVA").length;
  const atendidas = alertas.filter((a) => a.estado === "ATENDIDA").length;

  document.getElementById("totalAlertas").textContent = total;
  document.getElementById("alertasActivas").textContent = activas;
  document.getElementById("alertasAtendidas").textContent = atendidas;

  lista.innerHTML = "";

  if (alertas.length === 0) {
    lista.innerHTML = `<p class="text-muted">No hay alertas registradas.</p>`;
    return;
  }

  alertas.forEach((alerta) => {
    const card = document.createElement("div");

    card.className =
      alerta.estado === "ACTIVA"
        ? "alert-card active"
        : alerta.estado === "ATENDIDA"
        ? "alert-card attended"
        : "alert-card tracking";

    card.innerHTML = `
      <div class="alert-content">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h3 class="h5 mb-0">${alerta.tipo} - ${alerta.estado}</h3>
          <span class="badge ${obtenerClaseAlerta(alerta.estado)}">${alerta.estado}</span>
        </div>

        <p class="mb-1"><strong>Alumno:</strong> ${alerta.nombre}</p>
        <p class="mb-1"><strong>Ruta:</strong> ${alerta.ruta}</p>
        <p class="mb-1"><strong>Ubicación:</strong> ${alerta.ubicacion}</p>
        <p class="mb-1"><strong>Fecha:</strong> ${alerta.fecha}</p>
        <p class="mb-0"><strong>Hora:</strong> ${alerta.hora}</p>
      </div>

      <div class="alert-actions">
        <button class="btn btn-warning btn-sm" onclick="actualizarEstado(${alerta.id}, 'EN SEGUIMIENTO')">
          En seguimiento
        </button>

        <button class="btn btn-success btn-sm" onclick="actualizarEstado(${alerta.id}, 'ATENDIDA')">
          Marcar atendida
        </button>

        <button class="btn btn-secondary btn-sm" onclick="eliminarAlerta(${alerta.id})">
          Eliminar
        </button>
      </div>
    `;

    lista.appendChild(card);
  });
}

function actualizarMapa(seguimientos) {
  marcadores.forEach((marker) => {
    mapa.removeLayer(marker);
  });

  marcadores = [];

  const seguimientosConCoordenadas = seguimientos.filter(
    (s) => s.latitud && s.longitud
  );

  if (seguimientosConCoordenadas.length === 0) {
    return;
  }

  seguimientosConCoordenadas.forEach((seguimiento) => {
    const latOriginal = Number(seguimiento.latitud);
    const lngOriginal = Number(seguimiento.longitud);

    const coordenadasVisuales = obtenerCoordenadasVisuales(
      latOriginal,
      lngOriginal,
      seguimiento.alumnoId
    );

    const color = obtenerColorMarcador(seguimiento);

    const marker = L.circleMarker(
      [coordenadasVisuales.lat, coordenadasVisuales.lng],
      {
        radius: seguimiento.estado === "SOS ACTIVADO" ? 14 : 10,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 3,
      }
    ).addTo(mapa);

    marker.seguimientoId = seguimiento.id;

    marker.bindPopup(crearContenidoPopup(seguimiento));

    marker.on("click", () => {
      marker.openPopup();
    });

    marcadores.push(marker);
  });

  centrarMapaGeneral();
}

function crearContenidoPopup(seguimiento) {
  return `
    <strong>${seguimiento.nombre}</strong><br>
    Estado: ${seguimiento.estado}<br>
    Ruta: ${seguimiento.ruta}<br>
    Ubicación: ${seguimiento.ubicacion}<br>
    Salida: ${seguimiento.horaSalida}<br>
    Llegada: ${seguimiento.horaLlegada || "Pendiente"}<br>
    Precisión: ${
      seguimiento.precision
        ? `${Math.round(seguimiento.precision)} metros`
        : "No disponible"
    }
  `;
}

function verEnMapa(seguimientoId) {
  const seguimiento = seguimientosGlobales.find((s) => s.id === seguimientoId);

  if (!seguimiento || !seguimiento.latitud || !seguimiento.longitud) {
    alert("Este seguimiento no tiene coordenadas disponibles.");
    return;
  }

  const latOriginal = Number(seguimiento.latitud);
  const lngOriginal = Number(seguimiento.longitud);

  const coordenadasVisuales = obtenerCoordenadasVisuales(
    latOriginal,
    lngOriginal,
    seguimiento.alumnoId
  );

  const mapaElemento = document.getElementById("mapaSeguimiento");

  mapaElemento.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  setTimeout(() => {
    mapa.invalidateSize();

    mapa.setView([coordenadasVisuales.lat, coordenadasVisuales.lng], 18);

    const marcador = marcadores.find(
      (m) => m.seguimientoId === seguimientoId
    );

    if (marcador) {
      marcador.openPopup();
      return;
    }

    L.popup()
      .setLatLng([coordenadasVisuales.lat, coordenadasVisuales.lng])
      .setContent(crearContenidoPopup(seguimiento))
      .openOn(mapa);
  }, 600);
}

function obtenerCoordenadasVisuales(lat, lng, alumnoId) {
  const desplazamientos = {
    2: { lat: 0.0, lng: 0.0 },
    3: { lat: 0.00008, lng: 0.00008 },
    4: { lat: -0.00008, lng: 0.00008 },
  };

  const desplazamiento = desplazamientos[alumnoId] || {
    lat: 0,
    lng: 0,
  };

  return {
    lat: lat + desplazamiento.lat,
    lng: lng + desplazamiento.lng,
  };
}

function centrarMapaGeneral() {
  if (marcadores.length === 0) {
    mapa.setView([-16.3989, -71.535], 15);
    return;
  }

  const grupo = L.featureGroup(marcadores);
  mapa.fitBounds(grupo.getBounds().pad(0.25));
}

function centrarEnMiUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador no permite obtener la ubicación del administrador.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const precision = Math.round(position.coords.accuracy);

      mapa.setView([lat, lng], 17);

      if (marcadorAdmin) {
        mapa.removeLayer(marcadorAdmin);
      }

      marcadorAdmin = L.circleMarker([lat, lng], {
        radius: 11,
        color: "#111827",
        fillColor: "#111827",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(mapa);

      marcadorAdmin
        .bindPopup(`
          <strong>Ubicación del administrador</strong><br>
          Precisión aproximada: ${precision} metros
        `)
        .openPopup();
    },
    (error) => {
      console.error("No se pudo obtener ubicación del administrador:", error);
      alert("No se pudo obtener tu ubicación. Revisa los permisos del navegador.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

async function limpiarPruebas() {
  const confirmar = confirm(
    "¿Deseas limpiar todas las alertas y seguimientos registrados? Esta acción es solo para pruebas."
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch("/api/limpiar-pruebas", {
      method: "DELETE",
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      alert(data.mensaje || "No se pudo limpiar las pruebas");
      return;
    }

    alert("Pruebas limpiadas correctamente.");
  } catch (error) {
    console.error("Error al limpiar pruebas:", error);
    alert("No se pudo limpiar las pruebas.");
  }
}

function obtenerColorAlumno(seguimiento) {
  return coloresAlumnos[seguimiento.alumnoId] || "#0d6efd";
}

function obtenerColorMarcador(seguimiento) {
  if (seguimiento.estado === "SOS ACTIVADO") return "#dc3545";
  if (seguimiento.estado === "LLEGÓ SEGURO") return "#198754";

  return obtenerColorAlumno(seguimiento);
}

function obtenerClaseSeguimiento(estado) {
  if (estado === "EN RUTA") return "text-bg-primary";
  if (estado === "SOS ACTIVADO") return "text-bg-danger";
  if (estado === "LLEGÓ SEGURO") return "text-bg-success";
  return "text-bg-secondary";
}

function obtenerClaseAlerta(estado) {
  if (estado === "ACTIVA") return "text-bg-danger";
  if (estado === "ATENDIDA") return "text-bg-success";
  if (estado === "EN SEGUIMIENTO") return "text-bg-warning";
  return "text-bg-secondary";
}

async function actualizarEstado(id, estado) {
  try {
    await fetch(`/api/alerta/${id}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ estado }),
    });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    alert("No se pudo actualizar el estado");
  }
}

async function eliminarAlerta(id) {
  const confirmar = confirm("¿Deseas eliminar esta alerta?");

  if (!confirmar) return;

  try {
    await fetch(`/api/alerta/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error al eliminar alerta:", error);
    alert("No se pudo eliminar la alerta");
  }
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
}

cargarDatos();