import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";

type DerivacionPendiente = {
    id: string;
    paciente_id: string;
    resumen: string | null;
    contexto: any;
    created_at: string;
    paciente: { nombre_apellido: string };
};

type ChatRoom = {
    id: string;
    paciente_id: string;
    medico_id: string;
    tipo: string | null;
    derivacion_id: string | null;
    updated_at: string;
    destinatario: { id: string; nombre_apellido: string; tipo_usuario: string } | null;
    resumen_derivacion: string | null;
};

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatRelativeTime(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function DoctorChatPage() {
    const navigate = useNavigate();
    const [pendientes, setPendientes] = useState<DerivacionPendiente[]>([]);
    const [activeRooms, setActiveRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [aceptandoId, setAceptandoId] = useState<string | null>(null);

    const fetchAll = async () => {
        try {
            const [resPend, resRooms] = await Promise.all([
                apiFetch("/api/derivaciones/pendientes"),
                apiFetch("/api/chats/rooms"),
            ]);
            const [jp, jr] = await Promise.all([resPend.json(), resRooms.json()]);
            if (jp?.success) setPendientes(jp.data ?? []);
            if (jr?.success) setActiveRooms(jr.data ?? []);
        } catch (err) {
            console.error("Error cargando chats del doctor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        const interval = window.setInterval(fetchAll, 8000);
        const onFocus = () => fetchAll();
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    const tomarConsulta = async (id: string) => {
        setAceptandoId(id);
        try {
            const res = await apiFetch(`/api/derivaciones/${id}/aceptar`, { method: "POST" });
            const json = await res.json();
            if (res.status === 409) {
                showToast(json.message ?? "Otro médico ya tomó esta consulta");
                setPendientes((prev) => prev.filter((p) => p.id !== id));
                return;
            }
            if (!res.ok || !json?.success) {
                showToast(json?.message ?? "No se pudo tomar la consulta");
                return;
            }
            navigate(`/doctor/chat/${json.data.room_id}`);
        } catch {
            showToast("Error al conectar con el servidor");
        } finally {
            setAceptandoId(null);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Chats</h2>
                    <p className="dashboard-sub">Consultas entrantes y conversaciones activas</p>
                </div>
            </div>

            {/* Consultas entrantes (derivaciones tipo "Uber") */}
            <div className="dashboard-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#111827" }}>Consultas entrantes</h3>
                    {pendientes.length > 0 && (
                        <span className="doctor-chat-badge">{pendientes.length}</span>
                    )}
                </div>

                {loading ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Cargando...</p>
                ) : pendientes.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
                        No hay consultas pendientes ahora. Se actualizan cada pocos segundos.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {pendientes.map((p) => (
                            <div key={p.id} className="derivar-card">
                                <div className="derivar-card-header">
                                    <div className="chat-avatar chat-avatar-other">{getInitials(p.paciente.nombre_apellido)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p className="derivar-card-name">{p.paciente.nombre_apellido}</p>
                                        <p className="derivar-card-time">{formatRelativeTime(p.created_at)}</p>
                                    </div>
                                </div>
                                {p.resumen && (
                                    <p className="derivar-card-resumen">{p.resumen}</p>
                                )}
                                <button
                                    onClick={() => tomarConsulta(p.id)}
                                    disabled={aceptandoId === p.id}
                                    className="derivar-card-btn"
                                >
                                    {aceptandoId === p.id ? "Tomando..." : "Tomar consulta"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Mis chats activos */}
            <div className="dashboard-card">
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#111827" }}>Mis chats activos</h3>

                {loading ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Cargando...</p>
                ) : activeRooms.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
                        Todavía no tenés chats. Las consultas que tomes aparecen acá.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {activeRooms.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => navigate(`/doctor/chat/${r.id}`)}
                                className="doctor-room-item"
                            >
                                <div className="chat-avatar chat-avatar-other">
                                    {getInitials(r.destinatario?.nombre_apellido ?? "P")}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {r.destinatario?.nombre_apellido ?? "Paciente"}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {r.tipo === "urgencia"
                                            ? `Urgencia — ${r.resumen_derivacion ?? "consulta IA"}`
                                            : "Chat por turno"}
                                    </p>
                                </div>
                                {r.tipo === "urgencia" && <span className="doctor-room-badge">Urgencia</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Navbar role="doctor" />
        </div>
    );
}

export default DoctorChatPage;
