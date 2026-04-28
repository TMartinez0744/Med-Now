import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { authFetch } from "../utils/authFetch";

const API = "http://localhost:3000/api";


const MOCK_SLOTS = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30"];

// Genera los próximos 5 días hábiles a partir de hoy
function getNextDates(count = 5) {
    const dates: { label: string; value: string }[] = [];
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const d = new Date();
    while (dates.length < count) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            dates.push({
                label: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
                value: d.toISOString().slice(0, 10),
            });
        }
    }
    return dates;
}

const MOCK_DATES = getNextDates(5);

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    hospital: string;
}

interface Turno {
    id: number;
    doctor: string;
    specialty: string;
    hospital: string;
    dateLabel: string;
    time: string;
}

interface HistorialTurno extends Turno {
    status: "completado" | "cancelado";
}

function PatientTurnosPage() {
    const patientData = JSON.parse(localStorage.getItem("patientData") || "{}");

    const [activeTab, setActiveTab] = useState<"proximos" | "historial">("proximos");
    const [showBookModal, setShowBookModal] = useState(false);
    const [bookStep, setBookStep] = useState<"search" | "slots">("search");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedDate, setSelectedDate] = useState(MOCK_DATES[0].value);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    useEffect(() => {
        setLoadingDoctors(true);
        authFetch(`${API}/medicos`)
            .then((r) => r.json())
            .then(({ data }) => {
                const mapped: Doctor[] = (data ?? []).map((d: any) => ({
                    id: d.id,
                    name: d.profiles?.nombre_apellido ?? "Médico",
                    specialty: d.especialidades?.[0] ?? "",
                    hospital: d.sedes?.[0] ?? "",
                }));
                setDoctors(mapped);
                setSpecialties([...new Set(mapped.map((d) => d.specialty).filter(Boolean))]);
            })
            .catch(console.error)
            .finally(() => setLoadingDoctors(false));
    }, []);

    const [upcomingTurnos, setUpcomingTurnos] = useState<Turno[]>(() => {
        try { return JSON.parse(localStorage.getItem("patientTurnos") || "[]"); }
        catch { return []; }
    });

    const [historialTurnos] = useState<HistorialTurno[]>([
        {
            id: 10,
            doctor: "Dra. Ana Martínez",
            specialty: "Dermatología",
            hospital: "Hospital Italiano",
            dateLabel: "Vie 20 Mar",
            time: "11:30",
            status: "completado",
        },
        {
            id: 11,
            doctor: "Dr. Luis Rodríguez",
            specialty: "Clínica médica",
            hospital: "Hospital Alemán",
            dateLabel: "Mar 10 Feb",
            time: "10:30",
            status: "cancelado",
        },
    ]);

    const filteredDoctors = doctors.filter((d) => {
        const matchesSpec = selectedSpecialty ? d.specialty === selectedSpecialty : true;
        const matchesQuery = searchQuery
            ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.specialty.toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        return matchesSpec && matchesQuery;
    });

    const openBookModal = () => {
        setBookStep("search");
        setSearchQuery("");
        setSelectedSpecialty(null);
        setSelectedDoctor(null);
        setSelectedTime(null);
        setSelectedDate(MOCK_DATES[0].value);
        setShowBookModal(true);
    };

    const selectDoctor = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setSelectedTime(null);
        setBookStep("slots");
    };

    const confirmBooking = () => {
        if (!selectedDoctor || !selectedTime) return;
        const dateObj = MOCK_DATES.find((d) => d.value === selectedDate)!;
        const capitalize = (t: string) => t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";
        const patientName = patientData.name && patientData.lastName
            ? `${capitalize(patientData.name)} ${capitalize(patientData.lastName)}`
            : "Paciente";

        const newTurno: Turno = {
            id: Date.now(),
            doctor: selectedDoctor.name,
            specialty: selectedDoctor.specialty,
            hospital: selectedDoctor.hospital,
            dateLabel: dateObj.label,
            time: selectedTime,
        };

        const updated = [...upcomingTurnos, newTurno];
        setUpcomingTurnos(updated);
        localStorage.setItem("patientTurnos", JSON.stringify(updated));

        const shared = JSON.parse(localStorage.getItem("sharedTurnos") || "[]");
        shared.push({ id: newTurno.id, doctorName: selectedDoctor.name, patient: patientName, reason: selectedDoctor.specialty, dateLabel: dateObj.label, time: selectedTime });
        localStorage.setItem("sharedTurnos", JSON.stringify(shared));

        setShowBookModal(false);
    };

    const cancelTurno = (id: number) => {
        const updated = upcomingTurnos.filter((t) => t.id !== id);
        setUpcomingTurnos(updated);
        localStorage.setItem("patientTurnos", JSON.stringify(updated));
        const shared = JSON.parse(localStorage.getItem("sharedTurnos") || "[]");
        localStorage.setItem("sharedTurnos", JSON.stringify(shared.filter((t: { id: number }) => t.id !== id)));
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Mis Turnos</h2>
                    <p className="dashboard-sub">Gestioná tus citas médicas</p>
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
                <>
                    <div style={{ margin: "16px 20px 0", display: "flex", justifyContent: "center" }}>
                        <button
                            className="auth-button"
                            onClick={openBookModal}
                            style={{ marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Reservar turno
                        </button>
                    </div>

                    <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {upcomingTurnos.length === 0 ? (
                            <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: "0 auto 14px", display: "block" }}>
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <p className="empty-text" style={{ fontSize: 15, marginBottom: 4 }}>No tenés turnos próximos</p>
                                <p className="empty-text">Reservá tu primera cita</p>
                            </div>
                        ) : (
                            upcomingTurnos.map((t) => (
                                <TurnoCard
                                    key={t.id}
                                    turno={t}
                                    onCancel={() => cancelTurno(t.id)}
                                    showCancel
                                    canceling={false}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === "historial" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {historialTurnos.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <p className="empty-text">Sin historial de turnos</p>
                        </div>
                    ) : (
                        historialTurnos.map((t) => (
                            <TurnoCard key={t.id} turno={t} status={t.status} />
                        ))
                    )}
                </div>
            )}

            <Navbar role="patient" />

            {/* Modal reservar turno */}
            {showBookModal && (
                <div style={overlayStyle} onClick={() => setShowBookModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        {bookStep === "search" ? (
                            <>
                                <div style={modalHeaderStyle}>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>Reservar turno</h3>
                                    <button onClick={() => setShowBookModal(false)} style={closeBtnStyle}>✕</button>
                                </div>

                                <input
                                    className="auth-input"
                                    placeholder="Buscar por especialidad o médico..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ marginBottom: 14 }}
                                    autoFocus
                                />

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                                    {specialties.map((spec) => (
                                        <button
                                            key={spec}
                                            onClick={() => setSelectedSpecialty(selectedSpecialty === spec ? null : spec)}
                                            className={`specialty-chip ${selectedSpecialty === spec ? "active" : ""}`}
                                        >
                                            {spec}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {loadingDoctors ? (
                                        <p className="empty-text" style={{ textAlign: "center", padding: "20px 0" }}>Cargando médicos...</p>
                                    ) : filteredDoctors.length === 0 ? (
                                        <p className="empty-text" style={{ textAlign: "center", padding: "20px 0" }}>Sin resultados</p>
                                    ) : (
                                        filteredDoctors.map((doc) => (
                                            <button
                                                key={doc.id}
                                                onClick={() => selectDoctor(doc)}
                                                className="doctor-list-btn"
                                            >
                                                <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", marginBottom: 3 }}>{doc.name}</div>
                                                <div style={{ fontSize: 13, color: "#6b7280" }}>{doc.specialty} · {doc.hospital}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={modalHeaderStyle}>
                                    <button onClick={() => setBookStep("search")} style={{ ...closeBtnStyle, fontSize: 22 }}>←</button>
                                    <h3 style={{ margin: 0, fontSize: 18 }}>Elegir horario</h3>
                                    <button onClick={() => setShowBookModal(false)} style={closeBtnStyle}>✕</button>
                                </div>

                                <div style={{ background: "#eef3ff", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: "#2f5cf5" }}>{selectedDoctor?.name}</div>
                                    <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>{selectedDoctor?.specialty} · {selectedDoctor?.hospital}</div>
                                </div>

                                <div style={{ marginBottom: 18 }}>
                                    <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 14, color: "#374151" }}>Fecha</p>
                                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                                        {MOCK_DATES.map((d) => (
                                            <button
                                                key={d.value}
                                                onClick={() => { setSelectedDate(d.value); setSelectedTime(null); }}
                                                className={`date-chip ${selectedDate === d.value ? "active" : ""}`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 24 }}>
                                    <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 14, color: "#374151" }}>Horario disponible</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                        {MOCK_SLOTS.map((slot) => (
                                            <button
                                                key={slot}
                                                onClick={() => setSelectedTime(slot)}
                                                className={`time-slot-btn ${selectedTime === slot ? "active" : ""}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className="auth-button"
                                    onClick={confirmBooking}
                                    disabled={!selectedTime}
                                    style={{ marginTop: 0, opacity: selectedTime ? 1 : 0.5, cursor: selectedTime ? "pointer" : "default" }}
                                >
                                    Confirmar turno
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function TurnoCard({
    turno,
    onCancel,
    showCancel = false,
    status,
    canceling = false,
}: {
    turno: Turno;
    onCancel?: () => void;
    showCancel?: boolean;
    status?: "completado" | "cancelado";
    canceling?: boolean;
}) {
    return (
        <div className="dashboard-card" style={{ margin: 0, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>{turno.doctor}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{turno.specialty}</div>
                    <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span style={{ fontSize: 13, color: "#374151" }}>{turno.dateLabel}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ fontSize: 13, color: "#374151" }}>{turno.time} hs</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>{turno.hospital}</div>
                </div>

                {status ? (
                    <span className={`turno-badge ${status}`}>
                        {status === "completado" ? "Completado" : "Cancelado"}
                    </span>
                ) : showCancel && onCancel ? (
                    <button
                        onClick={onCancel}
                        disabled={canceling}
                        className="cancel-turno-btn"
                        style={{ opacity: canceling ? 0.5 : 1, cursor: canceling ? "not-allowed" : "pointer" }}
                    >
                        {canceling ? "..." : "Cancelar"}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    maxHeight: "90vh",
    overflowY: "auto",
};

const modalHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
};

const closeBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#6b7280",
};

export default PatientTurnosPage;
