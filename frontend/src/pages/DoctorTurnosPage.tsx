import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";
import { formatDoctorName } from "../lib/doctorName";
import FichaPaciente from "../components/FichaPaciente";
import CalendarView from "../components/CalendarView";

type TurnoMedico = {
    id: string;
    fecha_hora: string;
    estado: string;
    paciente_id: string;
    pacientes: {
        profiles: { nombre_apellido: string };
    } | null;
};

function formatFechaHora(iso: string) {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return { fecha, hora };
}

function DoctorTurnosPage() {
    const navigate = useNavigate();
    const doctorData = JSON.parse(localStorage.getItem("doctorData") || "{}");
    const medicoId: string = doctorData.id ?? "";

    const [activeTab, setActiveTab] = useState<"proximos" | "calendario" | "historial">("proximos");
    const [proximos, setProximos] = useState<TurnoMedico[]>([]);
    const [historial, setHistorial] = useState<TurnoMedico[]>([]);
    const [loading, setLoading] = useState(false);
    const [cancelandoId, setCancelandoId] = useState<string | null>(null);
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
    const [fichaAbierta, setFichaAbierta] = useState<{ id: string; nombre: string } | null>(null);
    const [unreadByPaciente, setUnreadByPaciente] = useState<Record<string, number>>({});

    const fetchTurnos = async () => {
        if (!medicoId) return;
        setLoading(true);
        try {
            const [rProx, rHist] = await Promise.all([
                apiFetch(`/api/medicos/${medicoId}/turnos`),
                apiFetch(`/api/medicos/${medicoId}/turnos/historial`),
            ]);
            const jProx = await rProx.json();
            const jHist = await rHist.json();
            setProximos(jProx.data ?? []);
            // Historial: solo turnos cancelados o que ya pasaron
            const all: TurnoMedico[] = jHist.data ?? [];
            setHistorial(all.filter((t) => t.estado === "cancelado" || new Date(t.fecha_hora) < new Date()));
        } catch (e) {
            console.error("Error cargando turnos del médico", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTurnos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [medicoId]);

    // Cargar mensajes sin leer por paciente (para mostrar punto naranja en "Chatear")
    useEffect(() => {
        if (!medicoId) return;
        let active = true;
        const fetchUnread = async () => {
            try {
                const res = await apiFetch("/api/chats/unread-by-counterparty");
                if (!res.ok) return;
                const json = await res.json();
                if (active && json?.success) setUnreadByPaciente(json.data ?? {});
            } catch { /* silencioso */ }
        };
        fetchUnread();
        const interval = window.setInterval(fetchUnread, 15000);
        const onFocus = () => fetchUnread();
        window.addEventListener("focus", onFocus);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [medicoId]);

    const confirmarCancelar = async () => {
        const id = confirmCancelId;
        if (!id) return;
        setConfirmCancelId(null);
        setCancelandoId(id);
        try {
            const res = await apiFetch(`/api/turnos/${id}/cancelar`, { method: "PATCH" });
            if (res.ok) {
                await fetchTurnos();
            } else {
                showToast("No se pudo cancelar el turno. Intentá de nuevo.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCancelandoId(null);
        }
    };

    const handleStartChat = async (pacienteId: string) => {
        try {
            const res = await apiFetch("/api/chats/room", {
                method: "POST",
                body: JSON.stringify({ paciente_id: pacienteId, medico_id: medicoId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                navigate(`/doctor/chat/${data.data.id}`);
            } else {
                showToast(data.message ?? "Error al abrir la sala de chat.");
            }
        } catch {
            showToast("Error al conectar con el servidor.");
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Mis Turnos</h2>
                    <p className="dashboard-sub">
                        {activeTab === "proximos" ? "Próximas citas con tus pacientes" : activeTab === "calendario" ? "Visualización en calendario" : "Historial de turnos"}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="turnos-tabs">
                {(["proximos", "calendario", "historial"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`turnos-tab-btn ${activeTab === tab ? "active" : ""}`}
                    >
                        {tab === "proximos" ? "Próximos" : tab === "calendario" ? "Calendario" : "Historial"}
                    </button>
                ))}
            </div>

            {/* Tab: Calendario */}
            {activeTab === "calendario" && (
                <CalendarView
                    role="doctor"
                    turnos={[...proximos, ...historial]}
                    unreadMessages={unreadByPaciente}
                    onChat={handleStartChat}
                    onCancel={(id) => setConfirmCancelId(id)}
                    onFicha={(id, nombre) => setFichaAbierta({ id, nombre })}
                />
            )}

            {/* Tab: Próximos */}
            {activeTab === "proximos" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {loading ? (
                        <p style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>Cargando...</p>
                    ) : proximos.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: "0 auto 14px", display: "block" }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <p className="empty-text" style={{ fontSize: 15 }}>No tenés turnos próximos</p>
                        </div>
                    ) : (
                        proximos.map((turno) => {
                            const { fecha, hora } = formatFechaHora(turno.fecha_hora);
                            const nombrePaciente = turno.pacientes?.profiles?.nombre_apellido ?? "Paciente";
                            const isCanceling = cancelandoId === turno.id;
                            return (
                                <div
                                    key={turno.id}
                                    className="dashboard-card"
                                    style={{
                                        margin: 0, padding: "16px 18px",
                                        display: "flex", justifyContent: "space-between",
                                        alignItems: "center", gap: 12,
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#111827" }}>
                                            {nombrePaciente}
                                        </p>
                                        <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                                            📅 {fecha} 🕐 {hora} hs
                                        </p>
                                        <span style={{
                                            display: "inline-block", marginTop: 8,
                                            padding: "3px 10px", borderRadius: 999, fontSize: 12,
                                            background: turno.estado === "pendiente" ? "#d1fae5" : "#f3f4f6",
                                            color: turno.estado === "pendiente" ? "#065f46" : "#6b7280",
                                            fontWeight: 600,
                                        }}>
                                            {turno.estado}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                        <button
                                            onClick={() => setFichaAbierta({ id: turno.paciente_id, nombre: nombrePaciente })}
                                            className="ficha-square-btn"
                                            title="Ver ficha del paciente"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="12" y1="18" x2="12" y2="12" />
                                                <line x1="9" y1="15" x2="15" y2="15" />
                                            </svg>
                                        </button>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <button
                                                onClick={() => handleStartChat(turno.paciente_id)}
                                                className="chatear-btn"
                                            >
                                                Chatear
                                                {(unreadByPaciente[turno.paciente_id] ?? 0) > 0 && (
                                                    <span className="chatear-btn-dot" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setConfirmCancelId(turno.id)}
                                                disabled={isCanceling}
                                                className="cancel-turno-btn"
                                                style={{ opacity: isCanceling ? 0.5 : 1, cursor: isCanceling ? "not-allowed" : "pointer" }}
                                            >
                                                {isCanceling ? "..." : "Cancelar"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Tab: Historial */}
            {activeTab === "historial" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {loading ? (
                        <p style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>Cargando...</p>
                    ) : historial.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <p className="empty-text">Sin historial de turnos</p>
                        </div>
                    ) : (
                        historial.map((turno) => {
                            const { fecha, hora } = formatFechaHora(turno.fecha_hora);
                            const nombrePaciente = turno.pacientes?.profiles?.nombre_apellido ?? "Paciente";
                            const status = turno.estado === "cancelado" ? "cancelado" : "completado";
                            return (
                                <div key={turno.id} className="dashboard-card" style={{ margin: 0, padding: "16px 18px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 6 }}>
                                                {nombrePaciente}
                                            </div>
                                            <div style={{ fontSize: 13, color: "#374151" }}>
                                                📅 {fecha} 🕐 {hora} hs
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                            <button
                                                onClick={() => setFichaAbierta({ id: turno.paciente_id, nombre: nombrePaciente })}
                                                className="ficha-square-btn"
                                                title="Ver ficha del paciente"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="12" y1="18" x2="12" y2="12" />
                                                    <line x1="9" y1="15" x2="15" y2="15" />
                                                </svg>
                                            </button>
                                            <span className={`turno-badge ${status}`}>
                                                {status === "completado" ? "Completado" : "Cancelado"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <Navbar role="doctor" />

            {/* confirmación cancelar turno */}
            {confirmCancelId !== null && (
                <div className="chat-confirm-overlay" onClick={() => setConfirmCancelId(null)}>
                    <div className="chat-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h4 className="chat-confirm-title">¿Cancelar este turno?</h4>
                        <p className="chat-confirm-text">
                            Se le va a notificar al paciente. Esta acción no se puede deshacer.
                        </p>
                        <div className="chat-confirm-actions">
                            <button className="chat-confirm-cancel" onClick={() => setConfirmCancelId(null)}>
                                Volver
                            </button>
                            <button className="chat-confirm-delete" onClick={confirmarCancelar}>
                                Cancelar turno
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ficha paciente */}
            {fichaAbierta && (
                <FichaPaciente
                    pacienteId={fichaAbierta.id}
                    medicoId={medicoId}
                    nombreMedico={formatDoctorName(doctorData.nombre_apellido, doctorData.licenseNumber)}
                    matriculaMedico={doctorData.licenseNumber ?? undefined}
                    nombrePaciente={fichaAbierta.nombre}
                    onClose={() => setFichaAbierta(null)}
                />
            )}
        </div>
    );
}

export default DoctorTurnosPage;
