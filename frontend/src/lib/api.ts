// URL del backend. En producción se define VITE_API_URL; en local cae a localhost.
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AUTH_FAILED_MESSAGES = ["token inválido", "token expirado", "token requerido"];

function handleAuthFailure() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("patientData");
    localStorage.removeItem("doctorData");

    const path = window.location.pathname;
    if (path.startsWith("/patient")) {
        window.location.replace("/login/patient");
    } else if (path.startsWith("/doctor")) {
        window.location.replace("/login/doctor");
    } else {
        window.location.replace("/");
    }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (response.status === 401 || response.status === 403) {
        const cloned = response.clone();
        try {
            const body = await cloned.json();
            const msg = String(body?.message ?? "").toLowerCase();
            if (AUTH_FAILED_MESSAGES.some((m) => msg.includes(m))) {
                handleAuthFailure();
            }
        } catch {
            // si no es JSON, ignoramos
        }
    }

    return response;
}
