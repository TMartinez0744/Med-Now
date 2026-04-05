import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";
import clockIcon from "../assets/access_time.svg";

import { useState } from "react";

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

const DAYS = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
];

type DaySchedule = {
    enabled: boolean;
    from: string;
    to: string;
};

function DoctorDashboardPage() {
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [hospitals, setHospitals] = useState<string[]>([]);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);

    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
        Object.fromEntries(
            DAYS.map((day) => [
                day,
                {
                    enabled: !["Sábado", "Domingo"].includes(day),
                    from: "08:00",
                    to: "18:00",
                },
            ])
        )
    );

    const navigate = useNavigate();

    // 🔥 DATOS DEL DOCTOR (localStorage)
    const doctorData = JSON.parse(localStorage.getItem("doctorData") || "{}");

    // 🔥 FUNCIÓN CAPITALIZE (ANTES DE USARLA)
    const capitalize = (text: string) =>
        text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

    const doctorName =
        doctorData.name && doctorData.lastName
            ? `Dr. ${capitalize(doctorData.name)} ${capitalize(doctorData.lastName)}`
            : "Dr. Usuario";

    const doctorLicense = doctorData.licenseNumber
        ? `Matrícula: ${doctorData.licenseNumber}`
        : "Matrícula: No disponible";

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
        if (list.includes(value)) {
            setList(list.filter((item) => item !== value));
        } else {
            setList([...list, value]);
        }
    };

    const toggleDaySchedule = (day: string) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                enabled: !prev[day].enabled,
            },
        }));
    };

    const updateScheduleTime = (
        day: string,
        field: "from" | "to",
        value: string
    ) => {
        setSchedule((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value,
            },
        }));
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

            <div className="dashboard-card">
                <h3>Configuración</h3>

                <button className="dashboard-button">Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
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
                                <span key={spec} className="info-chip">
                                    {spec}
                                </span>
                            ))
                        ) : (
                            <p className="empty-text">Todavía no agregaste especialidades.</p>
                        )}
                    </div>

                    <div className="options-grid">
                        {SPECIALTIES.map((spec) => (
                            <label
                                key={spec}
                                className={`option-card ${
                                    specialties.includes(spec) ? "selected" : ""
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={specialties.includes(spec)}
                                    onChange={() =>
                                        toggleSelection(spec, specialties, setSpecialties)
                                    }
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
                                className={`option-card ${
                                    hospitals.includes(hospital) ? "selected" : ""
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={hospitals.includes(hospital)}
                                    onChange={() =>
                                        toggleSelection(hospital, hospitals, setHospitals)
                                    }
                                />
                                <span className="custom-checkbox"></span>
                                <span className="option-text">{hospital}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button className="dashboard-button save-button">
                    Guardar cambios
                </button>
            </div>

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
                        >
                            Editar
                        </button>
                    ) : (
                        <div className="schedule-actions">
                            <button
                                className="schedule-save-button"
                                onClick={() => setIsEditingSchedule(false)}
                            >
                                Guardar
                            </button>

                            <button
                                className="schedule-secondary-button"
                                onClick={() => setIsEditingSchedule(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>

                <div className="schedule-days">
                    {DAYS.map((day) => {
                        const dayData = schedule[day];

                        return (
                            <div
                                key={day}
                                className={`schedule-day-item ${
                                    !dayData.enabled ? "schedule-day-disabled" : ""
                                }`}
                            >
                                <div className="schedule-day-top">
                                    <div className="schedule-day-left">
                                        {isEditingSchedule && (
                                            <label className="schedule-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={dayData.enabled}
                                                    onChange={() => toggleDaySchedule(day)}
                                                />
                                                <span className="schedule-slider"></span>
                                            </label>
                                        )}

                                        <span className="schedule-day-name">{day}</span>
                                    </div>

                                    {!dayData.enabled && (
                                        <span className="schedule-unavailable">
                                            No disponible
                                        </span>
                                    )}
                                </div>

                                {dayData.enabled && (
                                    <>
                                        {isEditingSchedule ? (
                                            <div className="schedule-time-row">
                                                <span className="schedule-time-label">
                                                    Horario:
                                                </span>

                                                <input
                                                    type="time"
                                                    value={dayData.from}
                                                    className="schedule-time-input"
                                                    onChange={(e) =>
                                                        updateScheduleTime(
                                                            day,
                                                            "from",
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                                <span className="schedule-time-separator">
                                                    -
                                                </span>

                                                <input
                                                    type="time"
                                                    value={dayData.to}
                                                    className="schedule-time-input"
                                                    onChange={(e) =>
                                                        updateScheduleTime(
                                                            day,
                                                            "to",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            <div className="schedule-time-display">
                                                <span className="schedule-time-label">
                                                    Horario:
                                                </span>
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

            <Navbar role="doctor" />
        </div>
    );
}

export default DoctorDashboardPage;