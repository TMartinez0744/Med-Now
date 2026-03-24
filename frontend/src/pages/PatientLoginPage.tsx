import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function PatientLoginPage() {
    const navigate = useNavigate();

    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dniRegex = /^\d{7,8}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!dni || !password) {
            alert("Completá todos los campos");
            return;
        }

        if (!dniRegex.test(dni)) {
            alert("El DNI debe tener 7 u 8 números");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert("La contraseña debe tener al menos 8 caracteres, una letra y un número");
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
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setDni(value);
                        }}
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