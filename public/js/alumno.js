const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario || usuario.rol !== "alumno") {
  window.location.href = "index.html";
}

document.getElementById("nombreAlumno").textContent =
  `Bienvenido: ${usuario.nombre}`;

let seguimientoActivo = false;
let seguimientoActualId = null;

let ultimaUbicacion = {
  latitud: null,
  longitud: null,
  precision: null,
};

function obtenerUbicacionSimuladaPorAlumno() {
  const ubicacionesDemo = {
    2: {
      latitud: -16.398866,
      longitud: -71.536961,
      precision: 30,
    },
    3: {
      latitud: -16.399850,
      longitud: -71.534620,
      precision: 30,
    },
    4: {
      latitud: -16.397720,
      longitud: -71.538150,
      precision: 30,
    },
  };

  return ubicacionesDemo[usuario.id] || {
    latitud: -16.398866,
    longitud: -71.536961,
    precision: 50,
  };
}

function obtenerUbicacionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("El navegador no permite geolocalización.");
      resolve(obtenerUbicacionSimuladaPorAlumno());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn("No se pudo obtener ubicación real:", error);

        alert(
          "No se pudo obtener la ubicación real. Para la simulación se usará una ubicación aproximada de prueba."
        );

        resolve(obtenerUbicacionSimuladaPorAlumno());
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function formatearCodigoSeguimiento(id) {
  return `SAF-${String(id).slice(-5)}`;
}

async function activarSeguimiento() {
  const ruta = document.getElementById("ruta").value;
  const ubicacion = document.getElementById("ubicacion").value;

  document.getElementById("estadoSeguimiento").textContent =
    "Obteniendo ubicación y activando seguimiento...";

  ultimaUbicacion = await obtenerUbicacionActual();

  try {
    const respuesta = await fetch("/api/seguimiento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alumnoId: usuario.id,
        nombre: usuario.nombre,
        ruta,
        ubicacion,
        latitud: ultimaUbicacion.latitud,
        longitud: ultimaUbicacion.longitud,
        precision: ultimaUbicacion.precision,
      }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      alert(data.mensaje || "No se pudo activar el seguimiento");
      return;
    }

    seguimientoActivo = true;
    seguimientoActualId = data.seguimiento.id;

    document.getElementById("estadoSeguimiento").textContent =
      `Seguimiento activo. Código: ${formatearCodigoSeguimiento(seguimientoActualId)}`;

    alert("Seguimiento activado. El administrador ya puede monitorear este trayecto.");
  } catch (error) {
    console.error("Error al activar seguimiento:", error);
    alert("Error de conexión con el servidor");
  }
}

async function activarSOS() {
  if (!seguimientoActivo || !seguimientoActualId) {
    const confirmar = confirm(
      "No tienes seguimiento activo. ¿Deseas activar una alerta SOS sin seguimiento asociado?"
    );

    if (!confirmar) return;
  }

  const ruta = document.getElementById("ruta").value;
  const ubicacion = document.getElementById("ubicacion").value;

  document.getElementById("estadoSeguimiento").textContent =
    "Obteniendo ubicación y enviando alerta SOS...";

  ultimaUbicacion = await obtenerUbicacionActual();

  try {
    const respuesta = await fetch("/api/alerta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alumnoId: usuario.id,
        nombre: usuario.nombre,
        ruta,
        ubicacion,
        seguimientoId: seguimientoActualId,
        latitud: ultimaUbicacion.latitud,
        longitud: ultimaUbicacion.longitud,
        precision: ultimaUbicacion.precision,
      }),
    });

    const data = await respuesta.json();

    if (respuesta.ok) {
      document.getElementById("estadoSeguimiento").textContent =
        "Alerta SOS enviada. Seguridad universitaria está en seguimiento.";

      alert("Alerta SOS enviada al panel del administrador.");
    } else {
      alert(data.mensaje || "No se pudo enviar la alerta");
    }
  } catch (error) {
    console.error("Error al enviar SOS:", error);
    alert("Error de conexión con el servidor");
  }
}

async function confirmarLlegada() {
  if (!seguimientoActivo || !seguimientoActualId) {
    alert("No existe un seguimiento activo para confirmar llegada.");
    return;
  }

  try {
    const respuesta = await fetch(`/api/seguimiento/${seguimientoActualId}/llegada`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      alert(data.mensaje || "No se pudo confirmar la llegada");
      return;
    }

    seguimientoActivo = false;

    document.getElementById("estadoSeguimiento").textContent =
      "Llegada segura confirmada. Puedes iniciar un nuevo seguimiento si lo necesitas.";

    seguimientoActualId = null;

    alert("Llegada segura confirmada. El administrador ya puede verlo en el historial.");
  } catch (error) {
    console.error("Error al confirmar llegada:", error);
    alert("Error de conexión con el servidor");
  }
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
}

