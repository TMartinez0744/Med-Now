import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { showToast } from "../lib/toast";

function PatientLoginPage() {
    const navigate = useNavigate();

    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const dniRegex = /^\d{7,8}$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!dni || !password) {
            showToast("Completá todos los campos");
            return;
        }

        if (!dniRegex.test(dni)) {
            showToast("El DNI debe tener 7 u 8 números");
            return;
        }

        if (!passwordRegex.test(password)) {
            showToast("La contraseña debe tener al menos 8 caracteres, una letra y un número");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/api/auth/login", {
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
                showToast("Error: " + result.message);
                return;
            }

            // Limpiar cualquier sesión previa de otro rol
            localStorage.removeItem("doctorData");

            // Guardar token y datos del paciente
            localStorage.setItem("token", result.token);
            localStorage.setItem("user", dni);
            const nombreCompleto: string = result.user?.nombre_apellido ?? "";
            const partes = nombreCompleto.trim().split(" ");
            localStorage.setItem(
                "patientData",
                JSON.stringify({
                    id: result.user?.id ?? "",
                    dni,
                    name: partes[0] ?? "",
                    lastName: partes.slice(1).join(" ") ?? "",
                    nombre_apellido: nombreCompleto,
                })
            );

            navigate("/patient/dashboard");
        } catch (error) {
            console.error(error);
            showToast("Algo salió mal. Intentá de nuevo.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">+</div>

                <h1 className="auth-title">MedNow</h1>

                <form className="auth-form" onSubmit={handleSubmit}>
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

                    <button type="submit" className="auth-button">
                        Iniciar Sesión
                    </button>
                </form>

                <p className="auth-register-text">
                    ¿No tienes una cuenta?{" "}
                    <Link to="/register/patient" className="auth-register-link">
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

export default PatientLoginPage;