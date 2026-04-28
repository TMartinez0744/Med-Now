import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { showToast } from "../lib/toast";

const GENEROS = ["Femenino", "Masculino", "No binario"] as const;
type Genero = typeof GENEROS[number];

function PatientRegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dni, setDni] = useState("");
    const [email, setEmail] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [genero, setGenero] = useState<Genero | "">("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const dniRegex = /^\d{7,8}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!name || !lastName || !dni || !email || !fechaNacimiento || !genero || !password || !confirmPassword) {
            showToast("Completá todos los campos");
            return;
        }

        if (!dniRegex.test(dni)) {
            showToast("El DNI debe tener 7 u 8 números");
            return;
        }

        if (!emailRegex.test(email)) {
            showToast("El email no es válido");
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
            const response = await fetch("http://localhost:3000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dni,
                    password,
                    nombre_apellido: `${name} ${lastName}`.trim(),
                    tipo_usuario: "paciente",
                    genero,
                    fecha_nacimiento: fechaNacimiento,
                    email,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                showToast("Error: " + result.message);
                return;
            }

            showToast("Registro exitoso", "success");
            navigate("/login/patient");
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
                            inputMode="numeric"
                            value={dni}
                            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                            placeholder="DNI"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-email" className="auth-label">Email</label>
                        <input
                            id="patient-email"
                            className="auth-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ejemplo@mail.com"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="patient-nacimiento" className="auth-label">Fecha de nacimiento</label>
                        <input
                            id="patient-nacimiento"
                            className="auth-input"
                            type="date"
                            value={fechaNacimiento}
                            onChange={(e) => setFechaNacimiento(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label">Género</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                            {GENEROS.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGenero(g)}
                                    style={{
                                        padding: "9px 18px",
                                        borderRadius: 10,
                                        border: genero === g ? "2px solid #2f5cf5" : "1.5px solid #e5e7eb",
                                        background: genero === g ? "#eef3ff" : "white",
                                        color: genero === g ? "#2f5cf5" : "#374151",
                                        fontWeight: genero === g ? 700 : 500,
                                        fontSize: 14,
                                        cursor: "pointer",
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
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
                        <label htmlFor="patient-confirm-password" className="auth-label">Confirmar contraseña</label>
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
