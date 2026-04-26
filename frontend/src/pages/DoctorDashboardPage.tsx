import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";
import FichaPaciente from "../components/FichaPaciente";

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
    sede: string | null;
};

type Interval = {
    from: string;
    to: string;
    slotId: string | null;
};

type DaySchedule = {
    enabled: boolean;
    intervals: Interval[];
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
            showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
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
    const [fichaAbierta, setFichaAbierta] = useState<{ id: string; nombre: string } | null>(null);

    const cancelarTurno = async (id: string) => {
        if (!confirm("¿Cancelar este turno?")) return;
        setCelandoId(id);
        try {
            const res = await apiFetch(`/api/turnos/${id}/cancelar`, { method: "PATCH" });
            if (res.ok) {
                setTurnos((prev) => prev.filter((t) => t.id !== id));
            } else {
                showToast("No se pudo cancelar el turno. Intentá de nuevo.");
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
            const res = await apiFetch(`/api/medicos/${medicoId}`, {
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
    const [selectedSede, setSelectedSede] = useState<string | null>(
        doctorData.sedes?.[0] ?? null
    );

    // Estado del horario: sede → día → { enabled, intervals[] }
    const defaultSedeSchedule = (): Record<string, DaySchedule> =>
        Object.fromEntries(
            DIAS.map(({ nombre }) => [
                nombre,
                {
                    enabled: !["Sábado", "Domingo"].includes(nombre),
                    intervals: [{ from: "08:00", to: "18:00", slotId: null }],
                },
            ])
        );

    const [schedulesBySede, setSchedulesBySede] = useState<Record<string, Record<string, DaySchedule>>>({});

    // Cargar turnos del médico
    useEffect(() => {
        if (!medicoId) return;
        setLoadingTurnos(true);
        apiFetch(`/api/medicos/${medicoId}/turnos`)
            .then((r) => r.json())
            .then(({ data }) => setTurnos(data ?? []))
            .catch(console.error)
            .finally(() => setLoadingTurnos(false));
    }, [medicoId]);

    // Cuando cambian las sedes, asegurar que selectedSede sea válida
    useEffect(() => {
        setSelectedSede((prev) => {
            if (hospitals.length === 0) return null;
            if (prev && hospitals.includes(prev)) return prev;
            return hospitals[0];
        });
    }, [hospitals]);

    // Cargar disponibilidad desde la API al montar
    useEffect(() => {
        if (!medicoId) return;

        setLoadingSchedule(true);
        apiFetch(`/api/medicos/${medicoId}/disponibilidad`)
            .then((r) => r.json())
            .then(({ data }: { data: SlotDB[] }) => {
                console.log('[load disponibilidad]', data);
                if (!data || data.length === 0) return;

                const bySedeDay: Record<string, Record<string, Interval[]>> = {};
                data.forEach((slot) => {
                    const sedeName = slot.sede ?? "__sin_sede__";
                    const diaObj = DIAS.find((d) => d.index === slot.dia_semana);
                    if (!diaObj) return;
                    if (!bySedeDay[sedeName]) bySedeDay[sedeName] = {};
                    if (!bySedeDay[sedeName][diaObj.nombre]) bySedeDay[sedeName][diaObj.nombre] = [];
                    bySedeDay[sedeName][diaObj.nombre].push({
                        from: slot.hora_inicio.slice(0, 5),
                        to: slot.hora_fin.slice(0, 5),
                        slotId: slot.id,
                    });
                });

                const built: Record<string, Record<string, DaySchedule>> = {};
                Object.entries(bySedeDay).forEach(([sede, days]) => {
                    built[sede] = {};
                    DIAS.forEach(({ nombre }) => {
                        const intervals = days[nombre];
                        built[sede][nombre] = intervals
                            ? { enabled: true, intervals }
                            : { enabled: false, intervals: [{ from: "08:00", to: "18:00", slotId: null }] };
                    });
                });
                setSchedulesBySede(built);
            })
            .catch(console.error)
            .finally(() => setLoadingSchedule(false));
    }, [medicoId]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("doctorData");
        localStorage.removeItem("token");
        navigate("/");
    };

    const toggleSelection = (
        value: string,
        list: string[],
        setList: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setList(list.includes(value) ? list.filter((i) => i !== value) : [...list, value]);
    };

    const getSedeSchedule = (sede: string): Record<string, DaySchedule> =>
        schedulesBySede[sede] ?? defaultSedeSchedule();

    const addMinutes = (time: string, mins: number): string => {
        const [h, m] = time.split(":").map(Number);
        const total = h * 60 + m + mins;
        return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    };
    const addMinute = (time: string) => addMinutes(time, 1);
    const addHour  = (time: string) => addMinutes(time, 60);

    const toggleDaySchedule = (day: string) => {
        if (!selectedSede) return;
        setSchedulesBySede((prev) => {
            const sedeSchedule = prev[selectedSede] ?? defaultSedeSchedule();
            return {
                ...prev,
                [selectedSede]: {
                    ...sedeSchedule,
                    [day]: { ...sedeSchedule[day], enabled: !sedeSchedule[day].enabled },
                },
            };
        });
    };

    const updateInterval = (day: string, idx: number, field: "from" | "to", value: string) => {
        if (!selectedSede) return;
        setSchedulesBySede((prev) => {
            const sedeSchedule = prev[selectedSede] ?? defaultSedeSchedule();
            const dayData = sedeSchedule[day];
            let newIntervals = dayData.intervals.map((iv, i) =>
                i === idx ? { ...iv, [field]: value } : iv
            );

            // Asegurar que el fin sea siempre posterior al inicio del mismo intervalo
            if (field === "from" && newIntervals[idx].to <= value) {
                newIntervals[idx] = { ...newIntervals[idx], to: addMinute(value) };
            }
            if (field === "to" && newIntervals[idx].from >= value) {
                newIntervals[idx] = { ...newIntervals[idx], from: value, to: addMinute(value) };
            }

            // Si existe un segundo intervalo, asegurar que empiece al menos 1 hora después del fin del primero
            if (newIntervals.length === 2 && newIntervals[1].from <= newIntervals[0].to) {
                const newFrom = addHour(newIntervals[0].to);
                const newTo = newFrom >= newIntervals[1].to ? addHour(newFrom) : newIntervals[1].to;
                newIntervals[1] = { ...newIntervals[1], from: newFrom, to: newTo };
            }

            return {
                ...prev,
                [selectedSede]: { ...sedeSchedule, [day]: { ...dayData, intervals: newIntervals } },
            };
        });
    };

    const addInterval = (day: string) => {
        if (!selectedSede) return;
        setSchedulesBySede((prev) => {
            const sedeSchedule = prev[selectedSede] ?? defaultSedeSchedule();
            const dayData = sedeSchedule[day];
            if (dayData.intervals.length >= 2) return prev;
            return {
                ...prev,
                [selectedSede]: {
                    ...sedeSchedule,
                    [day]: {
                        ...dayData,
                        intervals: (() => {
                const morningEnd = dayData.intervals[0]?.to ?? "13:00";
                const defaultFrom = addHour(morningEnd) >= "15:00" ? addHour(morningEnd) : "15:00";
                const defaultTo = defaultFrom >= "18:00" ? addHour(defaultFrom) : "18:00";
                return [...dayData.intervals, { from: defaultFrom, to: defaultTo, slotId: null }];
            })(),
                    },
                },
            };
        });
    };

    const removeInterval = (day: string, idx: number) => {
        if (!selectedSede) return;
        setSchedulesBySede((prev) => {
            const sedeSchedule = prev[selectedSede] ?? defaultSedeSchedule();
            const dayData = sedeSchedule[day];
            const newIntervals = dayData.intervals.filter((_, i) => i !== idx);
            return {
                ...prev,
                [selectedSede]: {
                    ...sedeSchedule,
                    [day]: {
                        ...dayData,
                        intervals: newIntervals.length > 0 ? newIntervals : [{ from: "08:00", to: "18:00", slotId: null }],
                    },
                },
            };
        });
    };

    // Guardar horario de la sede seleccionada
    const handleSaveSchedule = async () => {
        if (!medicoId || !selectedSede) return;
        setSavingSchedule(true);
        setScheduleMsg(null);
        const currentSchedule = getSedeSchedule(selectedSede);
        try {
            // 1. Borrar slots de esta sede
            await apiFetch(
                `/api/medicos/${medicoId}/disponibilidad?sede=${encodeURIComponent(selectedSede)}`,
                { method: "DELETE" }
            );

            // 2. Crear slots de esta sede
            const creates: Promise<{ success: boolean }>[] = [];
            DIAS.forEach(({ nombre, index }) => {
                const day = currentSchedule[nombre];
                if (!day?.enabled) return;
                day.intervals.forEach((interval) => {
                    creates.push(
                        apiFetch(`/api/medicos/${medicoId}/disponibilidad`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                dia_semana: index,
                                hora_inicio: interval.from,
                                hora_fin: interval.to,
                                sede: selectedSede,
                            }),
                        }).then((r) => r.json())
                    );
                });
            });

            const results = await Promise.all(creates);
            const hasError = results.some((r) => !r.success);
            setScheduleMsg(
                hasError
                    ? "⚠️ Algunos horarios no se guardaron correctamente."
                    : "✅ Horarios guardados correctamente."
            );
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
                                    <div style={{ flex: 1 }}>
                                        <button
                                            onClick={() => setFichaAbierta({ id: turno.paciente_id, nombre: nombrePaciente })}
                                            style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}
                                        >
                                            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#2f5cf5", textDecoration: "underline dotted" }}>
                                                {nombrePaciente}
                                            </p>
                                        </button>
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
                            disabled={loadingSchedule || hospitals.length === 0}
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
                    <p className="empty-text" style={{ padding: "0 1rem 1rem" }}>
                        Agregá al menos una sede de atención para configurar horarios.
                    </p>
                ) : (
                    <>
                        {/* Tabs de hospitales */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 1rem 1rem" }}>
                            {hospitals.map((h) => (
                                <button
                                    key={h}
                                    onClick={() => { setSelectedSede(h); setIsEditingSchedule(false); setScheduleMsg(null); }}
                                    style={{
                                        padding: "6px 14px",
                                        borderRadius: 999,
                                        border: "1.5px solid",
                                        borderColor: selectedSede === h ? "#2f5cf5" : "#e5e7eb",
                                        background: selectedSede === h ? "#eef2ff" : "#fff",
                                        color: selectedSede === h ? "#2f5cf5" : "#6b7280",
                                        fontWeight: selectedSede === h ? 700 : 400,
                                        fontSize: 13,
                                        cursor: "pointer",
                                    }}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>

                        {selectedSede && (
                            <div className="schedule-days">
                                {DIAS.map(({ nombre }) => {
                                    const dayData = getSedeSchedule(selectedSede)[nombre];
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
                                                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                                                    {dayData.intervals.map((interval, idx) => (
                                                        <div key={idx} className="schedule-time-row">
                                                            <span className="schedule-time-label">
                                                                {dayData.intervals.length > 1
                                                                    ? idx === 0 ? "Mañana:" : "Tarde:"
                                                                    : "Horario:"}
                                                            </span>
                                                            {isEditingSchedule ? (
                                                                <>
                                                                    <input
                                                                        type="time"
                                                                        value={interval.from}
                                                                        className="schedule-time-input"
                                                                        min={idx > 0 ? addHour(dayData.intervals[0].to) : undefined}
                                                                        onChange={(e) => updateInterval(nombre, idx, "from", e.target.value)}
                                                                    />
                                                                    <span className="schedule-time-separator">-</span>
                                                                    <input
                                                                        type="time"
                                                                        value={interval.to}
                                                                        className="schedule-time-input"
                                                                        min={addMinute(interval.from)}
                                                                        onChange={(e) => updateInterval(nombre, idx, "to", e.target.value)}
                                                                    />
                                                                    {idx > 0 && (
                                                                        <button
                                                                            onClick={() => removeInterval(nombre, idx)}
                                                                            style={{
                                                                                marginLeft: 4,
                                                                                background: "none",
                                                                                border: "none",
                                                                                color: "#dc2626",
                                                                                cursor: "pointer",
                                                                                fontSize: 16,
                                                                                lineHeight: 1,
                                                                                padding: "0 2px",
                                                                            }}
                                                                            title="Eliminar turno"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="schedule-time-value">
                                                                    {interval.from} - {interval.to} hs
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {isEditingSchedule && dayData.intervals.length < 2 && (
                                                        <button
                                                            onClick={() => addInterval(nombre)}
                                                            style={{
                                                                alignSelf: "flex-start",
                                                                marginTop: 2,
                                                                padding: "3px 10px",
                                                                borderRadius: 8,
                                                                border: "1.5px dashed #2f5cf5",
                                                                background: "none",
                                                                color: "#2f5cf5",
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            + Agregar turno tarde
                                                        </button>
                                                    )}
                                                </div>
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
                <button className="dashboard-button" onClick={() => { setDraftNombre(doctorData.nombre_apellido ?? ""); setShowEditProfileModal(true); }}>Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Navbar role="doctor" />

            {/* ficha paciente */}
            {fichaAbierta && (
                <FichaPaciente
                    pacienteId={fichaAbierta.id}
                    nombrePaciente={fichaAbierta.nombre}
                    onClose={() => setFichaAbierta(null)}
                />
            )}

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