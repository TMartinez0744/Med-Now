import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";
import { useState, useEffect } from "react";
import { authFetch } from "../utils/authFetch";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const overlayStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999,
    display: "flex", justifyContent: "center", alignItems: "flex-end",
};

const modalStyle: React.CSSProperties = {
    background: "#fff", width: "100%", maxWidth: "600px", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: "24px", boxSizing: "border-box", paddingBottom: "40px",
    animation: "slideUp 0.3s ease-out", maxHeight: "90vh", overflowY: "auto",
};

const modalHeaderStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
};

const closeBtnStyle: React.CSSProperties = {
    background: "transparent", border: "none", fontSize: 24, color: "#6b7280", cursor: "pointer",
};

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

    // Redirect to login if unauthenticated
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !medicoId) {
            navigate("/login/doctor");
        }
    }, [navigate, medicoId]);

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
        try {
            const res = await apiFetch(`/api/profiles/${medicoId}`, {
                method: "PATCH",
                body: JSON.stringify({ nombre_apellido: draftNombre.trim() }),
            });
            if (res.ok) {
                const updated = { ...doctorData, nombre_apellido: draftNombre.trim() };
                localStorage.setItem("doctorData", JSON.stringify(updated));
                setDisplayName(buildDoctorName(draftNombre.trim()));
                setShowEditProfileModal(false);
            } else {
                showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
            }
        } catch {
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
    const [obrasSociales, setObrasSociales] = useState<string[]>([]);

    useEffect(() => {
        if (!medicoId) return;
        apiFetch(`/api/medicos/${medicoId}/obras-sociales`)
            .then(r => r.json())
            .then(({ data }) => setObrasSociales(data ?? []));
    }, [medicoId]);

    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<string | null>(null);

    // Turnos del médico
    const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");
    const [turnos, setTurnos] = useState<TurnoMedico[]>([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [cancelandoId, setCelandoId] = useState<string | null>(null);
    const [fichaAbierta, setFichaAbierta] = useState<{ id: string; nombre: string } | null>(null);

    // Modal de Ficha Médica
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [selectedPatientData, setSelectedPatientData] = useState<any>(null);
    const [loadingPatient, setLoadingPatient] = useState(false);

    const handleViewPatient = async (pacienteId: string) => {
        setLoadingPatient(true);
        setShowPatientModal(true);
        try {
            const res = await authFetch(`${API}/pacientes/${pacienteId}`);
            if (res.ok) {
                const json = await res.json();
                setSelectedPatientData(json.data);
            } else {
                alert("Error al obtener la ficha médica.");
                setShowPatientModal(false);
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión.");
            setShowPatientModal(false);
        } finally {
            setLoadingPatient(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById("pdf-content");
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Ficha_Medica_${selectedPatientData?.profiles?.nombre_apellido || "Paciente"}.pdf`);
        } catch (err) {
            console.error("Error generando PDF", err);
            alert("No se pudo generar el PDF.");
        }
    };

    const cancelarTurno = async (id: string) => {
        if (!confirm("¿Cancelar este turno?")) return;
        setCelandoId(id);
        try {
            const res = await authFetch(`${API}/turnos/${id}/cancelar`, { method: "PATCH" });
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
            const res = await authFetch(`${API}/medicos/${medicoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ especialidades: specialties, sedes: hospitals }),
            });
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

    const [activeSede, setActiveSede] = useState<string>("");

    const defaultDaySchedule = (): Record<string, DaySchedule> =>
        Object.fromEntries(
            DIAS.map(({ nombre }) => [
                nombre,
                {
                    enabled: !["Sábado", "Domingo"].includes(nombre),
                    intervals: [{ from: "08:00", to: "18:00", slotId: null }],
                },
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
                    <h2 className="dashboard-name">{displayName}</h2>
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
                                            background: isCanceled ? "#fee2e2" : isPast ? "#e0e7ff" : (turno.estado === "pendiente" ? "#d1fae5" : "#f3f4f6"),
                                            color: isCanceled ? "#991b1b" : isPast ? "#3730a3" : (turno.estado === "pendiente" ? "#065f46" : "#6b7280"),
                                            fontWeight: 600,
                                        }}>
                                            {capitalize(statusLabel)}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={() => handleViewPatient(turno.paciente_id)}
                                            style={{
                                                flexShrink: 0,
                                                padding: "7px 13px",
                                                borderRadius: 10,
                                                border: "1px solid #bfdbfe",
                                                background: "#eff6ff",
                                                color: "#1d4ed8",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Ver Ficha
                                        </button>
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
                <button className="dashboard-button" onClick={() => { setDraftNombre(doctorData.nombre_apellido ?? ""); setShowEditProfileModal(true); }}>Editar Perfil</button>
                <button className="dashboard-button" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(true); }}>Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Navbar role="doctor" />
            {/* Modal de Ficha Médica del Paciente */}
            {showPatientModal && (
                <div style={overlayStyle} onClick={() => setShowPatientModal(false)}>
                    <div style={{ ...modalStyle, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Ficha Médica</h3>
                            <button onClick={() => setShowPatientModal(false)} style={closeBtnStyle}>✕</button>
                        </div>
                        
                        {loadingPatient ? (
                            <p style={{ textAlign: "center", color: "#6b7280" }}>Cargando datos del paciente...</p>
                        ) : selectedPatientData ? (
                            <>
                                <div id="pdf-content" style={{ padding: "10px", background: "white", borderRadius: "8px" }}>
                                    <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #2f5cf5", paddingBottom: "10px" }}>
                                        <h2 style={{ margin: "0", color: "#2f5cf5", fontSize: "24px" }}>MedNow</h2>
                                        <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: "14px" }}>Historial Clínico Digital</p>
                                    </div>
                                    
                                    <div style={{ marginBottom: "20px" }}>
                                        <h4 style={{ margin: "0 0 5px", color: "#111827", fontSize: "16px" }}>Datos del Paciente</h4>
                                        <p style={{ margin: "2px 0", fontSize: "14px", color: "#374151" }}><strong>Nombre:</strong> {selectedPatientData.profiles?.nombre_apellido || "N/A"}</p>
                                        <p style={{ margin: "2px 0", fontSize: "14px", color: "#374151" }}><strong>DNI:</strong> {selectedPatientData.profiles?.dni || "N/A"}</p>
                                        <p style={{ margin: "2px 0", fontSize: "14px", color: "#374151" }}><strong>Obra Social:</strong> {selectedPatientData.obra_social || "No especificada"}</p>
                                    </div>

                                    <div style={{ marginBottom: "20px" }}>
                                        <h4 style={{ margin: "0 0 8px", color: "#111827", fontSize: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>Condiciones Médicas</h4>
                                        {selectedPatientData.ficha_medica?.condiciones && selectedPatientData.ficha_medica.condiciones.length > 0 ? (
                                            <ul style={{ margin: 0, paddingLeft: "20px", color: "#374151", fontSize: "14px" }}>
                                                {selectedPatientData.ficha_medica.condiciones.map((c: any) => (
                                                    <li key={c.id} style={{ marginBottom: "4px" }}>{c.label}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontStyle: "italic" }}>Ninguna registrada.</p>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: "20px" }}>
                                        <h4 style={{ margin: "0 0 8px", color: "#111827", fontSize: "16px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>Alergias</h4>
                                        {selectedPatientData.ficha_medica?.alergias && selectedPatientData.ficha_medica.alergias.length > 0 ? (
                                            <ul style={{ margin: 0, paddingLeft: "20px", color: "#b45309", fontSize: "14px" }}>
                                                {selectedPatientData.ficha_medica.alergias.map((a: any) => (
                                                    <li key={a.id} style={{ marginBottom: "4px" }}>{a.label}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontStyle: "italic" }}>Ninguna registrada.</p>
                                        )}
                                    </div>
                                    
                                    <div style={{ marginTop: "30px", fontSize: "11px", color: "#9ca3af", textAlign: "center", borderTop: "1px solid #f3f4f6", paddingTop: "10px" }}>
                                        Documento generado automáticamente por MedNow el {new Date().toLocaleDateString("es-AR")}
                                    </div>
                                </div>
                                
                                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                                    <button 
                                        onClick={() => setShowPatientModal(false)}
                                        style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", background: "white", color: "#374151", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        onClick={handleDownloadPDF}
                                        style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#10b981", color: "white", fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        Exportar PDF
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p style={{ textAlign: "center", color: "#ef4444" }}>Datos no encontrados.</p>
                        )}
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