import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { showToast } from "../lib/toast";
import { supabase } from "../lib/supabase";
import { BASE_URL } from "../lib/api";

function PatientLoginPage() {
    const navigate = useNavigate();

    const [dni, setDni] = useState("");
    const [password, setPassword] = useState("");

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: window.location.origin + "/auth/callback",
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error("Error al iniciar sesión con Google:", error);
            showToast("Error de Google: " + (error.message ?? "Desconocido"));
        }
    };

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
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
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

            if (result.user?.tipo_usuario !== "paciente") {
                showToast("Error: Este DNI no está registrado como paciente");
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
                    foto_url: result.user?.foto_url ?? null,
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

                <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>o continuar con</span>
                    <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    style={{
                        width: "100%",
                        padding: "11px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        background: "white",
                        color: "#374151",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        transition: "0.15s ease",
                        marginBottom: 16
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.8-2.61 2.5v2.08h4.22c2.47-2.24 3.88-5.54 3.88-9.43z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.22-3.27c-1.17.78-2.67 1.25-4.22 1.25-3.25 0-6.01-2.2-7-5.16H.19v3.38C2.18 21.03 6.79 24 12 24z" />
                        <path fill="#FBBC05" d="M5 13.91a8.43 8.43 0 0 1 0-2.82V7.71H.19A11.96 11.96 0 0 0 0 12c0 1.53.28 3 .78 4.38L5 13.91z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 6.79 0 2.18 2.97.19 7.71l4.81 3.73c.99-2.96 3.75-5.16 7-5.16z" />
                    </svg>
                    Google
                </button>

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