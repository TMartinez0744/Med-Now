import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
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

        try {
            const response = await fetch("http://localhost:3000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dni: licenseNumber,
                    password,
                    nombre_apellido: `${name} ${lastName}`.trim(),
                    tipo_usuario: "medico",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                alert("Error: " + result.message);
                return;
            }

            // 🔥 guardamos datos para el dashboard
            localStorage.setItem(
                "doctorData",
                JSON.stringify({
                    name,
                    lastName,
                    licenseNumber,
                })
            );

            localStorage.setItem("user", licenseNumber);

            alert("Registro exitoso");
            navigate("/login/doctor");

        } catch (error) {
            console.error(error);
            alert("Error al conectar con el backend");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card register-card">
                <div className="auth-logo">+</div>

                <h1 className="auth-title">MedNow</h1>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="doctor-name" className="auth-label">Nombre</label>
                        <input
                            id="doctor-name"
                            className="auth-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="doctor-lastname" className="auth-label">Apellido</label>
                        <input
                            id="doctor-lastname"
                            className="auth-input"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Apellido"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="doctor-license" className="auth-label">Matrícula</label>
                        <input
                            id="doctor-license"
                            className="auth-input"
                            type="text"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            placeholder="Matrícula"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="doctor-register-password" className="auth-label">Contraseña</label>
                        <input
                            id="doctor-register-password"
                            className="auth-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="doctor-confirm-password" className="auth-label">
                            Confirmar contraseña
                        </label>
                        <input
                            id="doctor-confirm-password"
                            className="auth-input"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar contraseña"
                        />
                    </div>

                    <button type="submit" className="auth-button">
                        Registrarse
                    </button>
                </form>

                <p className="auth-register-text">
                    ¿Ya tienes una cuenta?{" "}
                    <Link to="/login/doctor" className="auth-register-link">
                        Inicia sesión
                    </Link>
                </p>

                <Link to="/login/doctor" className="auth-back-link">
                    ← Volver
                </Link>
            </div>
        </div>
    );
}

export default DoctorRegisterPage;