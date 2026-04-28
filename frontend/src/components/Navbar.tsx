import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { authFetch } from "../utils/authFetch";

type NavbarProps = {
    role: "doctor" | "patient";
};

function Navbar({ role }: NavbarProps) {
    const profilePath = role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
    const turnosPath = role === "doctor" ? "/doctor/turnos" : "/patient/turnos";

    const [notificaciones, setNotificaciones] = useState<any[]>([]);
    const [showNotif, setShowNotif] = useState(false);

    useEffect(() => {
        const fetchNotif = async () => {
            try {
                const res = await authFetch("http://localhost:3000/api/notificaciones");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setNotificaciones(data.data);
                    }
                }
            } catch (err) {
                console.error("Error fetching notificaciones", err);
            }
        };
        fetchNotif();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotif, 30000);
        return () => clearInterval(interval);
    }, []);

    const noLeidas = notificaciones.filter(n => !n.leido).length;

    const marcarLeido = async (id: string) => {
        try {
            await authFetch(`http://localhost:3000/api/notificaciones/${id}/leido`, { method: "PATCH" });
            setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

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
            <NavLink
                to="/mapa"
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
                Mapa
            </NavLink>
            <NavLink
                to="/chat"
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

            <div className="nav-item" style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotif(!showNotif)}>
                <span>🔔 Notif.</span>
                {noLeidas > 0 && (
                    <span style={{
                        position: "absolute", top: -5, right: 0, background: "red", color: "white",
                        borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold"
                    }}>
                        {noLeidas}
                    </span>
                )}
                
                {showNotif && (
                    <div style={{
                        position: "absolute", bottom: "100%", right: "0", background: "white",
                        border: "1px solid #ccc", borderRadius: "8px", width: "250px", maxHeight: "300px",
                        overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 1000, padding: "10px",
                        color: "black", textAlign: "left"
                    }}>
                        <h4 style={{ margin: "0 0 10px 0" }}>Notificaciones</h4>
                        {notificaciones.length === 0 ? (
                            <p style={{ fontSize: "12px", color: "gray" }}>No tienes notificaciones.</p>
                        ) : (
                            notificaciones.map(n => (
                                <div key={n.id} style={{
                                    padding: "8px", borderBottom: "1px solid #eee",
                                    background: n.leido ? "transparent" : "#eef2ff",
                                    borderRadius: "4px", marginBottom: "4px", fontSize: "12px"
                                }} onClick={(e) => { e.stopPropagation(); if (!n.leido) marcarLeido(n.id); }}>
                                    <p style={{ margin: "0 0 4px 0", fontWeight: n.leido ? "normal" : "bold" }}>{n.mensaje}</p>
                                    <small style={{ color: "gray" }}>{new Date(n.created_at).toLocaleString()}</small>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;