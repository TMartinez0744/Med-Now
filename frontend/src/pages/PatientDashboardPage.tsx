import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";

function PatientDashboardPage() {

    const navigate = useNavigate();

    const handleLogout = () => {
        navigate("/");
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>

                <div>
                    <h2 className="dashboard-name">Juan Pérez</h2>
                    <p className="dashboard-sub">DNI: 45611865</p>
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

            <Navbar role = "patient" />
        </div>
    );
}

export default PatientDashboardPage;