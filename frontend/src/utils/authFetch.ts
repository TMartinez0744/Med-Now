// src/utils/authFetch.ts

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("token");
    
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const newOptions: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(url, newOptions);

    if (response.status === 401) {
        // Redirigir porque el token es inválido o expiró
        try {
            const data = await response.clone().json();
            if (data.code === 'TOKEN_EXPIRED' || !token) {
                // Limpiar local storage
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("doctorData");
                localStorage.removeItem("patientData");
                
                // Redirigir
                window.location.href = "/";
            }
        } catch (e) {
            console.error("Error al parsear error de autenticación");
        }
    }

    return response;
}
