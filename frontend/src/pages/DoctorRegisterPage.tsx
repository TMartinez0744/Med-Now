import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { showToast } from "../lib/toast";
import { BASE_URL } from "../lib/api";

function DoctorRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [licenseType, setLicenseType] = useState("MN");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        const fullLicense = `${licenseType} ${licenseNumber.trim()}`;

        if (!name || !lastName || !licenseNumber.trim() || !password || !confirmPassword) {
            showToast("Completá todos los campos");
            return;
        }

        if (!/^\d{4,8}$/.test(licenseNumber.trim())) {
            showToast("Ingresá solo el número de matrícula (4 a 8 dígitos)");
            return;
        }

        if (!passwordRegex.test(password)) {
            showToast("La contraseña debe tener al menos 8 caracteres, una letra y un número");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Las contraseñas no coinciden");
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    dni: fullLicense,
                    password,
                    nombre_apellido: `${name} ${lastName}`.trim(),
                    tipo_usuario: "medico",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                showToast("Error: " + result.message);
                return;
            }

            // 🔥 guardamos datos para el dashboard
            localStorage.setItem(
                "doctorData",
                JSON.stringify({
                    name,
                    lastName,
                    licenseNumber: fullLicense,
                })
            );

            localStorage.setItem("user", fullLicense);

            showToast("Registro exitoso", "success");
            navigate("/login/doctor");

        } catch (error) {
            console.error(error);
            showToast("Algo salió mal. Intentá de nuevo.");
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
                                id="doctor-license"
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