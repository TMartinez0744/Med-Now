import { Link } from "react-router-dom";

function HomePage() {
    return (
        <div className="home-container">
            <div className="home-card">
                <div className="home-logo">+</div>

                <h1 className="home-title">MedNow</h1>
                <p className="home-subtitle">
                    Por favor, selecciona tu tipo de perfil para continuar
                </p>

                <div className="home-buttons">
                    <Link to="/login/patient" className="home-link">
                        <button className="home-button primary">Soy Paciente</button>
                    </Link>

                    <Link to="/login/doctor" className="home-link">
                        <button className="home-button secondary">Soy Médico</button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default HomePage;