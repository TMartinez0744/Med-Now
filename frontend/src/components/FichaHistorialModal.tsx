import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";
import { formatDoctorName } from "../lib/doctorName";

interface ProfileInfo {
    nombre_apellido: string;
    tipo_usuario: string;
}

interface HistorialItem {
    id: string;
    ficha_anterior: any;
    ficha_nueva: any;
    created_at: string;
    profiles: ProfileInfo | null;
}

interface Props {
    pacienteId: string;
    onClose: () => void;
    currentUserId?: string; // Para saber si "modificado_por" es el usuario actual
}

interface HistorialItemDiff {
    id: string;
    autor: string;
    fecha: string;
    hora: string;
    isInitial: boolean;
    cambios: {
        condicionesAgregadas: string[];
        condicionesEliminadas: string[];
        alergiasAgregadas: string[];
        alergiasEliminadas: string[];
    };
}

function FichaHistorialModal({ pacienteId, onClose }: Props) {
    const [historial, setHistorial] = useState<HistorialItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const res = await apiFetch(`/api/pacientes/${pacienteId}/ficha/historial`);
                const json = await res.json();
                if (res.ok && json.success) {
                    setHistorial(json.data ?? []);
                } else {
                    showToast("No se pudo cargar el historial.");
                }
            } catch (err) {
                console.error("Error fetching medical record history:", err);
                showToast("Error al conectar con el servidor.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();
    }, [pacienteId]);

    // Función para calcular la diferencia entre dos estados de ficha médica
    const procesarDiff = (item: HistorialItem): HistorialItemDiff => {
        const anterior = item.ficha_anterior || { condiciones: [], allergies: [], alergias: [] };
        const nueva = item.ficha_nueva || { condiciones: [], allergies: [], alergias: [] };

        // Normalizar arreglos
        const condAnt = Array.isArray(anterior.condiciones) ? anterior.condiciones : [];
        const condNue = Array.isArray(nueva.condiciones) ? nueva.condiciones : [];
        
        // El campo en base de datos de alergias podría llamarse "alergias" o "allergies" (soporte a ambos por robustez)
        const alerAnt = Array.isArray(anterior.alergias) ? anterior.alergias : (Array.isArray(anterior.allergies) ? anterior.allergies : []);
        const alerNue = Array.isArray(nueva.alergias) ? nueva.alergias : (Array.isArray(nueva.allergies) ? nueva.allergies : []);

        const condAntMap = new Map(condAnt.map((c: any) => [c.id, c.label]));
        const condNueMap = new Map(condNue.map((c: any) => [c.id, c.label]));
        const alerAntMap = new Map(alerAnt.map((a: any) => [a.id, a.label]));
        const alerNueMap = new Map(alerNue.map((a: any) => [a.id, a.label]));

        // 1. Condiciones Agregadas (están en nueva pero no en anterior)
        const condicionesAgregadas: string[] = [];
        condNue.forEach((c: any) => {
            if (!condAntMap.has(c.id)) condicionesAgregadas.push(c.label);
        });

        // 2. Condiciones Eliminadas (están en anterior pero no en nueva)
        const condicionesEliminadas: string[] = [];
        condAnt.forEach((c: any) => {
            if (!condNueMap.has(c.id)) condicionesEliminadas.push(c.label);
        });

        // 3. Alergias Agregadas
        const alergiasAgregadas: string[] = [];
        alerNue.forEach((a: any) => {
            if (!alerAntMap.has(a.id)) alergiasAgregadas.push(a.label);
        });

        // 4. Alergias Eliminadas
        const alergiasEliminadas: string[] = [];
        alerAnt.forEach((a: any) => {
            if (!alerNueMap.has(a.id)) alergiasEliminadas.push(a.label);
        });

        // Formatear Autor
        let autor = "Usuario desconocido";
        if (item.profiles) {
            const esMedico = item.profiles.tipo_usuario === "medico";
            if (esMedico) {
                autor = formatDoctorName(item.profiles.nombre_apellido);
            } else {
                autor = item.profiles.nombre_apellido;
            }
        }

        // Formatear Fecha
        const dateObj = new Date(item.created_at);
        const fecha = dateObj.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
        const hora = dateObj.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit"
        }) + " hs";

        const isInitial = !item.ficha_anterior;

        return {
            id: item.id,
            autor,
            fecha: fecha.charAt(0).toUpperCase() + fecha.slice(1),
            hora,
            isInitial,
            cambios: {
                condicionesAgregadas,
                condicionesEliminadas,
                alergiasAgregadas,
                alergiasEliminadas
            }
        };
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Historial de Cambios</h3>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
                            Auditoría de modificaciones clínicas del paciente
                        </p>
                    </div>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                        <div style={spinnerStyle} />
                        <p style={{ marginTop: 12, fontSize: 14 }}>Cargando bitácora...</p>
                    </div>
                ) : historial.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 16px" }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#4b5563" }}>Sin modificaciones aún</p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
                            Los cambios en condiciones o alergias se registrarán automáticamente acá.
                        </p>
                    </div>
                ) : (
                    <div style={timelineContainerStyle}>
                        {historial.map((rawItem, index) => {
                            const diff = procesarDiff(rawItem);
                            const hasChanges = 
                                diff.cambios.condicionesAgregadas.length > 0 ||
                                diff.cambios.condicionesEliminadas.length > 0 ||
                                diff.cambios.alergiasAgregadas.length > 0 ||
                                diff.cambios.alergiasEliminadas.length > 0;

                            return (
                                <div key={diff.id} style={timelineItemStyle}>
                                    {/* Icono de la línea de tiempo */}
                                    <div style={timelineBadgeStyle(diff.isInitial)}>
                                        {diff.isInitial ? "✨" : "📝"}
                                    </div>

                                    {/* Línea conectora vertical */}
                                    {index !== historial.length - 1 && <div style={timelineLineStyle} />}

                                    {/* Tarjeta de contenido */}
                                    <div style={timelineCardStyle}>
                                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                            <span style={{ fontSize: 13, color: "#2f5cf5", fontWeight: 700 }}>
                                                {diff.autor}
                                            </span>
                                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                                {diff.fecha} · {diff.hora}
                                            </span>
                                        </div>

                                        {diff.isInitial ? (
                                            <p style={{ margin: 0, fontSize: 13, color: "#10b981", fontWeight: 600 }}>
                                                🚀 Ficha médica inicial configurada.
                                            </p>
                                        ) : !hasChanges ? (
                                            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                                                Guardado sin cambios en condiciones ni alergias.
                                            </p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {/* CONDICIONES */}
                                                {(diff.cambios.condicionesAgregadas.length > 0 || diff.cambios.condicionesEliminadas.length > 0) && (
                                                    <div>
                                                        <div style={sectionHeaderStyle}>Condiciones Médicas:</div>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                                            {diff.cambios.condicionesAgregadas.map((c) => (
                                                                <span key={c} style={badgeStyle("#d1fae5", "#065f46")}>
                                                                    + {c}
                                                                </span>
                                                            ))}
                                                            {diff.cambios.condicionesEliminadas.map((c) => (
                                                                <span key={c} style={badgeStyle("#fee2e2", "#991b1b", true)}>
                                                                    - {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ALERGIAS */}
                                                {(diff.cambios.alergiasAgregadas.length > 0 || diff.cambios.alergiasEliminadas.length > 0) && (
                                                    <div>
                                                        <div style={sectionHeaderStyle}>Alergias:</div>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                                            {diff.cambios.alergiasAgregadas.map((a) => (
                                                                <span key={a} style={badgeStyle("#fef3c7", "#92400e")}>
                                                                    + {a}
                                                                </span>
                                                            ))}
                                                            {diff.cambios.alergiasEliminadas.map((a) => (
                                                                <span key={a} style={badgeStyle("#fee2e2", "#991b1b", true)}>
                                                                    - {a}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Animación del spinner */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Estilos premium inline
const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
    padding: 20,
    fontFamily: "Inter, sans-serif"
};

const modalStyle: React.CSSProperties = {
    background: "white",
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    padding: "24px 20px 28px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
};

const closeBtnStyle: React.CSSProperties = {
    background: "#f3f4f6",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    color: "#4b5563",
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700
};

const spinnerStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    border: "3px solid #f3f4f6",
    borderTop: "3px solid #2f5cf5",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 1s linear infinite"
};

const timelineContainerStyle: React.CSSProperties = {
    overflowY: "auto",
    paddingRight: 6,
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 20
};

const timelineItemStyle: React.CSSProperties = {
    position: "relative",
    paddingLeft: 36,
    display: "flex",
    flexDirection: "column"
};

const timelineBadgeStyle = (isInitial: boolean): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 2,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: isInitial ? "#e0f2fe" : "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    zIndex: 2,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
});

const timelineLineStyle: React.CSSProperties = {
    position: "absolute",
    left: 11,
    top: 28,
    bottom: -22,
    width: 2,
    background: "#e5e7eb",
    zIndex: 1
};

const timelineCardStyle: React.CSSProperties = {
    background: "#f9fafb",
    borderRadius: 16,
    padding: "14px 16px",
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.01)"
};

const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
};

const badgeStyle = (bg: string, color: string, strikeThrough = false): React.CSSProperties => ({
    padding: "3px 10px",
    borderRadius: 8,
    fontSize: 12,
    background: bg,
    color,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    textDecoration: strikeThrough ? "line-through" : "none"
});

export default FichaHistorialModal;
