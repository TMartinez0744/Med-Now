import { Link } from "react-router-dom";

function PatientDashboardPage() {
    return (
        <div>
            <h1>Dashboard Paciente</h1>
            <p>Sesión iniciada</p>

            <Link to="/">
                <button>Cerrar sesión</button>
            </Link>
        </div>
    );
}

export default PatientDashboardPage;