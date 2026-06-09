import { NavLink } from "react-router-dom";

type NavbarProps = {
    role: "doctor" | "patient";
};

function Navbar({ role }: NavbarProps) {
    const profilePath = role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";

    return (
        <nav className="navbar">
            <NavLink
                to={role === "patient" ? "/patient/turnos" : "/doctor/turnos"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Turnos
            </NavLink>
            <NavLink
                to="/mapa-emergencias"
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Mapa
            </NavLink>
            <NavLink
                to={role === "patient" ? "/patient/chat" : "/doctor/chat"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Chat
            </NavLink>
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
