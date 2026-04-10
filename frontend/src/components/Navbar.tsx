import { NavLink } from "react-router-dom";

type NavbarProps = {
    role: "doctor" | "patient";
};

function Navbar({ role }: NavbarProps) {
    const profilePath = role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
    const turnosPath = role === "doctor" ? "/doctor/turnos" : "/patient/turnos";

    return (
        <nav className="navbar">
            <NavLink
                to={turnosPath}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Turnos
            </NavLink>
            <span className="nav-item disabled">Mapa</span>
            <span className="nav-item disabled">Chat</span>
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