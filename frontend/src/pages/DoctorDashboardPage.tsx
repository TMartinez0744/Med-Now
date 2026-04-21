import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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

    const capitalize = (text: string) =>
        text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    const buildDoctorName = (raw: string) =>
        raw
            ? raw.match(/^Dr[a]?\./i) ? raw : `Dr. ${raw}`
            : doctorData.licenseNumber
            ? `Dr. Matrícula ${doctorData.licenseNumber}`
            : "Dr. Usuario";

    const [displayName, setDisplayName] = useState(buildDoctorName(doctorData.nombre_apellido ?? ""));
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [draftNombre, setDraftNombre] = useState(doctorData.nombre_apellido ?? "");
    const [savingName, setSavingName] = useState(false);

    const saveProfileName = async () => {
        if (!draftNombre.trim()) return;
        setSavingName(true);
        const { error } = await supabase
            .from("profiles")
            .update({ nombre_apellido: draftNombre.trim() })
            .eq("id", medicoId);
        if (!error) {
            const updated = { ...doctorData, nombre_apellido: draftNombre.trim() };
            localStorage.setItem("doctorData", JSON.stringify(updated));
            setDisplayName(buildDoctorName(draftNombre.trim()));
            setShowEditProfileModal(false);
        } else {
            alert("Error al guardar: " + error.message);
        }
        setSavingName(false);
    };

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
    const [turnos, setTurnos] = useState<TurnoMedico[]>([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [cancelandoId, setCelandoId] = useState<string | null>(null);

    const cancelarTurno = async (id: string) => {
        if (!confirm("¿Cancelar este turno?")) return;
        setCelandoId(id);
        try {
            const res = await fetch(`${API}/turnos/${id}/cancelar`, { method: "PATCH" });
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
            const res = await fetch(`${API}/medicos/${medicoId}`, {
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

    // Estado del horario: día → { enabled, from, to, slotId }
    const defaultSchedule = (): Record<string, DaySchedule> =>
        Object.fromEntries(
            DIAS.map(({ nombre }) => [
                nombre,
                { enabled: !["Sábado", "Domingo"].includes(nombre), from: "08:00", to: "18:00", slotId: null },
            ])
        );

    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(defaultSchedule());

    // Cargar turnos del médico
    useEffect(() => {
        if (!medicoId) return;
        setLoadingTurnos(true);
        fetch(`${API}/medicos/${medicoId}/turnos`)
            .then((r) => r.json())
            .then(({ data }) => setTurnos(data ?? []))
            .catch(console.error)
            .finally(() => setLoadingTurnos(false));
    }, [medicoId]);

    // Cargar disponibilidad desde la API al montar
    useEffect(() => {
        if (!medicoId) return;

        setLoadingSchedule(true);
        fetch(`${API}/medicos/${medicoId}/disponibilidad`)
            .then((r) => r.json())
            .then(({ data }: { data: SlotDB[] }) => {
                if (!data || data.length === 0) return;
                setSchedule((prev) => {
                    const updated = { ...prev };
                    // Marcar todos como deshabilitados primero
                    DIAS.forEach(({ nombre }) => {
                        updated[nombre] = { ...updated[nombre], enabled: false, slotId: null };
                    });
                    // Activar los que vienen de la bbdd
                    data.forEach((slot) => {
                        const dia = DIAS.find((d) => d.index === slot.dia_semana);
                        if (dia) {
                            updated[dia.nombre] = {
                                enabled: true,
                                from: slot.hora_inicio.slice(0, 5),
                                to: slot.hora_fin.slice(0, 5),
                                slotId: slot.id,
                            };
                        }
                    });
                    return updated;
                });
            })
            .catch(console.error)
            .finally(() => setLoadingSchedule(false));
    }, [medicoId]);

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
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled },
        }));
    };

    const updateScheduleTime = (day: string, field: "from" | "to", value: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
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
            await fetch(`${API}/medicos/${medicoId}/disponibilidad`, { method: "DELETE" });

            // 2. Crear los nuevos slots para los días habilitados
            const creates = DIAS.filter(({ nombre }) => schedule[nombre]?.enabled).map(
                ({ nombre, index }) =>
                    fetch(`${API}/medicos/${medicoId}/disponibilidad`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            dia_semana: index,
                            hora_inicio: schedule[nombre].from,
                            hora_fin: schedule[nombre].to,
                        }),
                    }).then((r) => r.json())
            );

            const results = await Promise.all(creates);
            const hasError = results.some((r) => !r.success);
            if (hasError) {
                setScheduleMsg("⚠️ Algunos horarios no se guardaron correctamente.");
            } else {
                setScheduleMsg("✅ Horarios guardados correctamente.");
            }

            // Recargar para actualizar los slotIds
            const fresh = await fetch(`${API}/medicos/${medicoId}/disponibilidad`).then((r) => r.json());
            if (fresh.data) {
                setSchedule((prev) => {
                    const updated = { ...prev };
                    DIAS.forEach(({ nombre }) => {
                        updated[nombre] = { ...updated[nombre], slotId: null };
                    });
                    (fresh.data as SlotDB[]).forEach((slot) => {
                        const dia = DIAS.find((d) => d.index === slot.dia_semana);
                        if (dia) updated[dia.nombre].slotId = slot.id;
                    });
                    return updated;
                });
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
                    <h2 className="dashboard-name">{displayName}</h2>
                    <p className="dashboard-sub">{doctorLicense}</p>
                </div>
            </div>

            {/* ── Card Próximos Turnos ── */}
            <div className="dashboard-card">
                <div className="profile-block-header" style={{ marginBottom: 14 }}>
                    <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Próximos Turnos</h3>
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
                            return (
                                <div
                                    key={turno.id}
                                    style={{
                                        background: "#f9fafb", borderRadius: 14,
                                        padding: "14px 16px", border: "1px solid #f3f4f6",
                                        display: "flex", justifyContent: "space-between",
                                        alignItems: "center", gap: 12,
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
                                            background: turno.estado === "pendiente" ? "#d1fae5" : "#f3f4f6",
                                            color: turno.estado === "pendiente" ? "#065f46" : "#6b7280",
                                            fontWeight: 600,
                                        }}>
                                            {turno.estado}
                                        </span>
                                    </div>
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
                        {[...new Set([...SPECIALTIES, ...specialties])].map((spec) => (
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
                        {[...new Set([...HOSPITALS, ...hospitals])].map((hospital) => (
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

                <div className="schedule-days">
                    {DIAS.map(({ nombre }) => {
                        const dayData = schedule[nombre];
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
            </div>

            <div className="dashboard-card">
                <h3>Configuración</h3>
                <button className="dashboard-button" onClick={() => { setDraftNombre(doctorData.nombre_apellido ?? ""); setShowEditProfileModal(true); }}>Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Navbar role="doctor" />

            {/* modal editar perfil */}
            {showEditProfileModal && (
                <div style={overlayStyle} onClick={() => setShowEditProfileModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Editar Perfil</h3>
                            <button onClick={() => setShowEditProfileModal(false)} style={closeBtnStyle}>✕</button>
                        </div>
                        <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4 }}>Nombre y apellido</label>
                        <input
                            className="auth-input"
                            placeholder="Ej: García López"
                            value={draftNombre}
                            onChange={(e) => setDraftNombre(e.target.value)}
                            style={{ marginBottom: 20 }}
                            autoFocus
                        />
                        <button className="auth-button" onClick={saveProfileName} disabled={savingName}>
                            {savingName ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            )}
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

export default DoctorDashboardPage;