import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";

const DIAS_SEMANA = [
    { label: "Dom", index: 0 },
    { label: "Lun", index: 1 },
    { label: "Mar", index: 2 },
    { label: "Mié", index: 3 },
    { label: "Jue", index: 4 },
    { label: "Vie", index: 5 },
    { label: "Sáb", index: 6 },
];

const DIA_NOMBRE: Record<number, string> = {
    0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
    4: "Jueves", 5: "Viernes", 6: "Sábado",
};

type Slot = {
    id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    sede: string | null;
    duracion_turno: number;
};

type Medico = {
    id: string;
    nombre_apellido: string;
    especialidades: string[];
    sedes: string[];
    recibir_turnos: boolean;
    duracion_turno: number;
    obras_sociales: string[];
    slots: Slot[];
};

type ReservaPendiente = {
    medico: Medico;
    dia_semana: number;
    slots: Slot[];
    sedesDelDia: string[];
};

// Genera las próximas N fechas que caigan en el día de la semana indicado
function proximasFechas(diaSemana: number, cantidad = 5): Date[] {
    const hoy = new Date();
    const fechas: Date[] = [];
    let d = new Date(hoy);
    d.setHours(0, 0, 0, 0);
    for (let i = 0; fechas.length < cantidad; i++) {
        const candidato = new Date(d);
        candidato.setDate(d.getDate() + i);
        if (candidato.getDay() === diaSemana) {
            fechas.push(candidato);
        }
    }
    return fechas;
}

function formatFecha(date: Date): string {
    return date.toLocaleDateString("es-AR", {
        weekday: "short", day: "numeric", month: "short"
    });
}

function getHorasDesdeSlots(slots: Slot[], duracion: number): string[] {
    const seen = new Set<string>();
    const horas: string[] = [];
    for (const slot of slots) {
        const [sh, sm] = slot.hora_inicio.split(":").map(Number);
        const [eh, em] = slot.hora_fin.split(":").map(Number);
        let cur = sh * 60 + sm;
        const end = eh * 60 + em;
        while (cur + duracion <= end) {
            const label = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
            if (!seen.has(label)) { seen.add(label); horas.push(label); }
            cur += duracion;
        }
    }
    return horas;
}

// Combina fecha (Date) + hora ("HH:MM:SS") en ISO string
function buildFechaHora(fecha: Date, horaStr: string): string {
    const [h, m] = horaStr.split(":").map(Number);
    const dt = new Date(fecha);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
}

type TurnoBackend = {
    id: string;
    fecha_hora: string;
    estado: string;
    medicos: {
        especialidades: string[];
        profiles: { nombre_apellido: string };
    } | null;
};

function formatFechaHora(iso: string) {
    const d = new Date(iso);
    const fecha = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
    const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return { fecha, hora };
}

function TurnosPage() {
    const patientData = JSON.parse(localStorage.getItem("patientData") || "{}");
    const pacienteId: string = patientData.id ?? "";

    const [activeTab, setActiveTab] = useState<"buscar" | "proximos" | "historial">("buscar");

    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [especialidadFiltro, setEspecialidadFiltro] = useState("");
    const [diaFiltro, setDiaFiltro] = useState<number | null>(null);
    const [todasEspecialidades, setTodasEspecialidades] = useState<string[]>([]);
    const [obraSocialPaciente, setObraSocialPaciente] = useState<string | null>(null);

    useEffect(() => {
        if (!pacienteId) return;
        apiFetch(`/api/pacientes/${pacienteId}/ficha`)
            .then(r => r.json())
            .then(({ data }) => setObraSocialPaciente(data?.obra_social ?? null))
            .catch(() => {});
    }, [pacienteId]);

    // Próximos y historial
    const [proximosTurnos, setProximosTurnos] = useState<TurnoBackend[]>([]);
    const [historialTurnos, setHistorialTurnos] = useState<TurnoBackend[]>([]);
    const [loadingTurnos, setLoadingTurnos] = useState(false);
    const [cancelandoId, setCancelandoId] = useState<string | null>(null);

    // Modal de reserva
    const [reserva, setReserva] = useState<ReservaPendiente | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
    const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
    const [sedeSeleccionada, setSedeSeleccionada] = useState<string | null>(null);
    const [reservando, setReservando] = useState(false);
    const [reservaExitosa, setReservaExitosa] = useState(false);
    const [fechasOcupadas, setFechasOcupadas] = useState<string[]>([]);
    const [turnosOcupados, setTurnosOcupados] = useState<string[]>([]);

    const fetchTurnosPaciente = async () => {
        if (!pacienteId) return;
        setLoadingTurnos(true);
        try {
            const [rProximos, rHistorial] = await Promise.all([
                apiFetch(`/api/pacientes/${pacienteId}/turnos`),
                apiFetch(`/api/pacientes/${pacienteId}/turnos/historial`),
            ]);
            const jProximos = await rProximos.json();
            const jHistorial = await rHistorial.json();
            setProximosTurnos(jProximos.data ?? []);
            setHistorialTurnos(jHistorial.data ?? []);
        } catch (e) {
            console.error("Error cargando turnos del paciente", e);
        } finally {
            setLoadingTurnos(false);
        }
    };

    const cancelarTurno = async (id: string) => {
        setCancelandoId(id);
        try {
            const r = await apiFetch(`/api/turnos/${id}/cancelar`, { method: "PATCH" });
            if (r.ok) {
                await fetchTurnosPaciente();
            }
        } catch (e) {
            console.error("Error cancelando turno", e);
        } finally {
            setCancelandoId(null);
        }
    };

    useEffect(() => {
        fetchTurnosPaciente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const rMedicos = await apiFetch(`/api/medicos`);
                const jMedicos = await rMedicos.json();
                const listaMedicos: Array<{
                    id: string; especialidades: string[]; sedes: string[];
                    recibir_turnos: boolean; profiles: { nombre_apellido: string };
                }> = jMedicos.data ?? [];

                const conSlots: Medico[] = await Promise.all(
                    listaMedicos
                        .filter((m) => m.recibir_turnos)
                        .map(async (m) => {
                            const rSlots = await apiFetch(`/api/medicos/${m.id}/disponibilidad`);
                            const jSlots = await rSlots.json();
                            const slots: Slot[] = jSlots.data ?? [];
                            return {
                                id: m.id,
                                obras_sociales: (m as any).obras_sociales ?? [],
                                nombre_apellido: m.profiles?.nombre_apellido ?? "Médico",
                                especialidades: m.especialidades ?? [],
                                sedes: m.sedes ?? [],
                                recibir_turnos: m.recibir_turnos,
                                duracion_turno: slots[0]?.duracion_turno ?? 30,
                                slots,
                            };
                        })
                );

                const conDisponibilidad = conSlots.filter((m) => m.slots.length > 0);
                setMedicos(conDisponibilidad);

                const esp = Array.from(
                    new Set(conDisponibilidad.flatMap((m) => m.especialidades))
                ).sort();
                setTodasEspecialidades(esp);
            } catch (err) {
                setError("No se pudo cargar la lista de médicos.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const medicosFiltrados = medicos.filter((m) => {
        const pasaEsp = !especialidadFiltro || m.especialidades.includes(especialidadFiltro);
        const pasaDia = diaFiltro === null || m.slots.some((s) => s.dia_semana === diaFiltro);
        const pasaObra = !obraSocialPaciente
            || m.obras_sociales.length === 0
            || m.obras_sociales.includes(obraSocialPaciente);
        return pasaEsp && pasaDia && pasaObra;
    });

    const abrirModal = async (medico: Medico, dia_semana: number, slots: Slot[]) => {
        const sedesDelDia = [...new Set(slots.map(s => s.sede).filter(Boolean))] as string[];
        setReserva({ medico, dia_semana, slots, sedesDelDia });
        setFechaSeleccionada(null);
        setHoraSeleccionada(null);
        setReservaExitosa(false);
        setFechasOcupadas([]);
        // Si hay una sola sede la pre-seleccionamos
        setSedeSeleccionada(sedesDelDia.length === 1 ? sedesDelDia[0] : null);

        try {
            const r = await apiFetch(`/api/medicos/${medico.id}/turnos`);
            const j = await r.json();
            const ocupados = (j.data || []).map((t: any) => new Date(t.fecha_hora).toISOString());
            setTurnosOcupados(ocupados);
        } catch (e) {
            console.error("Error fetching turnos ocupados", e);
            setTurnosOcupados([]);
        }
    };

    const cerrarModal = () => {
        setReserva(null);
        setFechaSeleccionada(null);
        setHoraSeleccionada(null);
        setSedeSeleccionada(null);
        setReservando(false);
        setReservaExitosa(false);
        setFechasOcupadas([]);
        setTurnosOcupados([]);
    };

    const confirmarReserva = async () => {
        if (!reserva || !fechaSeleccionada || !horaSeleccionada) return;

        if (!pacienteId) {
            showToast("Necesitás iniciar sesión como paciente para reservar un turno.");
            return;
        }

        setReservando(true);
        try {
            const fecha_hora = buildFechaHora(fechaSeleccionada, horaSeleccionada);

            const response = await apiFetch(`/api/turnos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paciente_id: pacienteId,
                    medico_id: reserva.medico.id,
                    fecha_hora,
                }),
            });

            const result = await response.json();

            if (response.status === 409) {
                // Turno ya reservado: marcamos esa fecha/hora como ocupada pero no cerramos el modal
                setFechasOcupadas((prev) => [...prev, fecha_hora]);
                setHoraSeleccionada(null);
                showToast("Ese horario ya fue reservado. Por favor elegí otra fecha o médico.");
                return;
            }

            if (!response.ok) {
                showToast("No se pudo reservar el turno. Intentá de nuevo.");
                return;
            }

            setReservaExitosa(true);
            fetchTurnosPaciente();
        } catch (err) {
            console.error(err);
            showToast("Algo salió mal. Intentá de nuevo.");
        } finally {
            setReservando(false);
        }
    };


    const hayFiltros = !!especialidadFiltro || diaFiltro !== null;

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-name">Turnos</h2>
                    <p className="dashboard-sub">
                        {activeTab === "buscar"
                            ? (loading ? "Cargando médicos..." : `${medicosFiltrados.length} médico${medicosFiltrados.length !== 1 ? "s" : ""} disponible${medicosFiltrados.length !== 1 ? "s" : ""}`)
                            : activeTab === "proximos" ? "Tus próximas citas"
                            : "Historial de turnos"}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="turnos-tabs">
                {(["buscar", "proximos", "historial"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`turnos-tab-btn ${activeTab === tab ? "active" : ""}`}
                    >
                        {tab === "buscar" ? "Buscar" : tab === "proximos" ? "Próximos" : "Historial"}
                    </button>
                ))}
            </div>

            {/* Tab: Próximos */}
            {activeTab === "proximos" && (
                <div style={{ margin: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {loadingTurnos ? (
                        <p style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>Cargando...</p>
                    ) : proximosTurnos.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: "0 auto 14px", display: "block" }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <p className="empty-text" style={{ fontSize: 15, marginBottom: 4 }}>No tenés turnos próximos</p>
                            <p className="empty-text">Reservá tu primera cita en "Buscar"</p>
                        </div>
                    ) : (
                        proximosTurnos.map((t) => {
                            const { fecha, hora } = formatFechaHora(t.fecha_hora);
                            return (
                                <div key={t.id} className="dashboard-card" style={{ margin: 0, padding: "16px 18px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>
                                                {t.medicos?.profiles?.nombre_apellido ?? "Médico"}
                                            </div>
                                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                                                {t.medicos?.especialidades?.[0] ?? ""}
                                            </div>
                                            <div style={{ display: "flex", gap: 16 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span style={{ fontSize: 13, color: "#374151" }}>{fecha}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span style={{ fontSize: 13, color: "#374151" }}>{hora} hs</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => cancelarTurno(t.id)}
                                            disabled={cancelandoId === t.id}
                                            className="cancel-turno-btn"
                                            style={{ opacity: cancelandoId === t.id ? 0.5 : 1, cursor: cancelandoId === t.id ? "not-allowed" : "pointer" }}
                                        >
                                            {cancelandoId === t.id ? "..." : "Cancelar"}
                                        </button>
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
                    {loadingTurnos ? (
                        <p style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>Cargando...</p>
                    ) : historialTurnos.length === 0 ? (
                        <div className="dashboard-card" style={{ textAlign: "center", padding: "36px 20px" }}>
                            <p className="empty-text">Sin historial de turnos</p>
                        </div>
                    ) : (
                        historialTurnos.map((t) => {
                            const { fecha, hora } = formatFechaHora(t.fecha_hora);
                            const isPast = new Date(t.fecha_hora) < new Date();
                            const status = t.estado === "cancelado" ? "cancelado" : isPast ? "completado" : null;
                            return (
                                <div key={t.id} className="dashboard-card" style={{ margin: 0, padding: "16px 18px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 3 }}>
                                                {t.medicos?.profiles?.nombre_apellido ?? "Médico"}
                                            </div>
                                            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
                                                {t.medicos?.especialidades?.[0] ?? ""}
                                            </div>
                                            <div style={{ display: "flex", gap: 16 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span style={{ fontSize: 13, color: "#374151" }}>{fecha}</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span style={{ fontSize: 13, color: "#374151" }}>{hora} hs</span>
                                                </div>
                                            </div>
                                        </div>
                                        {status && (
                                            <span className={`turno-badge ${status}`}>
                                                {status === "completado" ? "Completado" : "Cancelado"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Tab: Buscar — Filtros */}
            {activeTab === "buscar" && (<>
            {/* Filtros */}
            <div className="dashboard-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Especialidad</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {todasEspecialidades.map((esp) => (
                            <button
                                key={esp}
                                onClick={() => setEspecialidadFiltro(esp === especialidadFiltro ? "" : esp)}
                                style={{
                                    padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                                    border: esp === especialidadFiltro ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                    background: esp === especialidadFiltro ? "#eef3ff" : "white",
                                    color: esp === especialidadFiltro ? "#2f5cf5" : "#374151",
                                    fontWeight: esp === especialidadFiltro ? 700 : 500,
                                    fontSize: 14, transition: "0.15s ease",
                                }}
                            >
                                {esp}
                            </button>
                        ))}
                        {todasEspecialidades.length === 0 && !loading && (
                            <span style={{ fontSize: 14, color: "#9ca3af" }}>Sin especialidades disponibles</span>
                        )}
                    </div>
                </div>

                <div>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#374151" }}>Día de la semana</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {DIAS_SEMANA.map(({ label, index }) => (
                            <button
                                key={index}
                                onClick={() => setDiaFiltro(diaFiltro === index ? null : index)}
                                style={{
                                    width: 48, height: 48, borderRadius: 12, cursor: "pointer",
                                    border: diaFiltro === index ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                    background: diaFiltro === index ? "#2f5cf5" : "white",
                                    color: diaFiltro === index ? "white" : "#374151",
                                    fontWeight: diaFiltro === index ? 700 : 500,
                                    fontSize: 13, transition: "0.15s ease",
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {hayFiltros && (
                    <button
                        onClick={() => { setEspecialidadFiltro(""); setDiaFiltro(null); }}
                        style={{
                            alignSelf: "flex-start", padding: "8px 16px", borderRadius: 10,
                            border: "1px solid #e5e7eb", background: "white", color: "#6b7280",
                            fontSize: 14, cursor: "pointer",
                        }}
                    >
                        ✕ Limpiar filtros
                    </button>
                )}
            </div>

            {/* Lista de médicos */}
            {loading ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
                    <p>Cargando médicos disponibles...</p>
                </div>
            ) : error ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#ef4444" }}>
                    <p>{error}</p>
                </div>
            ) : medicosFiltrados.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>Sin resultados</p>
                    <p style={{ fontSize: 14 }}>No hay médicos disponibles con los filtros seleccionados.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {medicosFiltrados.map((medico) => {
                        const slotsVisibles = diaFiltro !== null
                            ? medico.slots.filter((s) => s.dia_semana === diaFiltro)
                            : medico.slots;

                        return (
                            <div key={medico.id} className="dashboard-card">
                                <div style={{ marginBottom: 12 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#111827" }}>
                                        {medico.nombre_apellido}
                                    </p>
                                    {medico.sedes.length > 0 && (
                                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                                            📍 {medico.sedes.join(" · ")}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                                    {medico.especialidades.map((esp) => (
                                        <span
                                            key={esp}
                                            className="info-chip"
                                            style={{
                                                fontSize: 13, padding: "5px 12px",
                                                background: especialidadFiltro === esp ? "#dbeafe" : "#f0f4ff",
                                                color: especialidadFiltro === esp ? "#1d4ed8" : "#2f5cf5",
                                            }}
                                        >
                                            {esp}
                                        </span>
                                    ))}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {Object.entries(
                                        slotsVisibles.filter(s => s.sede).reduce((acc, s) => {
                                            const sede = s.sede!;
                                            (acc[sede] = acc[sede] || []).push(s);
                                            return acc;
                                        }, {} as Record<string, Slot[]>)
                                    ).map(([sede, sedeSlots]) => (
                                        <div key={sede}>
                                            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                                </svg>
                                                {sede}
                                            </p>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {Object.entries(
                                                    sedeSlots.reduce((acc, s) => {
                                                        (acc[s.dia_semana] = acc[s.dia_semana] || []).push(s);
                                                        return acc;
                                                    }, {} as Record<number, Slot[]>)
                                                )
                                                .sort(([a], [b]) => Number(a) - Number(b))
                                                .map(([dia, diaSlots]) => (
                                                    <div
                                                        key={dia}
                                                        style={{
                                                            display: "flex", alignItems: "center",
                                                            justifyContent: "space-between",
                                                            background: "#f9fafb", borderRadius: 12,
                                                            padding: "10px 14px", border: "1px solid #f3f4f6",
                                                        }}
                                                    >
                                                        <div>
                                                            <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                                                                {DIA_NOMBRE[Number(dia)]}
                                                            </span>
                                                            <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>
                                                                {[...new Map(diaSlots.map(s => [`${s.hora_inicio}${s.hora_fin}`, s])).values()]
                                                                    .map(s => `${s.hora_inicio.slice(0,5)}–${s.hora_fin.slice(0,5)}`).join(" / ")} hs
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => abrirModal(medico, Number(dia), diaSlots)}
                                                            style={{
                                                                padding: "7px 16px", borderRadius: 10, border: "none",
                                                                background: "#2f5cf5", color: "white",
                                                                fontSize: 13, fontWeight: 600, cursor: "pointer",
                                                            }}
                                                        >
                                                            Reservar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </>)}

            <Navbar role="patient" />

            {/* ── Modal de reserva ── */}
            {reserva && (
                <div
                    onClick={cerrarModal}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
                        padding: "20px",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "white", width: "100%", maxWidth: 480,
                            borderRadius: "24px", padding: "28px 20px 36px",
                            maxHeight: "90vh", overflowY: "auto",
                        }}
                    >
                        {reservaExitosa ? (
                            /* ── Confirmación ── */
                            <div style={{ textAlign: "center", padding: "16px 0" }}>
                                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                                <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#111827" }}>
                                    ¡Turno reservado!
                                </h3>
                                <p style={{ margin: "0 0 6px", color: "#374151" }}>
                                    {reserva.medico.nombre_apellido}
                                </p>
                                <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>
                                    {fechaSeleccionada && formatFecha(fechaSeleccionada)} —{" "}
                                    {horaSeleccionada} hs
                                </p>
                                <button
                                    onClick={cerrarModal}
                                    className="auth-button"
                                    style={{ margin: 0 }}
                                >
                                    Listo
                                </button>
                            </div>
                        ) : (
                            /* ── Selector de fecha ── */
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Elegí una fecha</h3>
                                    <button
                                        onClick={cerrarModal}
                                        style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Info del médico */}
                                <div style={{ background: "#f0f4ff", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#111827" }}>
                                        {reserva.medico.nombre_apellido}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                                        {DIA_NOMBRE[reserva.dia_semana]}
                                        {sedeSeleccionada ? ` · ${sedeSeleccionada}` : ""}
                                    </p>
                                </div>

                                {/* Selección de sede (si tiene más de una ese día) */}
                                {reserva.sedesDelDia.length > 1 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                                            ¿En qué sede querés atenderte?
                                        </p>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {reserva.sedesDelDia.map((sede) => (
                                                <button
                                                    key={sede}
                                                    onClick={() => { setSedeSeleccionada(sede); setFechaSeleccionada(null); setHoraSeleccionada(null); }}
                                                    style={{
                                                        padding: "12px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                                                        border: sedeSeleccionada === sede ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                                        background: sedeSeleccionada === sede ? "#eef3ff" : "white",
                                                        color: sedeSeleccionada === sede ? "#2f5cf5" : "#111827",
                                                        fontWeight: sedeSeleccionada === sede ? 700 : 500,
                                                        fontSize: 14, display: "flex", alignItems: "center", gap: 10,
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    {sede}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fechas disponibles — solo si hay sede seleccionada */}
                                {sedeSeleccionada && (
                                    <>
                                        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                                            Próximas fechas disponibles
                                        </p>
                                        <div style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", paddingBottom: 10, marginBottom: 24, paddingLeft: 4, paddingRight: 4 }}>
                                            {proximasFechas(reserva.dia_semana).map((fecha) => {
                                                const seleccionada = fechaSeleccionada?.toDateString() === fecha.toDateString();
                                                return (
                                                    <button
                                                        key={fecha.toISOString()}
                                                        onClick={() => { setFechaSeleccionada(fecha); setHoraSeleccionada(null); }}
                                                        style={{
                                                            flexShrink: 0,
                                                            padding: "12px 18px", borderRadius: 14, cursor: "pointer",
                                                            border: seleccionada ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                                            background: seleccionada ? "#eef3ff" : "white",
                                                            color: seleccionada ? "#2f5cf5" : "#111827",
                                                            fontWeight: seleccionada ? 700 : 500,
                                                            fontSize: 15, textAlign: "center",
                                                            transition: "0.15s ease",
                                                            minWidth: 100
                                                        }}
                                                    >
                                                        {formatFecha(fecha)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {sedeSeleccionada && fechaSeleccionada && (
                                    <>
                                        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                                            Horarios disponibles
                                        </p>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                                            {getHorasDesdeSlots(reserva.slots.filter(s => s.sede === sedeSeleccionada), reserva.medico.duracion_turno)
                                                .filter((hora) => {
                                                    const iso = buildFechaHora(fechaSeleccionada, hora);
                                                    return new Date(iso) > new Date(); // Solo permitir horarios en el futuro
                                                })
                                                .map((hora) => {
                                                    const iso = buildFechaHora(fechaSeleccionada, hora);
                                                    const ocupada = turnosOcupados.includes(iso) || fechasOcupadas.includes(iso);
                                                    const seleccionada = horaSeleccionada === hora;
                                                    return (
                                                        <button
                                                            key={hora}
                                                        onClick={() => !ocupada && setHoraSeleccionada(hora)}
                                                        disabled={ocupada}
                                                        style={{
                                                            padding: "10px 18px", borderRadius: 12,
                                                            cursor: ocupada ? "not-allowed" : "pointer",
                                                            border: seleccionada ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                                            background: ocupada ? "#f3f4f6" : seleccionada ? "#eef3ff" : "white",
                                                            color: ocupada ? "#9ca3af" : seleccionada ? "#2f5cf5" : "#111827",
                                                            fontWeight: seleccionada ? 700 : 500,
                                                            fontSize: 15, textAlign: "center",
                                                            transition: "0.15s ease",
                                                            opacity: ocupada ? 0.6 : 1,
                                                            textDecoration: ocupada ? "line-through" : "none"
                                                        }}
                                                    >
                                                        {hora} hs
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={confirmarReserva}
                                    disabled={!sedeSeleccionada || !fechaSeleccionada || !horaSeleccionada || reservando}
                                    className="auth-button"
                                    style={{
                                        margin: 0,
                                        opacity: (!sedeSeleccionada || !fechaSeleccionada || !horaSeleccionada || reservando) ? 0.5 : 1,
                                        cursor: (!sedeSeleccionada || !fechaSeleccionada || !horaSeleccionada || reservando) ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {reservando ? "Reservando..." : "Confirmar turno"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TurnosPage;
