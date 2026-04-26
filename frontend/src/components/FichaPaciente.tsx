import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
    pacienteId: string;
    nombrePaciente?: string;
    onClose: () => void;
}

interface FichaData {
    nombre_apellido: string;
    dni: string;
    obra_social: string | null;
    condiciones: { id: number; label: string }[];
    alergias: { id: number; label: string }[];
}

function FichaPaciente({ pacienteId, nombrePaciente, onClose }: Props) {
    const [ficha, setFicha] = useState<FichaData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const [{ data: profile }, { data: paciente }] = await Promise.all([
                supabase.from("profiles").select("nombre_apellido, dni").eq("id", pacienteId).single(),
                supabase.from("pacientes").select("obra_social, ficha_medica").eq("id", pacienteId).single(),
            ]);

            const fm = paciente?.ficha_medica as any;
            setFicha({
                nombre_apellido: profile?.nombre_apellido ?? nombrePaciente ?? "Paciente",
                dni: profile?.dni ?? "-",
                obra_social: paciente?.obra_social ?? null,
                condiciones: fm?.condiciones ?? [],
                alergias: fm?.alergias ?? [],
            });
            setLoading(false);
        };
        fetch();
    }, [pacienteId]);

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Ficha del paciente</h3>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>

                {loading ? (
                    <p style={{ textAlign: "center", color: "#6b7280", padding: "24px 0" }}>Cargando...</p>
                ) : ficha && (
                    <>
                        {/* Header */}
                        <div style={{ background: "#f0f4ff", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                {ficha.nombre_apellido}
                            </p>
                            <p style={{ margin: "0 0 2px", fontSize: 13, color: "#6b7280" }}>DNI: {ficha.dni}</p>
                            {ficha.obra_social && (
                                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>🛡 {ficha.obra_social}</p>
                            )}
                        </div>

                        {/* Condiciones */}
                        <div style={{ marginBottom: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Condiciones</span>
                            </div>
                            {ficha.condiciones.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin condiciones registradas</p>
                            ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {ficha.condiciones.map((c) => (
                                        <span key={c.id} style={chipStyle("#fee2e2", "#b91c1c")}>{c.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Alergias */}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Alergias</span>
                            </div>
                            {ficha.alergias.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin alergias registradas</p>
                            ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {ficha.alergias.map((a) => (
                                        <span key={a.id} style={chipStyle("#fef3c7", "#b45309")}>{a.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const chipStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: 999, fontSize: 13,
    background: bg, color, fontWeight: 500,
});

const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 20,
};

const modalStyle: React.CSSProperties = {
    background: "white", width: "100%", maxWidth: 480,
    borderRadius: 24, padding: "24px 20px 32px",
    maxHeight: "85vh", overflowY: "auto",
};

const closeBtnStyle: React.CSSProperties = {
    background: "none", border: "none", fontSize: 18,
    cursor: "pointer", color: "#6b7280",
};

export default FichaPaciente;
