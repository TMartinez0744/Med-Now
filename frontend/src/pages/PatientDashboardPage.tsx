import { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import personIcon from "../assets/person.svg";

interface HistorialItem {
    id: number;
    label: string;
}

//datos mockeados
const CONDICIONES_DISPONIBLES: HistorialItem[] = [
    { id: 1, label: "Hipertensión" },
    { id: 2, label: "Diabetes tipo 2" },
    { id: 3, label: "Asma" },
    { id: 4, label: "Taquicardia" },
    { id: 5, label: "Hipotiroidismo" },
    { id: 6, label: "Artritis" },
    { id: 7, label: "Migraña crónica" },
    { id: 8, label: "Depresión" },
    { id: 9, label: "Ansiedad" },
    { id: 10, label: "Celiaquía" },
];

const ALERGIAS_DISPONIBLES: HistorialItem[] = [
    { id: 101, label: "Penicilina" },
    { id: 102, label: "Ibuprofeno" },
    { id: 103, label: "Aspirina" },
    { id: 104, label: "Polen" },
    { id: 105, label: "Ácaros" },
    { id: 106, label: "Mariscos" },
    { id: 107, label: "Látex" },
    { id: 108, label: "Sulfas" },
    { id: 109, label: "Nueces" },
    { id: 110, label: "Leche" },
];

const OBRAS_SOCIALES = [
    "OSDE", "Swiss Medical", "Galeno", "IOMA", "Medifé",
    "Sancor Salud", "PAMI", "Accord Salud", "Medicus", "Omint",
];

//comp ppal
function PatientDashboardPage() {
    const navigate = useNavigate();
    const patientData = JSON.parse(localStorage.getItem("patientData") || "{}");

    const capitalize = (text: string): string => {
        if (!text) return "";
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };

    const patientName =
        patientData.name && patientData.lastName
            ? `${capitalize(patientData.name)} ${capitalize(patientData.lastName)}`
            : "Usuario";

    // estado obra social
    const [obraSocial, setObraSocial] = useState("OSDE");
    const [obraSocialSearch, setObraSocialSearch] = useState("");
    const [showObraModal, setShowObraModal] = useState(false);

    // estado historial
    const [condiciones, setCondiciones] = useState<HistorialItem[]>([
        { id: 1, label: "Hipertensión" },
    ]);
    const [alergias, setAlergias] = useState<HistorialItem[]>([
        { id: 101, label: "Penicilina" },
    ]);
    const [showHistorialModal, setShowHistorialModal] = useState(false);
    const [searchCondicion, setSearchCondicion] = useState("");
    const [searchAlergia, setSearchAlergia] = useState("");

    // draft para editar sin aplicar hasta guardar
    const [draftCondiciones, setDraftCondiciones] = useState<HistorialItem[]>([]);
    const [draftAlergias, setDraftAlergias] = useState<HistorialItem[]>([]);

    const handleLogout = () => navigate("/");

    // ── obra social helpers ──
    const filteredObras = OBRAS_SOCIALES.filter((o) =>
        o.toLowerCase().includes(obraSocialSearch.toLowerCase())
    );

    const filteredCondiciones = CONDICIONES_DISPONIBLES.filter((c) =>
        c.label.toLowerCase().includes(searchCondicion.toLowerCase())
    );
    const filteredAlergias = ALERGIAS_DISPONIBLES.filter((a) =>
        a.label.toLowerCase().includes(searchAlergia.toLowerCase())
    );

    const toggleDraftItem = (
        item: HistorialItem,
        draft: HistorialItem[],
        setDraft: (v: HistorialItem[]) => void
    ) => {
        const exists = draft.find((d) => d.id === item.id);
        if (exists) setDraft(draft.filter((d) => d.id !== item.id));
        else setDraft([...draft, item]);
    };

    const openHistorialModal = () => {
        setDraftCondiciones([...condiciones]);
        setDraftAlergias([...alergias]);
        setSearchCondicion("");
        setSearchAlergia("");
        setShowHistorialModal(true);
    };

    const saveHistorial = () => {
        setCondiciones(draftCondiciones);
        setAlergias(draftAlergias);
        setShowHistorialModal(false);
    };

    //render
    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="avatar">
                    <img src={personIcon} alt="Usuario" className="avatar-icon" />
                </div>
                <div>
                    <h2 className="dashboard-name">{patientName}</h2>
                    <p className="dashboard-sub">
                        DNI: {patientData.dni || "No disponible"}
                    </p>
                </div>
            </div>

            {/*Card Obra Social*/}
            <div className="dashboard-card">
                <div className="profile-block-header">
                    <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Obra Social</h3>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, color: "#374151", fontWeight: 500 }}>{obraSocial}</span>
                    <button
                        onClick={() => { setObraSocialSearch(""); setShowObraModal(true); }}
                        style={{
                            border: "1px solid #e5e7eb",
                            background: "white",
                            padding: "8px 14px",
                            borderRadius: 10,
                            fontSize: 14,
                            cursor: "pointer",
                            color: "#2f5cf5",
                            fontWeight: 600,
                        }}
                    >
                        Cambiar
                    </button>
                </div>
            </div>

            {/* Card Historial Médico */}
            <div className="dashboard-card">
                <div className="profile-block-header">
                    <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Historial Médico</h3>
                </div>

                {/* Condiciones */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Condiciones</span>
                    </div>
                    <div className="chips-list">
                        {condiciones.length === 0 ? (
                            <p className="empty-text">Sin condiciones registradas</p>
                        ) : (
                            condiciones.map((c) => (
                                <span key={c.id} className="info-chip" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  {c.label}
                </span>
                            ))
                        )}
                    </div>
                </div>

                {/* Alergias */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Alergias</span>
                    </div>
                    <div className="chips-list">
                        {alergias.length === 0 ? (
                            <p className="empty-text">Sin alergias registradas</p>
                        ) : (
                            alergias.map((a) => (
                                <span key={a.id} className="info-chip" style={{ background: "#fef3c7", color: "#b45309" }}>
                  {a.label}
                </span>
                            ))
                        )}
                    </div>
                </div>

                <button className="dashboard-button" onClick={openHistorialModal} style={{ textAlign: "center" }}>
                    Editar Historial
                </button>
            </div>

            {/* ── Card Configuración ── */}
            <div className="dashboard-card">
                <h3>Configuración</h3>
                <button className="dashboard-button">Editar Perfil</button>
                <button className="dashboard-button">Cambiar Contraseña</button>
                <button className="dashboard-button">Notificaciones</button>
                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Navbar role="patient" />

            {/* modal p elegir obra social*/}
            {showObraModal && (
                <div style={overlayStyle} onClick={() => setShowObraModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Cambiar Obra Social</h3>
                            <button onClick={() => setShowObraModal(false)} style={closeBtnStyle}>✕</button>
                        </div>

                        <input
                            className="auth-input"
                            placeholder="Buscar obra social..."
                            value={obraSocialSearch}
                            onChange={(e) => setObraSocialSearch(e.target.value)}
                            style={{ marginBottom: 12 }}
                            autoFocus
                        />

                        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                            {filteredObras.length === 0 ? (
                                <p className="empty-text">Sin resultados</p>
                            ) : (
                                filteredObras.map((o) => (
                                    <button
                                        key={o}
                                        onClick={() => { setObraSocial(o); setShowObraModal(false); }}
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
                                            borderRadius: 12,
                                            border: o === obraSocial ? "2px solid #2f5cf5" : "1px solid #e5e7eb",
                                            background: o === obraSocial ? "#eef3ff" : "white",
                                            color: o === obraSocial ? "#2f5cf5" : "#111827",
                                            fontWeight: o === obraSocial ? 700 : 400,
                                            fontSize: 15,
                                            cursor: "pointer",
                                            textAlign: "left",
                                        }}
                                    >
                                        {o}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/*modal historial medico*/}
            {showHistorialModal && (
                <div style={overlayStyle} onClick={() => setShowHistorialModal(false)}>
                    <div style={{ ...modalStyle, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Editar Historial Médico</h3>
                            <button onClick={() => setShowHistorialModal(false)} style={closeBtnStyle}>✕</button>
                        </div>

                        {/* Condiciones */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>Condiciones</span>
                            </div>

                            {/* chips seleccionados */}
                            {draftCondiciones.length > 0 && (
                                <div className="chips-list" style={{ marginBottom: 10 }}>
                                    {draftCondiciones.map((c) => (
                                        <span
                                            key={c.id}
                                            className="info-chip"
                                            style={{ background: "#fee2e2", color: "#b91c1c", cursor: "pointer" }}
                                            onClick={() => toggleDraftItem(c, draftCondiciones, setDraftCondiciones)}
                                        >
                      {c.label} ✕
                    </span>
                                    ))}
                                </div>
                            )}

                            <input
                                className="auth-input"
                                placeholder="Buscar condición..."
                                value={searchCondicion}
                                onChange={(e) => setSearchCondicion(e.target.value)}
                                style={{ marginBottom: 8 }}
                            />

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {filteredCondiciones
                                    .filter((c) => !draftCondiciones.find((d) => d.id === c.id))
                                    .slice(0, 6)
                                    .map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => toggleDraftItem(c, draftCondiciones, setDraftCondiciones)}
                                            style={suggestionBtnStyle}
                                        >
                                            + {c.label}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Alergias */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>Alergias</span>
                            </div>

                            {draftAlergias.length > 0 && (
                                <div className="chips-list" style={{ marginBottom: 10 }}>
                                    {draftAlergias.map((a) => (
                                        <span
                                            key={a.id}
                                            className="info-chip"
                                            style={{ background: "#fef3c7", color: "#b45309", cursor: "pointer" }}
                                            onClick={() => toggleDraftItem(a, draftAlergias, setDraftAlergias)}
                                        >
                      {a.label} ✕
                    </span>
                                    ))}
                                </div>
                            )}

                            <input
                                className="auth-input"
                                placeholder="Buscar alergia..."
                                value={searchAlergia}
                                onChange={(e) => setSearchAlergia(e.target.value)}
                                style={{ marginBottom: 8 }}
                            />

                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {filteredAlergias
                                    .filter((a) => !draftAlergias.find((d) => d.id === a.id))
                                    .slice(0, 6)
                                    .map((a) => (
                                        <button
                                            key={a.id}
                                            onClick={() => toggleDraftItem(a, draftAlergias, setDraftAlergias)}
                                            style={suggestionBtnStyle}
                                        >
                                            + {a.label}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Guardar */}
                        <button className="auth-button" onClick={saveHistorial}>
                            Guardar cambios
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 200,
};

const modalStyle: React.CSSProperties = {
    background: "white",
    width: "100%",
    maxWidth: 480,
    borderRadius: "24px 24px 0 0",
    padding: "24px 20px 32px",
};

const modalHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
};

const closeBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#6b7280",
};

const suggestionBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
    color: "#374151",
};

export default PatientDashboardPage;