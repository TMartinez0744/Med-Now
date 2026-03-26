import { useNavigate } from "react-router-dom";

function DoctorDashboardPage() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("doctorDni");
        navigate("/");
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">+</div>

                <h1 className="auth-title">MedNow</h1>

                <p className="dashboard-text">
                    Sesión iniciada como médico
                </p>

                <button className="auth-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}

export default DoctorDashboardPage;