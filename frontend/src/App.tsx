import { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert("Error: " + (result.message || "Algo salió mal"));
      } else {
        alert("Registro exitoso");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el backend");
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert("Error: " + result.message);
      } else {
        localStorage.setItem("user", email);
        alert("Login exitoso");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el backend");
    }
  };

  const usuarioLogueado = localStorage.getItem("user");

  return (
    <div>
      <h1>Registro / Login</h1>

      {usuarioLogueado && <h2>Bienvenida {usuarioLogueado}</h2>}

      <input
        type="email"
        placeholder="Ingresá tu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        type="password"
        placeholder="Ingresá tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleRegister}>Registrar</button>

      <br /><br />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default App;