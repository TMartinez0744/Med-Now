import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorLoginPage() {
    const navigate = useNavigate();

    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const licenseRegex = /^(?:(?:M\.?\s?N\.?)|(?:M\.?\s?P\.?))?\s?\d{4,8}(?:\.\d{3})?$/i;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!licenseNumber || !password) {
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

        navigate("/doctor/dashboard");
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">+</div>

                <h1 className="auth-title">MedNow</h1>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="doctor-license" className="auth-label">
                            Matrícula
                        </label>
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
                        <label htmlFor="doctor-password" className="auth-label">
                            Contraseña
                        </label>
                        <input
                            id="doctor-password"
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