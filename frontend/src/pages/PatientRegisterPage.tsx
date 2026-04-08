import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function PatientRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const dniRegex = /^\d{7,8}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!name || !lastName || !dni || !password || !confirmPassword) {
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
                    dni,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                alert("Error: " + result.message);
                return;
            }

            localStorage.setItem(
                "patientData",
                JSON.stringify({
                    name,
                    lastName,
                    dni,
                })
            );

            localStorage.setItem("user", dni);

            alert("Registro exitoso");
            navigate("/patient/dashboard");
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
                        <label htmlFor="patient-name" className="auth-label">Nombre</label>
                        <input
                            id="patient-name"
                            className="auth-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-lastname" className="auth-label">Apellido</label>
                        <input
                            id="patient-lastname"
                            className="auth-input"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Apellido"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-dni" className="auth-label">DNI</label>
                        <input
                            id="patient-dni"
                            className="auth-input"
                            type="text"
                            value={dni}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setDni(value);
                            }}
                            placeholder="DNI"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-password" className="auth-label">Contraseña</label>
                        <input
                            id="patient-password"
                            className="auth-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-confirm-password" className="auth-label">
                            Confirmar contraseña
                        </label>
                        <input
                            id="patient-confirm-password"
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
                    <Link to="/login/patient" className="auth-register-link">
                        Inicia sesión
                    </Link>
                </p>

                <Link to="/" className="auth-back-link">
                    ← Volver
                </Link>
            </div>
        </div>
    );
}

export default PatientRegisterPage;