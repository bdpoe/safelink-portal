const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const respuesta = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ correo, password }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      alert(data.mensaje || "No se pudo iniciar sesión");
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    if (data.usuario.rol === "admin") {
      window.location.href = "admin.html";
    } else if (data.usuario.rol === "alumno") {
      window.location.href = "alumno.html";
    } else {
      alert("Rol de usuario no reconocido");
    }
  } catch (error) {
    console.error("Error en login:", error);
    alert("Error de conexión con el servidor");
  }
});

