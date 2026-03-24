import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorLoginPage() {
    const navigate = useNavigate();

    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!licenseNumber || !password) {
            alert("Completá todos los campos");
            return;
        }

        navigate("/doctor/dashboard");
    };

    return (
        <div>
            <h1>Login Médico</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Matrícula</label>
                    <br />
                    <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="Ingresá tu matrícula"
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

            <Link to="/register/doctor">
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

export default DoctorLoginPage;