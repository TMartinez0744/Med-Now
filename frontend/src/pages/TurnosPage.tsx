import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const API = "http://localhost:3000/api";

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
};

type Medico = {
    id: string;
    nombre_apellido: string;
    especialidades: string[];
    sedes: string[];
    recibir_turnos: boolean;
    slots: Slot[];
};

type ReservaPendiente = {
    medico: Medico;
    slot: Slot;
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

function getHorasEnRango(horaInicio: string, horaFin: string) {
    const horas: string[] = [];
    let [h, m] = horaInicio.split(":").map(Number);
    let hFin = Number(horaFin.split(":")[0]);
    while (h < hFin) {
        horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        h++;
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

function TurnosPage() {
    const patientData = JSON.parse(localStorage.getItem("patientData") || "{}");
    const pacienteId: string = patientData.id ?? "";

    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [especialidadFiltro, setEspecialidadFiltro] = useState("");
    const [diaFiltro, setDiaFiltro] = useState<number | null>(null);
    const [todasEspecialidades, setTodasEspecialidades] = useState<string[]>([]);

    // Modal de reserva
    const [reserva, setReserva] = useState<ReservaPendiente | null>(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
    const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
    const [reservando, setReservando] = useState(false);
    const [reservaExitosa, setReservaExitosa] = useState(false);
    const [fechasOcupadas, setFechasOcupadas] = useState<string[]>([]);
    const [turnosOcupados, setTurnosOcupados] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const rMedicos = await fetch(`${API}/medicos`);
                const jMedicos = await rMedicos.json();
                const listaMedicos: Array<{
                    id: string; especialidades: string[]; sedes: string[];
                    recibir_turnos: boolean; profiles: { nombre_apellido: string };
                }> = jMedicos.data ?? [];

                const conSlots: Medico[] = await Promise.all(
                    listaMedicos
                        .filter((m) => m.recibir_turnos)
                        .map(async (m) => {
                            const rSlots = await fetch(`${API}/medicos/${m.id}/disponibilidad`);
                            const jSlots = await rSlots.json();
                            return {
                                id: m.id,
                                nombre_apellido: m.profiles?.nombre_apellido ?? "Médico",
                                especialidades: m.especialidades ?? [],
                                sedes: m.sedes ?? [],
                                recibir_turnos: m.recibir_turnos,
                                slots: jSlots.data ?? [],
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
        return pasaEsp && pasaDia;
    });

    const abrirModal = async (medico: Medico, slot: Slot) => {
        setReserva({ medico, slot });
        setFechaSeleccionada(null);
        setHoraSeleccionada(null);
        setReservaExitosa(false);
        setFechasOcupadas([]);

        try {
            const r = await fetch(`${API}/medicos/${medico.id}/turnos`);
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
        setReservando(false);
        setReservaExitosa(false);
        setFechasOcupadas([]);
        setTurnosOcupados([]);
    };

    const confirmarReserva = async () => {
        if (!reserva || !fechaSeleccionada || !horaSeleccionada) return;

        if (!pacienteId) {
            alert("Necesitás iniciar sesión como paciente para reservar un turno.");
            return;
        }

        setReservando(true);
        try {
            const fecha_hora = buildFechaHora(fechaSeleccionada, horaSeleccionada);

            const response = await fetch(`${API}/turnos`, {
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
                alert("Ese horario ya fue reservado. Por favor elegí otra fecha o médico.");
                return;
            }

            if (!response.ok) {
                alert("Error al reservar: " + result.message);
                return;
            }

            setReservaExitosa(true);
        } catch (err) {
            console.error(err);
            alert("Error al conectar con el servidor.");
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
                    <h2 className="dashboard-name">Buscar Turnos</h2>
                    <p className="dashboard-sub">
                        {loading
                            ? "Cargando médicos..."
                            : `${medicosFiltrados.length} médico${medicosFiltrados.length !== 1 ? "s" : ""} disponible${medicosFiltrados.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
            </div>

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

                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {slotsVisibles.map((slot) => (
                                        <div
                                            key={slot.id}
                                            style={{
                                                display: "flex", alignItems: "center",
                                                justifyContent: "space-between",
                                                background: "#f9fafb", borderRadius: 12,
                                                padding: "10px 14px", border: "1px solid #f3f4f6",
                                            }}
                                        >
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                                                    {DIA_NOMBRE[slot.dia_semana]}
                                                </span>
                                                <span style={{ fontSize: 14, color: "#6b7280", marginLeft: 8 }}>
                                                    {slot.hora_inicio.slice(0, 5)} – {slot.hora_fin.slice(0, 5)} hs
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => abrirModal(medico, slot)}
                                                style={{
                                                    padding: "7px 16px", borderRadius: 10, border: "none",
                                                    background: "#2f5cf5", color: "white",
                                                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                                                    transition: "0.15s ease",
                                                }}
                                            >
                                                Reservar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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

                                {/* Info del médico y slot */}
                                <div style={{
                                    background: "#f0f4ff", borderRadius: 14, padding: "14px 16px", marginBottom: 20,
                                }}>
                                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#111827" }}>
                                        {reserva.medico.nombre_apellido}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                                        {DIA_NOMBRE[reserva.slot.dia_semana]} · {reserva.slot.hora_inicio.slice(0, 5)} – {reserva.slot.hora_fin.slice(0, 5)} hs
                                    </p>
                                </div>

                                {/* Fechas disponibles (próximas ocurrencias del día) */}
                                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                                    Próximas fechas disponibles
                                </p>
                                <div style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", paddingBottom: 10, marginBottom: 24, paddingLeft: 4, paddingRight: 4 }}>
                                    {proximasFechas(reserva.slot.dia_semana).map((fecha) => {
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
                                
                                {fechaSeleccionada && (
                                    <>
                                        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
                                            Horarios disponibles
                                        </p>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                                            {getHorasEnRango(reserva.slot.hora_inicio, reserva.slot.hora_fin).map((hora) => {
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
                                    disabled={!fechaSeleccionada || !horaSeleccionada || reservando}
                                    className="auth-button"
                                    style={{
                                        margin: 0,
                                        opacity: (!fechaSeleccionada || !horaSeleccionada || reservando) ? 0.5 : 1,
                                        cursor: (!fechaSeleccionada || !horaSeleccionada || reservando) ? "not-allowed" : "pointer",
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
