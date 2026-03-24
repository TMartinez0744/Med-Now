import { Link } from "react-router-dom";

function DoctorDashboardPage() {
    return (
        <div>
            <h1>Dashboard Médico</h1>
            <p>Sesión iniciada</p>

            <Link to="/">
                <button>Cerrar sesión</button>
            </Link>
        </div>
    );
}

export default DoctorDashboardPage;