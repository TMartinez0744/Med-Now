const BASE_URL = "http://localhost:3000";

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem("token");
    return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
}
