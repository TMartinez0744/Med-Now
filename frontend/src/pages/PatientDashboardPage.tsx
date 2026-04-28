import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";
import {Link} from "react-router-dom";

function PatientDashboardPage() {
    const navigate = useNavigate();
    const patientData = JSON.parse(localStorage.getItem("patientData") || "{}");

    const capitalize = (text: string): string => {
        if (!text) return "";
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    const patientName =
        patientData.name && patientData.lastName
            ? `${capitalize(patientData.name)} ${capitalize(patientData.lastName)}`
            : "Usuario";

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("patientData");
        navigate("/");
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>

                <div>
                    <h2 className="dashboard-name">{patientName}</h2>
                    <p className="dashboard-sub">
                        DNI: {patientData.dni || "No disponible"}
                    </p>
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

            <div className="dashboard-card">
                <h3>Funciones</h3>
                <Link to="/mapa-emergencias" style={{ textDecoration: "none"}} >
                <button className="dashboard-button">
                    Ver mapa de guardias y farmacias
                </button>
                </Link>
            </div>

            <Navbar role="patient" />
        </div>
    );
}

export default PatientDashboardPage;