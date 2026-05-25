import { NavLink } from "react-router-dom";

type NavbarProps = {
    role: "doctor" | "patient";
};

function Navbar({ role }: NavbarProps) {
    const profilePath = role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
    const turnosPath = role === "doctor" ? "/doctor/turnos" : "/patient/turnos";

    return (
        <nav className="navbar">
            {role === "patient" ? (
                <NavLink
                    to="/patient/turnos"
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                    Turnos
                </NavLink>
            ) : (
                <span className="nav-item disabled">Turnos</span>
            )}
            <span className="nav-item disabled">Mapa</span>
            {role === "patient" ? (
                <NavLink
                    to="/patient/chat"
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                    Chat
                </NavLink>
            ) : (
                <span className="nav-item disabled">Chat</span>
            )}
            <NavLink
                to={profilePath}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Perfil
            </NavLink>
        </nav>
    );
}

export default Navbar;