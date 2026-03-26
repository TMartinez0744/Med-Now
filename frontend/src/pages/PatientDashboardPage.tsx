import Navbar from "../components/Navbar";
import personIcon from "../assets/person.svg";

function PatientDashboardPage() {
    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>

                <div>
                    <h2 className="dashboard-name">Juan Pérez</h2>
                    <p className="dashboard-sub">DNI: 45306211</p>
                </div>
            </div>

            <div className="dashboard-card">
                <h3>Configuración</h3>

                <button className="dashboard-button">Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
            </div>

            <Navbar />
        </div>
    );
}

export default PatientDashboardPage;