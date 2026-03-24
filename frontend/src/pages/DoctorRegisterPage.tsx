import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const licenseRegex = /^(?:(?:M\.?\s?N\.?)|(?:M\.?\s?P\.?))?\s?\d{4,8}(?:\.\d{3})?$/i;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!name || !lastName || !licenseNumber || !password || !confirmPassword) {
            alert("Completá todos los campos");
            return;
        }

        if (!licenseRegex.test(licenseNumber.trim())) {
            alert("Ingresá una matrícula válida");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert("La contraseña debe tener al menos 8 caracteres, una letra y un número");
            return;
        }

        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        navigate("/doctor/dashboard");
    };

    return (
        <div>
            <h1>Registro Médico</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre</label>
                    <br />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ingresá tu nombre"
                    />
                </div>

                <br />

                <div>
                    <label>Apellido</label>
                    <br />
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ingresá tu apellido"
                    />
                </div>

                <br />

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

                <div>
                    <label>Confirmar contraseña</label>
                    <br />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repetí tu contraseña"
                    />
                </div>

                <br />

                <button type="submit">Registrarse</button>
            </form>

            <br />

            <Link to="/login/doctor">
                <button>Volver al login</button>
            </Link>
        </div>
    );
}

export default DoctorRegisterPage;