import { useState } from "react";
import { formatDoctorName } from "../lib/doctorName";

const NOMBRES_MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type TurnoCalendar = {
    id: string;
    fecha_hora: string;
    estado: string;
    sede?: string | null;
    medico_id?: string;
    paciente_id?: string;
    medicos?: {
        especialidades: string[];
        profiles: { nombre_apellido: string };
    } | null;
    pacientes?: {
        profiles: { nombre_apellido: string };
    } | null;
};

interface CalendarViewProps {
    role: "patient" | "doctor";
    turnos: TurnoCalendar[];
    unreadMessages: Record<string, number>;
    onChat: (id: string) => void;
    onCancel: (id: string) => void;
    onFicha?: (id: string, nombre: string) => void;
    onBuscarTurno?: () => void;
}

export default function CalendarView({
    role,
    turnos,
    unreadMessages,
    onChat,
    onCancel,
    onFicha,
    onBuscarTurno
}: CalendarViewProps) {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date>(today);

    // Navegar meses
    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prev) => prev - 1);
        } else {
            setCurrentMonth((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prev) => prev + 1);
        } else {
            setCurrentMonth((prev) => prev + 1);
        }
    };

    // Helper de comparación de fechas
    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    // Obtener turnos para una fecha
    const getTurnosForDate = (date: Date) => {
        return turnos.filter((t) => isSameDay(new Date(t.fecha_hora), date));
    };

    // Generar celdas de la cuadrícula
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Días del mes anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        cells.push({
            date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i),
            isCurrentMonth: false
        });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
        cells.push({
            date: new Date(currentYear, currentMonth, i),
            isCurrentMonth: true
        });
    }

    // Días del mes siguiente
    const remainingCells = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let i = 1; i <= remainingCells; i++) {
        cells.push({
            date: new Date(currentYear, currentMonth + 1, i),
            isCurrentMonth: false
        });
    }

    // Turnos del día seleccionado
    const selectedTurnos = getTurnosForDate(selectedDate).sort((a, b) => 
        new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    const formatFriendlyDate = (date: Date) => {
        const formatted = date.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long' });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    };

    const formatShortDate = (isoString: string) => {
        const d = new Date(isoString);
        const s = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    // Próximos turnos (para cuando el día seleccionado no tiene turnos): unifica
    // el calendario con la vista de "Próximos" — los muestra ordenados por fecha.
    const upcomingTurnos = turnos
        .filter((t) => t.estado !== "cancelado" && new Date(t.fecha_hora) >= today)
        .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
        .slice(0, 6);

    const renderTurnoCard = (turno: TurnoCalendar, showDate = false) => {
        const timeStr = formatTime(turno.fecha_hora);
        const isPast = new Date(turno.fecha_hora) < today;
        const status = turno.estado === "cancelado" ? "cancelado" : isPast ? "completado" : "pendiente";
        const counterpartyId = role === "patient" ? turno.medico_id : turno.paciente_id;
        const name = role === "patient"
            ? formatDoctorName(turno.medicos?.profiles?.nombre_apellido)
            : (turno.pacientes?.profiles?.nombre_apellido ?? "Paciente");
        const sub = role === "patient"
            ? (turno.medicos?.especialidades?.[0] ?? "Médico de MedNow")
            : `Turno ${turno.estado}`;

        const unreadCount = counterpartyId ? (unreadMessages[counterpartyId] ?? 0) : 0;

        return (
            <div key={turno.id} className="calendar-turno-card">
                {/* Barra de estado lateral */}
                <div className={`calendar-turno-status-bar ${status}`} />

                <div className="calendar-turno-content">
                    <div className="calendar-turno-info">
                        <p className="calendar-turno-time">
                            {showDate ? `${formatShortDate(turno.fecha_hora)} · ${timeStr} hs` : `${timeStr} hs`}
                        </p>
                        <p className="calendar-turno-name">{name}</p>
                        <p className="calendar-turno-sub">{sub}</p>
                        {turno.sede && (
                            <p className="calendar-turno-sub" style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                {turno.sede}
                            </p>
                        )}
                    </div>

                    <div className="calendar-turno-actions-wrapper">
                        {/* Badge de estado */}
                        <span className={`turno-badge ${status}`}>
                            {status === "pendiente" ? "Pendiente" : status === "completado" ? "Completado" : "Cancelado"}
                        </span>

                        {/* Botones de acción */}
                        <div className="calendar-turno-buttons">
                            {/* Botón ver Ficha (Solo Médico) */}
                            {role === "doctor" && onFicha && counterpartyId && (
                                <button
                                    onClick={() => onFicha(counterpartyId, name)}
                                    className="ficha-square-btn"
                                    title="Ver ficha del paciente"
                                    style={{ width: 34, height: 34, borderRadius: 8 }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                </button>
                            )}

                            {/* Botón Chatear */}
                            {counterpartyId && (
                                <button
                                    onClick={() => onChat(counterpartyId)}
                                    className="chatear-btn"
                                    style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
                                >
                                    Chatear
                                    {unreadCount > 0 && <span className="chatear-btn-dot" />}
                                </button>
                            )}

                            {/* Botón Cancelar */}
                            {turno.estado === "pendiente" && !isPast && (
                                <button
                                    onClick={() => onCancel(turno.id)}
                                    className="cancel-turno-btn"
                                    style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="calendar-container">
          <div className="calendar-main">
            {/* Header del Calendario */}
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={handlePrevMonth} title="Mes anterior">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h3 className="calendar-month-title">
                    {NOMBRES_MESES[currentMonth]} {currentYear}
                </h3>
                <button className="calendar-nav-btn" onClick={handleNextMonth} title="Mes siguiente">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            {/* Cabecera de Días de la Semana */}
            <div className="calendar-grid-header">
                {DIAS_CORTO.map((dia) => (
                    <div key={dia} className="calendar-grid-header-cell">
                        {dia}
                    </div>
                ))}
            </div>

            {/* Cuadrícula de Días */}
            <div className="calendar-grid">
                {cells.map(({ date, isCurrentMonth }, idx) => {
                    const dayTurnos = getTurnosForDate(date);
                    const selected = isSameDay(date, selectedDate);
                    const todayCell = isSameDay(date, today);

                    // Determinar el color del indicador
                    let dotColor: "blue" | "green" | "red" | null = null;
                    if (dayTurnos.length > 0) {
                        const activeTurnos = dayTurnos.filter((t) => t.estado === "pendiente");
                        const completedTurnos = dayTurnos.filter((t) => t.estado === "completado" || (t.estado !== "cancelado" && new Date(t.fecha_hora) < today));
                        const cancelledTurnos = dayTurnos.filter((t) => t.estado === "cancelado");

                        if (activeTurnos.length > 0) {
                            dotColor = "blue"; // Hay turnos pendientes por delante
                        } else if (completedTurnos.length > 0) {
                            dotColor = "green"; // Todos completados / pasados
                        } else if (cancelledTurnos.length > 0) {
                            dotColor = "red"; // Solo cancelados
                        }
                    }

                    return (
                        <button
                            key={idx}
                            className={`calendar-cell ${!isCurrentMonth ? "outside" : ""} ${selected ? "selected" : ""} ${todayCell ? "today" : ""}`}
                            onClick={() => setSelectedDate(date)}
                        >
                            <span className="calendar-day-number">{date.getDate()}</span>
                            {dotColor && (
                                <div className="calendar-dots-container">
                                    <span className={`calendar-dot ${dotColor}`} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
          </div>

            {/* Panel de Detalles del Día Seleccionado */}
            <div className="calendar-details-panel">
                <h4 className="calendar-details-title">
                    {formatFriendlyDate(selectedDate)}
                </h4>

                {selectedTurnos.length === 0 ? (
                    upcomingTurnos.length > 0 ? (
                        <div>
                            <p className="calendar-upcoming-label">Próximos turnos</p>
                            <div className="calendar-turnos-list">
                                {upcomingTurnos.map((turno) => renderTurnoCard(turno, true))}
                            </div>
                        </div>
                    ) : (
                        <div className="calendar-empty-state">
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                            <p className="calendar-empty-text">No tenés turnos próximos.</p>
                            {role === "patient" && onBuscarTurno && (
                                <button className="calendar-empty-action" onClick={onBuscarTurno}>
                                    Buscar y agendar turno
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    <div className="calendar-turnos-list">
                        {selectedTurnos.map((turno) => renderTurnoCard(turno))}
                    </div>
                )}
            </div>
        </div>
    );
}
