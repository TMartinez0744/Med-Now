import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function DoctorLoginPage() {
    const navigate = useNavigate();

    const [licenseType, setLicenseType] = useState("MN");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        const fullLicense = `${licenseType} ${licenseNumber.trim()}`;

        if (!licenseNumber.trim() || !password) {
            alert("Completá todos los campos");
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
                body: JSON.stringify({ dni: fullLicense, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                alert("Error: " + result.message);
                return;
            }

            if (result.user.tipo_usuario !== "medico") {
                alert("Error: Esta cuenta pertenece a un paciente. Por favor, iniciá sesión en el portal de pacientes.");
                return;
            }

            // Limpiar sesión previa de paciente
            localStorage.removeItem("patientData");

            // Guardar token JWT
            if (result.token) {
                localStorage.setItem("token", result.token);
            }

            // Guardar datos del médico en localStorage
            localStorage.setItem("user", fullLicense);
            localStorage.setItem(
                "doctorData",
                JSON.stringify({
                    id: result.user.id,
                    licenseNumber: fullLicense,
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
                        <div style={{ display: "flex", gap: 8 }}>
                            <select
                                value={licenseType}
                                onChange={(e) => setLicenseType(e.target.value)}
                                className="auth-input"
                                style={{ width: 90, flexShrink: 0 }}
                            >
                                <option value="MN">M.N.</option>
                                <option value="MP">M.P.</option>
                            </select>
                            <input
                                className="auth-input"
                                type="text"
                                inputMode="numeric"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value.replace(/\D/g, ""))}
                                placeholder="Número"
                                style={{ flex: 1 }}
                            />
                        </div>
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