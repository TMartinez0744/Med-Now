import Navbar from "../components/Navbar";
import personIcon from "../assets/person.svg";
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

            {/* NUEVA CARD */}
            <div className="dashboard-card">
                <h3>Perfil profesional</h3>

                <div style={{ marginTop: "12px" }}>
                    <h4>Especialidades</h4>
                    {SPECIALTIES.map((spec) => (
                        <label key={spec} style={{ display: "block" }}>
                            <input
                                type="checkbox"
                                checked={specialties.includes(spec)}
                                onChange={() =>
                                    toggleSelection(spec, specialties, setSpecialties)
                                }
                            />
                            {spec}
                        </label>
                    ))}
                </div>

                <div style={{ marginTop: "16px" }}>
                    <h4>Hospitales / sedes</h4>
                    {HOSPITALS.map((hospital) => (
                        <label key={hospital} style={{ display: "block" }}>
                            <input
                                type="checkbox"
                                checked={hospitals.includes(hospital)}
                                onChange={() =>
                                    toggleSelection(hospital, hospitals, setHospitals)
                                }
                            />
                            {hospital}
                        </label>
                    ))}
                </div>

                <button className="dashboard-button" style={{ marginTop: "16px" }}>
                    Guardar cambios
                </button>
            </div>

            <Navbar />
        </div>
    );
}

export default DoctorDashboardPage;