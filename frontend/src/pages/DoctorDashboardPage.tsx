import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";
import { useState, useEffect } from "react";
import { authFetch } from "../utils/authFetch";

const API = "http://localhost:3000/api";

const DIAS = [
    { nombre: "Lunes",     index: 1 },
    { nombre: "Martes",    index: 2 },
    { nombre: "Miércoles", index: 3 },
    { nombre: "Jueves",    index: 4 },
    { nombre: "Viernes",   index: 5 },
    { nombre: "Sábado",    index: 6 },
    { nombre: "Domingo",   index: 0 },
];

const SPECIALTIES = [
    "Cardiología",
    "Clínica médica",
    "Dermatología",
    "Pediatría",
    "Traumatología",
];

const HOSPITALS = [
    "Hospital Austral",
    "Hospital Italiano",
    "Hospital Alemán",
    "Sanatorio Finochietto",
];

type SlotDB = {
    id: string;
    medico_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    dia_nombre: string;
    sede?: string;
};

type DaySchedule = {
    enabled: boolean;
    from: string;
    to: string;
    slotId: string | null;
};

type TurnoMedico = {
    id: string;
    fecha_hora: string;
    estado: string;
    paciente_id: string;
    pacientes: {
        profiles: { nombre_apellido: string };
    } | null;
};

function DoctorDashboardPage() {
    const navigate = useNavigate();
    const doctorData = JSON.parse(localStorage.getItem("doctorData") || "{}");
    const medicoId: string = doctorData.id ?? "";

    // Redirect to login if unauthenticated
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !medicoId) {
            navigate("/login/doctor");
        }
    }, [navigate, medicoId]);

    const capitalize = (text: string) =>
        text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    const rawName = doctorData.nombre_apellido ?? "";
    const doctorName = rawName
        ? rawName.match(/^Dr[a]?\./i) ? rawName : `Dr. ${rawName}`
        : doctorData.licenseNumber
        ? `Dr. Matrícula ${doctorData.licenseNumber}`
        : "Dr. Usuario";

    const doctorLicense = doctorData.licenseNumber
        ? `Matrícula: ${doctorData.licenseNumber}`
        : "Matrícula: No disponible";

    const [specialties, setSpecialties] = useState<string[]>(
        doctorData.especialidades ?? []
    );
    const [hospitals, setHospitals] = useState<string[]>(
        doctorData.sedes ?? []
    );

    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);

    // Turnos del médico
    const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");
    const [turnos, setTurnos] = useState<TurnoMedico[]>([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [cancelandoId, setCelandoId] = useState<string | null>(null);

    const cancelarTurno = async (id: string) => {
        if (!confirm("¿Cancelar este turno?")) return;
        setCelandoId(id);
        try {
            const res = await authFetch(`${API}/turnos/${id}/cancelar`, { method: "PATCH" });
            if (res.ok) {
                setTurnos((prev) => prev.filter((t) => t.id !== id));
            } else {
                alert("Error al cancelar el turno.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCelandoId(null);
        }
    };

    const handleSaveProfile = async () => {
        if (!medicoId) return;
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            const res = await authFetch(`${API}/medicos/${medicoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ especialidades: specialties, sedes: hospitals }),
            });
            const data = await res.json();
            if (data.success) {
                setProfileMsg("✅ Cambios guardados correctamente.");
                const updatedDoctorData = { ...doctorData, especialidades: specialties, sedes: hospitals };
                localStorage.setItem("doctorData", JSON.stringify(updatedDoctorData));
            } else {
                setProfileMsg("❌ Hubo un error al guardar.");
            }
        } catch (error) {
            console.error(error);
            setProfileMsg("❌ Hubo un error al conectar.");
        } finally {
            setSavingProfile(false);
            setTimeout(() => setProfileMsg(null), 3000);
        }
    };

    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

    const [activeSede, setActiveSede] = useState<string>("");

    const defaultDaySchedule = (): Record<string, DaySchedule> =>
        Object.fromEntries(
            DIAS.map(({ nombre }) => [
                nombre,
                { enabled: !["Sábado", "Domingo"].includes(nombre), from: "08:00", to: "18:00", slotId: null },
            ])
        );

    const [scheduleMap, setScheduleMap] = useState<Record<string, Record<string, DaySchedule>>>({});

    // Cargar turnos del médico
    useEffect(() => {
        if (!medicoId) return;
        setLoadingTurnos(true);
        const endpoint = viewMode === "history"
            ? `${API}/medicos/${medicoId}/turnos/historial`
            : `${API}/medicos/${medicoId}/turnos`;

        authFetch(endpoint)
            .then((r) => r.json())
            .then(({ data }) => setTurnos(data ?? []))
            .catch(console.error)
            .finally(() => setLoadingTurnos(false));
    }, [medicoId, viewMode]);

    // Cargar disponibilidad desde la API al montar
    useEffect(() => {
        if (!medicoId) return;

        setLoadingSchedule(true);
        authFetch(`${API}/medicos/${medicoId}/disponibilidad`)
            .then((r) => r.json())
            .then(({ data }: { data: SlotDB[] }) => {
                const map: Record<string, Record<string, DaySchedule>> = {};
                
                if (data && data.length > 0) {
                    data.forEach((slot) => {
                        const sedeName = slot.sede || "Desconocida";
                        if (!map[sedeName]) {
                            map[sedeName] = Object.fromEntries(
                                DIAS.map(({ nombre }) => [nombre, { enabled: false, from: "08:00", to: "18:00", slotId: null }])
                            );
                        }
                        const dia = DIAS.find((d) => d.index === slot.dia_semana);
                        if (dia) {
                            map[sedeName][dia.nombre] = {
                                enabled: true,
                                from: slot.hora_inicio.slice(0, 5),
                                to: slot.hora_fin.slice(0, 5),
                                slotId: slot.id,
                            };
                        }
                    });
                }
                
                setScheduleMap(map);
            })
            .catch(console.error)
            .finally(() => setLoadingSchedule(false));
    }, [medicoId]);

    useEffect(() => {
        if (hospitals.length > 0 && !hospitals.includes(activeSede)) {
            setActiveSede(hospitals[0]);
        }
        
        setScheduleMap(prev => {
            const next = { ...prev };
            let changed = false;
            hospitals.forEach(h => {
                if (!next[h]) {
                    next[h] = defaultDaySchedule();
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

    }, [hospitals, activeSede]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("doctorData");
        navigate("/");
    };

    const toggleSelection = (
        value: string,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setList(list.includes(value) ? list.filter((i) => i !== value) : [...list, value]);
    };

    const toggleDaySchedule = (day: string) => {
        if (!activeSede) return;
        setScheduleMap((prev) => ({
            ...prev,
            [activeSede]: {
                ...prev[activeSede],
                [day]: { ...prev[activeSede][day], enabled: !prev[activeSede][day].enabled },
            }
        }));
    };

    const updateScheduleTime = (day: string, field: "from" | "to", value: string) => {
        if (!activeSede) return;
        setScheduleMap((prev) => ({
            ...prev,
            [activeSede]: {
                ...prev[activeSede],
                [day]: { ...prev[activeSede][day], [field]: value },
            }
        }));
    };

    // Guardar horario: borra todos los slots y los recrea según el estado actual
    const handleSaveSchedule = async () => {
        if (!medicoId) {
            alert("No se encontró el ID del médico. Volvé a iniciar sesión.");
            return;
        }
        setSavingSchedule(true);
        setScheduleMsg(null);
        try {
            // 1. Borrar todos los slots actuales
            await authFetch(`${API}/medicos/${medicoId}/disponibilidad`, { method: "DELETE" });

            // 2. Crear los nuevos slots
            const creates: Promise<any>[] = [];
            
            Object.entries(scheduleMap).forEach(([sedeName, days]) => {
                // only if it's currently selected in hospitals
                if (hospitals.includes(sedeName)) {
                    DIAS.forEach(({ nombre, index }) => {
                        const dayData = days[nombre];
                        if (dayData && dayData.enabled) {
                            creates.push(
                                authFetch(`${API}/medicos/${medicoId}/disponibilidad`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        dia_semana: index,
                                        hora_inicio: dayData.from,
                                        hora_fin: dayData.to,
                                        sede: sedeName
                                    }),
                                }).then((r) => r.json())
                            );
                        }
                    });
                }
            });

            const results = await Promise.all(creates);
            const hasError = results.some((r) => !r.success);
            if (hasError) {
                setScheduleMsg("⚠️ Algunos horarios no se guardaron correctamente.");
            } else {
                setScheduleMsg("✅ Horarios guardados correctamente.");
            }

            // Recargar
            const fresh = await authFetch(`${API}/medicos/${medicoId}/disponibilidad`).then((r) => r.json());
            if (fresh.data) {
                const map: Record<string, Record<string, DaySchedule>> = {};
                (fresh.data as SlotDB[]).forEach((slot) => {
                    const sedeName = slot.sede || "Desconocida";
                    if (!map[sedeName]) {
                        map[sedeName] = defaultDaySchedule();
                        // set all false initially
                        Object.keys(map[sedeName]).forEach(k => map[sedeName][k].enabled = false);
                    }
                    const dia = DIAS.find((d) => d.index === slot.dia_semana);
                    if (dia) {
                        map[sedeName][dia.nombre] = {
                            enabled: true,
                            from: slot.hora_inicio.slice(0, 5),
                            to: slot.hora_fin.slice(0, 5),
                            slotId: slot.id,
                        };
                    }
                });
                
                // Add default for empty ones in hospitals
                hospitals.forEach(h => {
                    if (!map[h]) map[h] = defaultDaySchedule();
                });
                
                setScheduleMap(map);
            }

            setIsEditingSchedule(false);
        } catch (err) {
            console.error(err);
            setScheduleMsg("❌ Error al guardar. Intentá nuevamente.");
        } finally {
            setSavingSchedule(false);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>
                <div>
                    <h2 className="dashboard-name">{doctorName}</h2>
                    <p className="dashboard-sub">{doctorLicense}</p>
                </div>
            </div>

            {/* ── Card Próximos Turnos ── */}
            <div className="dashboard-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div className="profile-block-header" style={{ marginBottom: 0 }}>
                        <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Mis Turnos</h3>
                    </div>
                    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: "8px", padding: "4px" }}>
                        <button
                            onClick={() => setViewMode("upcoming")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                cursor: "pointer",
                                background: viewMode === "upcoming" ? "#ffffff" : "transparent",
                                color: viewMode === "upcoming" ? "#111827" : "#6b7280",
                                boxShadow: viewMode === "upcoming" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            }}
                        >
                            Próximos
                        </button>
                        <button
                            onClick={() => setViewMode("history")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                fontSize: "14px",
                                fontWeight: 500,
                                cursor: "pointer",
                                background: viewMode === "history" ? "#ffffff" : "transparent",
                                color: viewMode === "history" ? "#111827" : "#6b7280",
                                boxShadow: viewMode === "history" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            }}
                        >
                            Historial
                        </button>
                    </div>
                </div>

                {loadingTurnos ? (
                    <p className="empty-text">Cargando turnos...</p>
                ) : turnos.length === 0 ? (
                    <p className="empty-text">No tenés turnos reservados próximamente.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {turnos.map((turno) => {
                            const fecha = new Date(turno.fecha_hora);
                            const nombrePaciente = turno.pacientes?.profiles?.nombre_apellido ?? "Paciente";
                            const isCanceling = cancelandoId === turno.id;
                            const isPast = fecha.getTime() < Date.now();
                            const isCanceled = turno.estado === "cancelado";
                            // Se muestra como completado si ya pasó la fecha y NO está cancelado
                            const statusLabel = isCanceled ? "Cancelado" : isPast ? "Completado" : turno.estado;

                            return (
                                <div
                                    key={turno.id}
                                    style={{
                                        background: "#f9fafb", borderRadius: 14,
                                        padding: "14px 16px", border: "1px solid #f3f4f6",
                                        display: "flex", justifyContent: "space-between",
                                        alignItems: "center", gap: 12,
                                        opacity: (isPast || isCanceled) ? 0.7 : 1,
                                    }}
                                >
                                    <div>
                                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#111827" }}>
                                            {nombrePaciente}
                                        </p>
                                        <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                                            📅 {fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                                            {" "}🕐 {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                                        </p>
                                        <span style={{
                                            display: "inline-block", marginTop: 8,
                                            padding: "3px 10px", borderRadius: 999, fontSize: 12,
                                            background: isCanceled ? "#fee2e2" : isPast ? "#e0e7ff" : (turno.estado === "pendiente" ? "#d1fae5" : "#f3f4f6"),
                                            color: isCanceled ? "#991b1b" : isPast ? "#3730a3" : (turno.estado === "pendiente" ? "#065f46" : "#6b7280"),
                                            fontWeight: 600,
                                        }}>
                                            {capitalize(statusLabel)}
                                        </span>
                                    </div>
                                    {(!isPast && !isCanceled) && (
                                        <button
                                            onClick={() => cancelarTurno(turno.id)}
                                            disabled={isCanceling}
                                            style={{
                                                flexShrink: 0,
                                                padding: "7px 13px",
                                                borderRadius: 10,
                                                border: "1px solid #fecaca",
                                                background: "#fff5f5",
                                                color: "#dc2626",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: isCanceling ? "not-allowed" : "pointer",
                                                opacity: isCanceling ? 0.5 : 1,
                                            }}
                                        >
                                            {isCanceling ? "..." : "Cancelar"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="dashboard-card professional-card">
                <div className="profile-block">
                    <div className="profile-block-header">
                        <img src={biotechIcon} alt="Especialidades" className="section-icon" />
                        <h3>Especialidades</h3>
                    </div>

                    <div className="selected-list chips-list">
                        {specialties.length > 0 ? (
                            specialties.map((spec) => (
                                <span key={spec} className="info-chip">{spec}</span>
                            ))
                        ) : (
                            <p className="empty-text">Todavía no agregaste especialidades.</p>
                        )}
                    </div>

                    <div className="options-grid">
                        {SPECIALTIES.map((spec) => (
                            <label
                                key={spec}
                                className={`option-card ${specialties.includes(spec) ? "selected" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={specialties.includes(spec)}
                                    onChange={() => toggleSelection(spec, specialties, setSpecialties)}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="option-text">{spec}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="profile-block">
                    <div className="profile-block-header">
                        <img src={locationIcon} alt="Sedes" className="section-icon" />
                        <h3>Sedes de atención</h3>
                    </div>

                    <div className="selected-list vertical-list">
                        {hospitals.length > 0 ? (
                            hospitals.map((hospital) => (
                                <div key={hospital} className="info-row">
                                    <img src={locationIcon} alt="" className="info-row-icon" />
                                    <span>{hospital}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-text">Todavía no agregaste sedes de atención.</p>
                        )}
                    </div>

                    <div className="options-grid">
                        {HOSPITALS.map((hospital) => (
                            <label
                                key={hospital}
                                className={`option-card ${hospitals.includes(hospital) ? "selected" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={hospitals.includes(hospital)}
                                    onChange={() => toggleSelection(hospital, hospitals, setHospitals)}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="option-text">{hospital}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {profileMsg && <p style={{ color: profileMsg.includes("✅") ? "green" : "red", fontSize: "0.9rem", paddingBottom: "10px" }}>{profileMsg}</p>}
                <button 
                    className="dashboard-button save-button" 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                >
                    {savingProfile ? "Guardando..." : "Guardar cambios"}
                </button>
            </div>

            {/* ── Horarios de atención ── */}
            <div className="dashboard-card schedule-card">
                <div className="schedule-header">
                    <div className="schedule-title-group">
                        <img src={clockIcon} alt="Horarios" className="section-icon" />
                        <h3>Horarios de atención</h3>
                    </div>

                    {!isEditingSchedule ? (
                        <button
                            className="schedule-secondary-button"
                            onClick={() => setIsEditingSchedule(true)}
                            disabled={loadingSchedule}
                        >
                            {loadingSchedule ? "Cargando..." : "Editar"}
                        </button>
                    ) : (
                        <div className="schedule-actions">
                            <button
                                className="schedule-save-button"
                                onClick={handleSaveSchedule}
                                disabled={savingSchedule}
                            >
                                {savingSchedule ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                                className="schedule-secondary-button"
                                onClick={() => { setIsEditingSchedule(false); setScheduleMsg(null); }}
                                disabled={savingSchedule}
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>

                {scheduleMsg && (
                    <p style={{ padding: "0 1rem 0.5rem", fontSize: "0.9rem" }}>{scheduleMsg}</p>
                )}

                {hospitals.length === 0 ? (
                    <p className="empty-text" style={{ padding: "1rem" }}>Agregá sedes de atención en tu perfil para configurar horarios.</p>
                ) : (
                    <>
                        <div className="schedule-tabs" style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "0 1rem 1rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1rem" }}>
                            {hospitals.map(h => (
                                <button 
                                    key={h}
                                    onClick={() => !isEditingSchedule && setActiveSede(h)}
                                    disabled={isEditingSchedule && activeSede !== h}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "99px",
                                        border: activeSede === h ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                        background: activeSede === h ? "#eef3ff" : "white",
                                        color: activeSede === h ? "#2f5cf5" : "#374151",
                                        fontWeight: activeSede === h ? 700 : 500,
                                        fontSize: 14,
                                        cursor: isEditingSchedule && activeSede !== h ? "not-allowed" : "pointer",
                                        opacity: isEditingSchedule && activeSede !== h ? 0.5 : 1,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>

                        {activeSede && scheduleMap[activeSede] && (
                            <div className="schedule-days">
                                {DIAS.map(({ nombre }) => {
                                    const dayData = scheduleMap[activeSede][nombre];
                                    if (!dayData) return null;
                                    return (
                                        <div
                                            key={nombre}
                                            className={`schedule-day-item ${!dayData.enabled ? "schedule-day-disabled" : ""}`}
                                        >
                                            <div className="schedule-day-top">
                                                <div className="schedule-day-left">
                                                    {isEditingSchedule && (
                                                        <label className="schedule-switch">
                                                            <input
                                                                type="checkbox"
                                                                checked={dayData.enabled}
                                                                onChange={() => toggleDaySchedule(nombre)}
                                                            />
                                                            <span className="schedule-slider"></span>
                                                        </label>
                                                    )}
                                                    <span className="schedule-day-name">{nombre}</span>
                                                </div>
                                                {!dayData.enabled && (
                                                    <span className="schedule-unavailable">No disponible</span>
                                                )}
                                            </div>

                                            {dayData.enabled && (
                                                <>
                                                    {isEditingSchedule ? (
                                                        <div className="schedule-time-row">
                                                            <span className="schedule-time-label">Horario:</span>
                                                            <input
                                                                type="time"
                                                                value={dayData.from}
                                                                className="schedule-time-input"
                                                                onChange={(e) =>
                                                                    updateScheduleTime(nombre, "from", e.target.value)
                                                                }
                                                            />
                                                            <span className="schedule-time-separator">-</span>
                                                            <input
                                                                type="time"
                                                                value={dayData.to}
                                                                className="schedule-time-input"
                                                                onChange={(e) =>
                                                                    updateScheduleTime(nombre, "to", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="schedule-time-display">
                                                            <span className="schedule-time-label">Horario:</span>
                                                            <span className="schedule-time-value">
                                                                {dayData.from} - {dayData.to} hs
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="dashboard-card">
                <h3>Configuración</h3>
                <button className="dashboard-button">Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Navbar role="doctor" />
        </div>
    );
}

export default DoctorDashboardPage;