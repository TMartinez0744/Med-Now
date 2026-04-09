import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorLoginPage() {
    const navigate = useNavigate();

    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const licenseRegex = /^\d{7,8}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!licenseNumber || !password) {
            alert("Completá todos los campos");
            return;
        }

        if (!licenseRegex.test(licenseNumber)) {
            alert("La matrícula debe tener 7 u 8 números");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert("La contraseña debe tener al menos 8 caracteres, una letra y un número");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dni: licenseNumber, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                alert("Error: " + result.message);
                return;
            }

            // Guardar datos del médico en localStorage
            localStorage.setItem("user", licenseNumber);
            localStorage.setItem(
                "doctorData",
                JSON.stringify({
                    id: result.user.id,
                    licenseNumber,
                    nombre_apellido: result.user.nombre_apellido,
                    especialidades: result.user.medico?.especialidades ?? [],
                    sedes: result.user.medico?.sedes ?? [],
                })
            );

            navigate("/doctor/dashboard");
        } catch (error) {
            console.error(error);
            alert("Error al conectar con el backend");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">+</div>

                <h1 className="auth-title">MedNow</h1>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label className="auth-label">Matrícula</label>
                        <input
                            className="auth-input"
                            type="text"
                            value={licenseNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setLicenseNumber(value);
                            }}
                            placeholder="Matrícula"
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label">Contraseña</label>
                        <input
                            className="auth-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                        />
                    </div>

                    <button type="submit" className="auth-button">
                        Iniciar Sesión
                    </button>
                </form>

                <p className="auth-register-text">
                    ¿No tienes una cuenta?{" "}
                    <Link to="/register/doctor" className="auth-register-link">
                        Regístrate
                    </Link>
                </p>

                <Link to="/" className="auth-back-link">
                    ← Volver
                </Link>
            </div>
        </div>
    );
}

export default DoctorLoginPage;