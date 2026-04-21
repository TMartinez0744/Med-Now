import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

interface PatientTurno {
    id: number;
    patient: string;
    reason: string;
    dateLabel: string;
    time: string;
}

interface HistorialTurno extends PatientTurno {
    status: "completado" | "cancelado";
}

const INITIAL_UPCOMING: PatientTurno[] = [
    { id: 1, patient: "María González", reason: "Control anual", dateLabel: "Mar 21 Abr", time: "09:00" },
    { id: 2, patient: "Jorge Ramírez", reason: "Primera consulta", dateLabel: "Mar 21 Abr", time: "10:00" },
    { id: 3, patient: "Laura Sánchez", reason: "Seguimiento", dateLabel: "Mié 22 Abr", time: "11:00" },
    { id: 4, patient: "Tomás Ferreira", reason: "Control anual", dateLabel: "Jue 23 Abr", time: "09:30" },
];

const MOCK_HISTORIAL: HistorialTurno[] = [
    { id: 10, patient: "Claudia Ríos", reason: "Seguimiento", dateLabel: "Mar 7 Abr", time: "10:00", status: "completado" },
    { id: 11, patient: "Pablo Medina", reason: "Primera consulta", dateLabel: "Vie 4 Abr", time: "14:30", status: "cancelado" },
    { id: 12, patient: "Ana Torres", reason: "Control", dateLabel: "Mié 2 Abr", time: "08:30", status: "completado" },
];

function DoctorTurnosPage() {
    const [activeTab, setActiveTab] = useState<"proximos" | "historial">("proximos");
    const [upcoming, setUpcoming] = useState<PatientTurno[]>(INITIAL_UPCOMING);
    const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

    useEffect(() => {
        const doctorData = JSON.parse(localStorage.getItem("doctorData") || "{}");
        const capitalize = (t: string) => t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";
        const doctorName = doctorData.name && doctorData.lastName
            ? `Dr. ${capitalize(doctorData.name)} ${capitalize(doctorData.lastName)}`
            : null;
        if (!doctorName) return;
        const shared: Array<{ id: number; doctorName: string; patient: string; reason: string; dateLabel: string; time: string }> =
            JSON.parse(localStorage.getItem("sharedTurnos") || "[]");
        const mine = shared
            .filter((t) => t.doctorName === doctorName)
            .map((t) => ({ id: t.id, patient: t.patient, reason: t.reason, dateLabel: t.dateLabel, time: t.time }));
        if (mine.length > 0) {
            setUpcoming((prev) => {
                const ids = new Set(prev.map((t) => t.id));
                return [...prev, ...mine.filter((t) => !ids.has(t.id))];
            });
        }
    }, []);

    const cancelTurno = (id: number) => {
        setUpcoming((prev) => prev.filter((t) => t.id !== id));
        setConfirmCancelId(null);
        const shared = JSON.parse(localStorage.getItem("sharedTurnos") || "[]");
        localStorage.setItem("sharedTurnos", JSON.stringify(shared.filter((t: { id: number }) => t.id !== id)));
    };

    //Agrupa turnos próximos por fecha
    const grouped = upcoming.reduce<Record<string, PatientTurno[]>>((acc, t) => {
        if (!acc[t.dateLabel]) acc[t.dateLabel] = [];
        acc[t.dateLabel].push(t);
        return acc;
    }, {});

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Mis Turnos</h2>
                    <p className="dashboard-sub">Agenda de citas médicas</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="turnos-tabs">
                {(["proximos", "historial"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`turnos-tab-btn ${activeTab === tab ? "active" : ""}`}
                    >
                        {tab === "proximos" ? "Próximos" : "Historial"}
                    </button>
                ))}
            </div>

            {activeTab === "proximos" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {upcoming.length === 0 ? (
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
                        Object.entries(grouped).map(([dateLabel, turnos]) => (
                            <div key={dateLabel}>
                                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    {dateLabel}
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {turnos.map((t) => (
                                        <DoctorTurnoCard
                                            key={t.id}
                                            turno={t}
                                            onCancel={() => setConfirmCancelId(t.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === "historial" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {MOCK_HISTORIAL.map((t) => (
                        <DoctorTurnoCard key={t.id} turno={t} status={t.status} />
                    ))}
                </div>
            )}

            <Navbar role="doctor" />

            {/* Modal confirmar cancelación */}
            {confirmCancelId !== null && (
                <div style={overlayStyle} onClick={() => setConfirmCancelId(null)}>
                    <div style={{ ...modalStyle, padding: "28px 24px 36px" }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "#111827" }}>Cancelar turno</h3>
                        <p style={{ margin: "0 0 26px", fontSize: 15, color: "#6b7280" }}>
                            ¿Seguro que querés cancelar este turno? El paciente será notificado.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setConfirmCancelId(null)}
                                style={{
                                    flex: 1, padding: "13px", border: "1px solid #e5e7eb", background: "white",
                                    borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer", color: "#374151",
                                }}
                            >
                                Volver
                            </button>
                            <button
                                onClick={() => cancelTurno(confirmCancelId)}
                                style={{
                                    flex: 1, padding: "13px", border: "none", background: "#ef4444",
                                    borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer", color: "white",
                                }}
                            >
                                Cancelar turno
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DoctorTurnoCard({
    turno,
    onCancel,
    status,
}: {
    turno: PatientTurno;
    onCancel?: () => void;
    status?: "completado" | "cancelado";
}) {
    return (
        <div className="dashboard-card" style={{ margin: 0, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{turno.patient}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{turno.reason}</div>
                    <div style={{ display: "flex", gap: 16 }}>
                        {status && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span style={{ fontSize: 13, color: "#374151" }}>{turno.dateLabel}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ fontSize: 13, color: "#374151" }}>{turno.time} hs</span>
                        </div>
                    </div>
                </div>

                {status ? (
                    <span className={`turno-badge ${status}`}>
                        {status === "completado" ? "Completado" : "Cancelado"}
                    </span>
                ) : onCancel ? (
                    <button onClick={onCancel} className="cancel-turno-btn">Cancelar</button>
                ) : null}
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: "20px",
};

const modalStyle: React.CSSProperties = {
    background: "white",
    width: "100%",
    maxWidth: 480,
    borderRadius: "24px",
    padding: "24px 20px 32px",
};

export default DoctorTurnosPage;
