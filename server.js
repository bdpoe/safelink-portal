const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const usuarios = [
  {
    id: 1,
    nombre: "Administrador",
    correo: "admin@safelink.com",
    password: "123456",
    rol: "admin",
  },
  {
    id: 2,
    nombre: "Alumno Demo 1",
    correo: "alumno1@safelink.com",
    password: "123456",
    rol: "alumno",
  },
  {
    id: 3,
    nombre: "Alumno Demo 2",
    correo: "alumno2@safelink.com",
    password: "123456",
    rol: "alumno",
  },
  {
    id: 4,
    nombre: "Alumno Demo 3",
    correo: "alumno3@safelink.com",
    password: "123456",
    rol: "alumno",
  },
];

// Historial completo
let alertas = [];
let seguimientos = [];

// Login
app.post("/api/login", (req, res) => {
  const { correo, password } = req.body;

  const usuario = usuarios.find(
    (u) => u.correo === correo && u.password === password,
  );

  if (!usuario) {
    return res.status(401).json({
      mensaje: "Credenciales incorrectas",
    });
  }

  res.json({
    mensaje: "Login correcto",
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  });
});

// Activar seguimiento
app.post("/api/seguimiento", (req, res) => {
  const { alumnoId, nombre, ruta, ubicacion, latitud, longitud, precision } =
    req.body;

  const nuevoSeguimiento = {
    id: Date.now(),
    alumnoId,
    nombre,
    ruta: ruta || "Ruta no especificada",
    ubicacion: ubicacion || "Ubicación simulada",
    latitud: latitud || null,
    longitud: longitud || null,
    precision: precision || null,

    estado: "EN RUTA",
    fechaSalida: new Date().toLocaleDateString("es-PE"),
    horaSalida: new Date().toLocaleTimeString("es-PE"),
    horaLlegada: null,
  };

  // Ya no reemplaza seguimientos anteriores.
  // Cada activación queda guardada como historial.
  seguimientos.unshift(nuevoSeguimiento);

  io.emit("actualizar-seguimientos", seguimientos);

  res.json({
    mensaje: "Seguimiento activado correctamente",
    seguimiento: nuevoSeguimiento,
  });
});

// Listar todos los seguimientos
app.get("/api/seguimientos", (req, res) => {
  res.json(seguimientos);
});

// Confirmar llegada segura por ID de seguimiento
app.put("/api/seguimiento/:id/llegada", (req, res) => {
  const { id } = req.params;

  const seguimiento = seguimientos.find((s) => s.id === Number(id));

  if (!seguimiento) {
    return res.status(404).json({
      mensaje: "No se encontró el seguimiento",
    });
  }

  seguimiento.estado = "LLEGÓ SEGURO";
  seguimiento.horaLlegada = new Date().toLocaleTimeString("es-PE");

  io.emit("actualizar-seguimientos", seguimientos);

  res.json({
    mensaje: "Llegada segura confirmada",
    seguimiento,
  });
});

// Crear alerta SOS
app.post("/api/alerta", (req, res) => {
  const {
    alumnoId,
    nombre,
    ruta,
    ubicacion,
    seguimientoId,
    latitud,
    longitud,
    precision,
  } = req.body;

  const nuevaAlerta = {
    id: Date.now(),
    alumnoId,
    seguimientoId: seguimientoId || null,
    nombre,
    ruta: ruta || "Ruta no especificada",
    ubicacion: ubicacion || "Ubicación simulada",
    latitud: latitud || null,
    longitud: longitud || null,
    precision: precision || null,

    estado: "ACTIVA",
    tipo: "SOS",
    fecha: new Date().toLocaleDateString("es-PE"),
    hora: new Date().toLocaleTimeString("es-PE"),
  };

  alertas.unshift(nuevaAlerta);

  // Si el SOS pertenece a un seguimiento activo, actualizamos ese seguimiento
  if (seguimientoId) {
    const seguimiento = seguimientos.find(
      (s) => s.id === Number(seguimientoId),
    );

    if (seguimiento) {
      seguimiento.estado = "SOS ACTIVADO";
      seguimiento.ubicacion = ubicacion || seguimiento.ubicacion;
      seguimiento.latitud = latitud || seguimiento.latitud;
      seguimiento.longitud = longitud || seguimiento.longitud;
      seguimiento.precision = precision || seguimiento.precision;
    }
  }

  io.emit("nueva-alerta", nuevaAlerta);
  io.emit("actualizar-alertas", alertas);
  io.emit("actualizar-seguimientos", seguimientos);

  res.json({
    mensaje: "Alerta enviada correctamente",
    alerta: nuevaAlerta,
  });
});

// Listar alertas
app.get("/api/alertas", (req, res) => {
  res.json(alertas);
});

// Cambiar estado de alerta
app.put("/api/alerta/:id/estado", (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const alerta = alertas.find((a) => a.id === Number(id));

  if (!alerta) {
    return res.status(404).json({
      mensaje: "Alerta no encontrada",
    });
  }

  alerta.estado = estado;

  io.emit("actualizar-alertas", alertas);

  res.json({
    mensaje: "Estado actualizado",
    alerta,
  });
});

// Limpiar todas las pruebas del día
app.delete("/api/limpiar-pruebas", (req, res) => {
  alertas = [];
  seguimientos = [];

  io.emit("actualizar-alertas", alertas);
  io.emit("actualizar-seguimientos", seguimientos);

  res.json({
    mensaje: "Pruebas limpiadas correctamente",
  });
});




// Eliminar alerta
app.delete("/api/alerta/:id", (req, res) => {
  const { id } = req.params;

  alertas = alertas.filter((a) => a.id !== Number(id));

  io.emit("actualizar-alertas", alertas);

  res.json({
    mensaje: "Alerta eliminada",
  });
});

// Tiempo real
io.on("connection", (socket) => {
  console.log("Usuario conectado al sistema");

  socket.emit("actualizar-alertas", alertas);
  socket.emit("actualizar-seguimientos", seguimientos);

  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
