import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function PatientLoginPage() {
    const navigate = useNavigate();

    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!dni || !password) {
            alert("Completá todos los campos");
            return;
        }

        navigate("/patient/dashboard");
    };

    return (
        <div>
            <h1>Login Paciente</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>DNI</label>
                    <br />
                    <input
                        type="text"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="Ingresá tu DNI"
                    />
                </div>

                <br />

                <div>
                    <label>Contraseña</label>
                    <br />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ingresá tu contraseña"
                    />
                </div>

                <br />

                <button type="submit">Iniciar sesión</button>
            </form>

            <br />

            <Link to="/register/patient">
                <button>Ir a registro</button>
            </Link>

            <br />
            <br />

            <Link to="/">
                <button>Volver</button>
            </Link>
        </div>
    );
}

export default PatientLoginPage;