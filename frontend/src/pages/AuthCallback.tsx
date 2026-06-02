import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { showToast } from "../lib/toast";

function AuthCallback() {
    const navigate = useNavigate();
    const isProcessing = useRef(false);

    useEffect(() => {
        if (isProcessing.current) return;
        isProcessing.current = true;

        const handleAuthCallback = async () => {
            try {
                // Capturar errores en la URL (query params) que envía Supabase si falla el OAuth
                const params = new URLSearchParams(window.location.search);
                const errorName = params.get("error");
                const errorDesc = params.get("error_description");

                if (errorName) {
                    console.error("Error OAuth de Supabase:", errorName, errorDesc);
                    showToast(`Error de Google/Supabase: ${errorDesc || errorName}`);
                    navigate("/login/patient");
                    return;
                }

                // 1. Obtener la sesión activa de Supabase (parsea los tokens de la URL hash automáticamente)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Error al obtener sesión de Supabase:", error);
                    showToast(`Error de sesión: ${error.message}`);
                    navigate("/login/patient");
                    return;
                }

                if (!session) {
                    // Si no hay sesión, podría ser porque ya se procesó en el primer render,
                    // intentamos obtener el usuario actual de Supabase
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: { session: activeSession } } = await supabase.auth.getSession();
                        if (activeSession) {
                            processSession(activeSession);
                            return;
                        }
                    }
                    console.error("No se encontró una sesión activa de Supabase.");
                    showToast("No se pudo iniciar sesión con Google (sesión vacía).");
                    navigate("/login/patient");
                    return;
                }

                processSession(session);
            } catch (err: any) {
                console.error("Error en Auth Callback:", err);
                showToast("Algo salió mal al procesar la sesión.");
                navigate("/login/patient");
            }
        };

        const processSession = async (session: any) => {
            try {
                // 2. Enviar el access_token al backend para validarlo e iniciar sesión en MedNow
                const response = await fetch("http://localhost:3000/api/auth/google-login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        access_token: session.access_token,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    showToast("Error de autenticación: " + (result.message ?? "Desconocido"));
                    navigate("/login/patient");
                    return;
                }

                // Limpiar cualquier sesión previa
                localStorage.removeItem("doctorData");
                localStorage.removeItem("patientData");

                // Guardar token y datos del usuario de MedNow
                localStorage.setItem("token", result.token);
                localStorage.setItem("user", result.user.dni);

                const nombreCompleto = result.user.nombre_apellido ?? "";
                const partes = nombreCompleto.trim().split(" ");

                localStorage.setItem(
                    "patientData",
                    JSON.stringify({
                        id: result.user.id,
                        dni: result.user.dni,
                        name: partes[0] ?? "",
                        lastName: partes.slice(1).join(" ") ?? "",
                        nombre_apellido: nombreCompleto,
                    })
                );

                showToast("Sesión iniciada con Google", "success");
                navigate("/patient/dashboard");
            } catch (err) {
                console.error("Error al procesar sesión en MedNow:", err);
                showToast("Error al conectar con el servidor de MedNow.");
                navigate("/login/patient");
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#f9fafb",
            fontFamily: "Inter, sans-serif"
        }}>
            <div style={{
                width: 50,
                height: 50,
                border: "4px solid #f3f4f6",
                borderTop: "4px solid #2f5cf5",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: 16
            }} />
            <p style={{ color: "#4b5563", fontSize: 16, fontWeight: 500 }}>
                Autenticando sesión...
            </p>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default AuthCallback;
