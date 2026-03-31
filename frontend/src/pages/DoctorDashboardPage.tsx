import Navbar from "../components/Navbar";
import personIcon from "../assets/person.svg";
import biotechIcon from "../assets/biotech.svg";
import locationIcon from "../assets/location_on.svg";

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

function DoctorDashboardPage() {
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [hospitals, setHospitals] = useState<string[]>([]);

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

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>
                <div>
                    <h2 className="dashboard-name">Dr. Juan Pérez</h2>
                    <p className="dashboard-sub">Matrícula: MN 12345</p>
                </div>
            </div>

            <div className="dashboard-card">
                <h3>Configuración</h3>

                <button className="dashboard-button">Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
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
                                    <img
                                        src={locationIcon}
                                        alt=""
                                        className="info-row-icon"
                                    />
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

            <Navbar />
        </div>
    );
}

export default DoctorDashboardPage;