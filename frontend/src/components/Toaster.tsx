import { useState, useEffect } from "react";

interface Toast {
    id: number;
    message: string;
    type: "error" | "success";
}

function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handler = (e: Event) => {
            const { message, type } = (e as CustomEvent).detail;
            const id = Date.now();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
        };
        window.addEventListener("app-toast", handler);
        return () => window.removeEventListener("app-toast", handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
            width: "calc(100% - 40px)", maxWidth: 420, pointerEvents: "none",
        }}>
            {toasts.map((t) => (
                <div key={t.id} style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 500,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    background: t.type === "error" ? "#fff1f1" : "#f0fdf4",
                    color: t.type === "error" ? "#b91c1c" : "#15803d",
                    border: `1px solid ${t.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                    pointerEvents: "auto",
                    animation: "fadeSlideIn 0.2s ease",
                }}>
                    {t.type === "error" ? "⚠ " : "✓ "}{t.message}
                </div>
            ))}
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default Toaster;
