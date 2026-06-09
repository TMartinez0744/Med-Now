import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";
import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";
import { formatDoctorName, stripDoctorPrefix } from "../lib/doctorName";
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

const OBRAS_SOCIALES = [
    "OSDE", "Swiss Medical", "Galeno", "IOMA", "Medifé",
    "Sancor Salud", "PAMI", "Accord Salud", "Medicus", "Omint",
];

type SlotDB = {
    id: string;
    medico_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    dia_nombre: string;
    sede: string | null;
    duracion_turno?: number;
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

    const [displayName, setDisplayName] = useState(formatDoctorName(doctorData.nombre_apellido, doctorData.licenseNumber));
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);

    // Valores reales del DB (cargados por el useEffect) — fuente de verdad para el modal de edición
    const [dbName, setDbName] = useState(stripDoctorPrefix(doctorData.nombre_apellido));
    const [dbDni, setDbDni] = useState<string>(doctorData.licenseNumber ?? "");

    const [draftName, setDraftName] = useState("");
    const [draftLastName, setDraftLastName] = useState("");
    const [draftDni, setDraftDni] = useState(doctorData.licenseNumber ?? "");
    const [draftEmail, setDraftEmail] = useState("");

    const [savingName, setSavingName] = useState(false);
    const [email, setEmail] = useState("");

    const openEditProfile = () => {
        const nameParts = dbName.split(/\s+/).filter(Boolean);
        setDraftName(nameParts[0] || "");
        setDraftLastName(nameParts.slice(1).join(" ") || "");
        setDraftDni(dbDni);
        setDraftEmail(email);
        setShowEditProfileModal(true);
    };

    const saveProfile = async () => {
        const cleanName = stripDoctorPrefix(draftName);
        const cleanLast = stripDoctorPrefix(draftLastName);
        if (!cleanName) { showToast("El nombre no puede estar vacío"); return; }
        if (draftEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftEmail.trim())) {
            showToast("El email no tiene un formato válido"); return;
        }
        setSavingName(true);
        const nombreCompleto = `${cleanName} ${cleanLast}`.trim();
        try {
            const [resProfile, resMedico] = await Promise.all([
                apiFetch(`/api/profiles/${medicoId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ nombre_apellido: nombreCompleto, dni: draftDni.trim() }),
                }),
                apiFetch(`/api/medicos/${medicoId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: draftEmail.trim() || null }),
                }),
            ]);

            const profileJson = await resProfile.json().catch(() => ({}));
            const medicoJson = await resMedico.json().catch(() => ({}));

            if (resProfile.ok && resMedico.ok) {
                const updated = {
                    ...doctorData,
                    nombre_apellido: nombreCompleto,
                    licenseNumber: draftDni.trim()
                };
                localStorage.setItem("doctorData", JSON.stringify(updated));
                localStorage.setItem("user", draftDni.trim());
                setDisplayName(formatDoctorName(nombreCompleto, draftDni.trim()));
                setDbName(nombreCompleto);
                setDbDni(draftDni.trim());
                setEmail(draftEmail.trim());
                setShowEditProfileModal(false);
                showToast("Perfil actualizado", "success");
            } else {
                const msg = profileJson?.message || medicoJson?.message || "No se pudieron guardar los cambios. Intentá de nuevo.";
                showToast(msg);
            }
        } catch (error) {
            console.error(error);
            showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
        }
        setSavingName(false);
    };

    const doctorLicense = dbDni
        ? `Matrícula: ${dbDni}`
        : "Matrícula: No disponible";

    const [specialties, setSpecialties] = useState<string[]>(
        doctorData.especialidades ?? []
    );
    const [hospitals, setHospitals] = useState<string[]>(
        doctorData.sedes ?? []
    );
    const [obrasSociales, setObrasSociales] = useState<string[]>([]);
    const isPerfilIncompleto = specialties.length === 0 || hospitals.length === 0 || !email;

    useEffect(() => {
        if (!medicoId) return;
        apiFetch(`/api/medicos/${medicoId}`)
            .then(r => r.json())
            .then(({ data }) => {
                if (data) {
                    setEmail(data.email ?? "");
                    setDraftEmail(data.email ?? "");
                    if (data.profiles) {
                        const cleanName = stripDoctorPrefix(data.profiles.nombre_apellido);
                        const realDni = data.profiles.dni ?? "";
                        setDbName(cleanName);
                        setDbDni(realDni);
                        const nameParts = cleanName.split(/\s+/).filter(Boolean);
                        setDraftName(nameParts[0] || "");
                        setDraftLastName(nameParts.slice(1).join(" ") || "");
                        setDraftDni(realDni);

                        // Sincronizar localStorage con el DNI real del DB si difiere
                        if (realDni && realDni !== doctorData.licenseNumber) {
                            const updated = { ...doctorData, licenseNumber: realDni, nombre_apellido: data.profiles.nombre_apellido };
                            localStorage.setItem("doctorData", JSON.stringify(updated));
                            localStorage.setItem("user", realDni);
                        }
                    }
                }
            })
            .catch(console.error);
    }, [medicoId]);

    useEffect(() => {
        if (!medicoId) return;
        apiFetch(`/api/medicos/${medicoId}/obras-sociales`)
            .then(r => r.json())
            .then(({ data }) => setObrasSociales(data ?? []));
    }, [medicoId]);

    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);

    // Turnos del médico
    const [turnos, setTurnos] = useState<TurnoMedico[]>([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [cancelandoId, setCelandoId] = useState<string | null>(null);
    const [fichaAbierta, setFichaAbierta] = useState<{ id: string; nombre: string } | null>(null);
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

    const cancelarTurno = (id: string) => setConfirmCancelId(id);

    const confirmarCancelarTurno = async () => {
        const id = confirmCancelId;
        if (!id) return;
        setConfirmCancelId(null);
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
            const [res, resObras] = await Promise.all([
                apiFetch(`/api/medicos/${medicoId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ especialidades: specialties, sedes: hospitals }),
                }),
                apiFetch(`/api/medicos/${medicoId}/obras-sociales`, {
                    method: "PUT",
                    body: JSON.stringify({ obras_sociales: obrasSociales }),
                }),
            ]);
            const data = await res.json();
            if (data.success && resObras.ok) {
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

    const [duracionTurno, setDuracionTurno] = useState<number>(30);
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

    // Cargar mensajes sin leer por paciente (para mostrar punto naranja en "Chatear")
    const [unreadByPaciente, setUnreadByPaciente] = useState<Record<string, number>>({});
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
                if (data[0]?.duracion_turno) setDuracionTurno(data[0].duracion_turno);

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

    const handleStartChat = async (pacienteId: string) => {
        try {
            const res = await apiFetch("/api/chats/room", {
                method: "POST",
                body: JSON.stringify({
                    paciente_id: pacienteId,
                    medico_id: medicoId
                })
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

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("doctorData");
        localStorage.removeItem("token");
        navigate("/");
    };

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    const changePassword = async () => {
        if (!currentPassword || !newPassword) { showToast("Completá todos los campos"); return; }
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
            showToast("La contraseña debe tener al menos 8 caracteres, una letra y un número"); return;
        }
        if (newPassword !== confirmPassword) { showToast("Las contraseñas no coinciden"); return; }
        setSavingPassword(true);
        try {
            const res = await apiFetch("/api/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const json = await res.json();
            if (res.ok) {
                showToast("Contraseña actualizada", "success");
                setShowPasswordModal(false);
                setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
            } else {
                showToast(json.message ?? "Error al cambiar la contraseña");
            }
        } catch { showToast("Error al cambiar la contraseña"); }
        setSavingPassword(false);
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
        
        if (isPerfilIncompleto) {
            showToast("Debés configurar al menos una especialidad y una sede de atención antes de guardar tus horarios.");
            return;
        }

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
                                duracion_turno: duracionTurno,
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

            {/* ── Banner perfil incompleto ── */}
            {isPerfilIncompleto && (
                <div className="dashboard-card" style={{
                    background: "#fffbeb", border: "1.5px solid #fbbf24",
                    display: "flex", alignItems: "flex-start", gap: 12,
                    margin: "0 0 20px"
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#92400e" }}>Completá tu perfil profesional</p>
                        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#b45309" }}>
                            Falta configurar tus especialidades, sedes de atención o tu dirección de correo electrónico para recibir notificaciones de nuevos turnos.
                        </p>
                        <button
                            onClick={openEditProfile}
                            style={{ background: "#d97706", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                            Completar ahora
                        </button>
                    </div>
                </div>
            )}

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
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
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
                                            onClick={() => cancelarTurno(turno.id)}
                                            disabled={isCanceling}
                                            style={{
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

                <div className="profile-block">
                    <div className="profile-block-header">
                        <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <h3>Obras sociales que atendés</h3>
                    </div>

                    <div className="selected-list chips-list">
                        {obrasSociales.length > 0 ? (
                            obrasSociales.map((o) => (
                                <span key={o} className="info-chip">{o}</span>
                            ))
                        ) : (
                            <p className="empty-text">Sin restricción — atendés todos los planes.</p>
                        )}
                    </div>

                    <div className="options-grid">
                        {OBRAS_SOCIALES.map((o) => (
                            <label
                                key={o}
                                className={`option-card ${obrasSociales.includes(o) ? "selected" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={obrasSociales.includes(o)}
                                    onChange={() => toggleSelection(o, obrasSociales, setObrasSociales)}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="option-text">{o}</span>
                            </label>
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                        Si no seleccionás ninguna, aparecés para todos los pacientes.
                    </p>
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
                            disabled={loadingSchedule || isPerfilIncompleto}
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

                {isPerfilIncompleto && (
                    <div style={{
                        background: "#fffbeb",
                        border: "1.5px solid #fbbf24",
                        borderRadius: 14,
                        padding: "12px 14px",
                        margin: "0 1rem 1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                    }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#92400e" }}>
                            ⚠️ Perfil profesional incompleto
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "#b45309" }}>
                            Debés configurar al menos una especialidad, una sede de atención y tu correo electrónico de contacto en tu Perfil para poder publicar tus horarios de atención.
                        </p>
                    </div>
                )}

                {/* Duración del turno */}
                <div style={{ padding: "0 1rem 1rem" }}>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Duración de cada turno</p>
                    <div style={{ display: "flex", gap: 8 }}>
                        {[15, 30, 45, 60].map((min) => (
                            <button
                                key={min}
                                onClick={() => isEditingSchedule && setDuracionTurno(min)}
                                style={{
                                    padding: "8px 16px", borderRadius: 10, cursor: isEditingSchedule ? "pointer" : "default",
                                    border: duracionTurno === min ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                    background: duracionTurno === min ? "#eef3ff" : "#f9fafb",
                                    color: duracionTurno === min ? "#2f5cf5" : "#6b7280",
                                    fontWeight: duracionTurno === min ? 700 : 500,
                                    fontSize: 14,
                                    opacity: !isEditingSchedule && duracionTurno !== min ? 0.5 : 1,
                                }}
                            >
                                {min === 60 ? "1 h" : `${min} min`}
                            </button>
                        ))}
                    </div>
                </div>

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
                <button className="dashboard-button" onClick={openEditProfile}>Editar Perfil</button>
                <button className="dashboard-button" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(true); }}>Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

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
                            <button className="chat-confirm-delete" onClick={confirmarCancelarTurno}>
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

            {/* modal editar perfil */}
            {showEditProfileModal && (
                <div style={overlayStyle} onClick={() => setShowEditProfileModal(false)}>
                    <div style={{ ...modalStyle, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Editar Perfil</h3>
                            <button onClick={() => setShowEditProfileModal(false)} style={closeBtnStyle}>✕</button>
                        </div>

                        <label style={labelStyle}>Nombre</label>
                        <input
                            className="auth-input"
                            placeholder="Nombre"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Apellido</label>
                        <input
                            className="auth-input"
                            placeholder="Apellido"
                            value={draftLastName}
                            onChange={(e) => setDraftLastName(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>DNI / Matrícula</label>
                        <input
                            className="auth-input"
                            placeholder="DNI o Matrícula"
                            value={draftDni}
                            onChange={(e) => setDraftDni(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Email</label>
                        <input
                            className="auth-input"
                            placeholder="ejemplo@mail.com"
                            type="email"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            style={{ marginBottom: 24 }}
                        />

                        <button className="auth-button" onClick={saveProfile} disabled={savingName}>
                            {savingName ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            )}

            {/* modal cambiar contraseña */}
            {showPasswordModal && (
                <div style={overlayStyle} onClick={() => setShowPasswordModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Cambiar contraseña</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={closeBtnStyle}>✕</button>
                        </div>
                        <label style={labelStyle}>Contraseña actual</label>
                        <input className="auth-input" type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ marginBottom: 12 }} />
                        <label style={labelStyle}>Nueva contraseña</label>
                        <input className="auth-input" type="password" placeholder="Mínimo 8 caracteres, una letra y un número" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ marginBottom: 12 }} />
                        <label style={labelStyle}>Confirmar nueva contraseña</label>
                        <input className="auth-input" type="password" placeholder="Repetí la nueva contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ marginBottom: 24 }} />
                        <button className="auth-button" onClick={changePassword} disabled={savingPassword}>
                            {savingPassword ? "Guardando..." : "Confirmar"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    fontSize: 13, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4,
};

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