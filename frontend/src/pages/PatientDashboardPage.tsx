import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate, Link } from "react-router-dom";
import personIcon from "../assets/person.svg";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";


interface TurnoPaciente {
    id: string;
    fecha_hora: string;
    estado: string;
    medicos: {
        especialidades: string[];
        profiles: { nombre_apellido: string };
    } | null;
}

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

    const [displayName, setDisplayName] = useState(
        patientData.name && patientData.lastName
            ? `${capitalize(patientData.name)} ${capitalize(patientData.lastName)}`
            : "Usuario"
    );

    const GENEROS = ["Femenino", "Masculino", "No binario"] as const;

    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [draftName, setDraftName] = useState(patientData.name ?? "");
    const [draftLastName, setDraftLastName] = useState(patientData.lastName ?? "");
    const [draftDni, setDraftDni] = useState(patientData.dni ?? "");
    const [draftEmail, setDraftEmail] = useState("");
    const [draftFechaNacimiento, setDraftFechaNacimiento] = useState("");
    const [draftGenero, setDraftGenero] = useState("");
    const [draftNumeroAfiliado, setDraftNumeroAfiliado] = useState("");
    const [savingName, setSavingName] = useState(false);
    const [perfilIncompleto, setPerfilIncompleto] = useState(false);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    const changePassword = async () => {
        if (!newPassword || !currentPassword) { showToast("Completá todos los campos"); return; }
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
            showToast("La contraseña debe tener al menos 8 caracteres, una letra y un número"); return;
        }
        if (newPassword !== confirmPassword) { showToast("Las contraseñas no coinciden"); return; }
        setSavingPassword(true);
        try {
            const res = await apiFetch("/api/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const json = await res.json();
            if (res.ok) {
                showToast("Contraseña actualizada", "success");
                setShowPasswordModal(false);
                setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
            } else {
                showToast(json.message ?? "Error al cambiar la contraseña");
            }
        } catch { showToast("Error al cambiar la contraseña"); }
        setSavingPassword(false);
    };

    useEffect(() => {
        if (!patientData.id) return;
        apiFetch(`/api/pacientes/${patientData.id}/perfil`)
            .then(r => r.json())
            .then(({ data }) => {
                if (data) {
                    setDraftEmail(data.email ?? "");
                    setDraftFechaNacimiento(data.fecha_nacimiento ?? "");
                    setDraftGenero(data.genero ?? "");
                    setDraftNumeroAfiliado(data.numero_afiliado ?? "");
                    setPerfilIncompleto(!data.genero || !data.fecha_nacimiento || !data.email || !data.numero_afiliado);
                } else {
                    setPerfilIncompleto(true);
                }
            })
            .catch(() => setPerfilIncompleto(true));
    }, [patientData.id]);

    const openEditProfile = () => {
        setDraftName(patientData.name ?? "");
        setDraftLastName(patientData.lastName ?? "");
        setDraftDni(patientData.dni ?? "");
        setShowEditProfileModal(true);
    };

    const saveProfile = async () => {
        if (!draftName.trim()) { showToast("El nombre no puede estar vacío"); return; }
        if (draftEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftEmail.trim())) {
            showToast("El email no tiene un formato válido"); return;
        }
        if (draftNumeroAfiliado && !/^\d{6,15}$/.test(draftNumeroAfiliado)) {
            showToast("El número de afiliado debe tener entre 6 y 15 dígitos"); return;
        }
        setSavingName(true);
        const nombreCompleto = `${draftName.trim()} ${draftLastName.trim()}`.trim();
        try {
            const [resProfile, resPerfil] = await Promise.all([
                apiFetch(`/api/profiles/${patientData.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ nombre_apellido: nombreCompleto, dni: draftDni.trim() }),
                }),
                apiFetch(`/api/pacientes/${patientData.id}/perfil`, {
                    method: "PATCH",
                    body: JSON.stringify({ genero: draftGenero || null, fecha_nacimiento: draftFechaNacimiento || null, email: draftEmail.trim() || null, numero_afiliado: draftNumeroAfiliado.trim() || null }),
                }),
            ]);
            if (resProfile.ok && resPerfil.ok) {
                const updated = { ...patientData, name: draftName.trim(), lastName: draftLastName.trim(), nombre_apellido: nombreCompleto, dni: draftDni.trim() };
                localStorage.setItem("patientData", JSON.stringify(updated));
                setDisplayName(`${capitalize(draftName.trim())} ${capitalize(draftLastName.trim())}`);
                setPerfilIncompleto(!draftGenero || !draftFechaNacimiento || !draftEmail.trim() || !draftNumeroAfiliado.trim());
                setShowEditProfileModal(false);
                showToast("Perfil actualizado", "success");
            } else {
                showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
            }
        } catch {
            showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
        }
        setSavingName(false);
    };

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

    // estado turnos
    const [proximoTurno, setProximoTurno] = useState<TurnoPaciente | null>(null);
    const [loadingTurnos, setLoadingTurnos] = useState(false);

    useEffect(() => {
        if (!patientData.id) return;

        const loadHistorial = async () => {
            try {
                const res = await apiFetch(`/api/pacientes/${patientData.id}/ficha`);
                const { data } = await res.json();
                if (data) {
                    if (data.obra_social) setObraSocial(data.obra_social);
                    const ficha = data.ficha_medica as any;
                    if (ficha) {
                        if (ficha.condiciones) setCondiciones(ficha.condiciones);
                        if (ficha.alergias) setAlergias(ficha.alergias);
                    } else {
                        setCondiciones([]);
                        setAlergias([]);
                    }
                }
            } catch (error) {
                console.error("Error loading historial:", error);
            }
        };

        loadHistorial();
    }, [patientData.id]);

    // Cargar próximo turno del paciente
    useEffect(() => {
        if (!patientData.id) return;
        setLoadingTurnos(true);
        apiFetch(`/api/pacientes/${patientData.id}/turnos`)
            .then((r) => r.json())
            .then(({ data }) => setProximoTurno((data ?? [])[0] ?? null))
            .catch(console.error)
            .finally(() => setLoadingTurnos(false));
    }, [patientData.id]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("patientData");
        localStorage.removeItem("token");
        navigate("/");
    };

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

    const saveHistorial = async () => {
        setCondiciones(draftCondiciones);
        setAlergias(draftAlergias);
        setShowHistorialModal(false);

        if (!patientData.id) {
            console.error("saveHistorial: patientData.id está vacío", patientData);
            showToast("Sesión inválida. Por favor volvé a iniciar sesión.");
            return;
        }

        try {
            const res = await apiFetch(`/api/pacientes/${patientData.id}/historial`, {
                method: "PATCH",
                body: JSON.stringify({ ficha_medica: { condiciones: draftCondiciones, alergias: draftAlergias } }),
            });
            if (!res.ok) {
                showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
            }
        } catch {
            showToast("No se pudieron guardar los cambios. Intentá de nuevo.");
        }
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
                    <h2 className="dashboard-name">{displayName}</h2>
                    <p className="dashboard-sub">
                        DNI: {patientData.dni || "No disponible"}
                    </p>
                </div>
            </div>

            {/*Card Mis Turnos*/}
            <div className="dashboard-card">
                <div className="profile-block-header" style={{ marginBottom: 14 }}>
                    <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="#2f5cf5" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Mis Turnos</h3>
                </div>

                {loadingTurnos ? (
                    <p className="empty-text">Cargando turnos...</p>
                ) : !proximoTurno ? (
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <p className="empty-text" style={{ marginBottom: 12 }}>No tenés turnos reservados.</p>
                        <a
                            href="/patient/turnos"
                            style={{ color: "#2f5cf5", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                        >
                            Buscar turnos disponibles →
                        </a>
                    </div>
                ) : (
                    <>
                        <div style={{
                            background: "#f9fafb",
                            borderRadius: 14,
                            padding: "14px 16px",
                            border: "1px solid #f3f4f6",
                        }}>
                            <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 15, color: "#111827" }}>
                                {proximoTurno.medicos?.profiles?.nombre_apellido ?? "Médico"}
                            </p>
                            {proximoTurno.medicos?.especialidades?.[0] && (
                                <p style={{ margin: "0 0 4px", fontSize: 13, color: "#6b7280" }}>
                                    {proximoTurno.medicos.especialidades[0]}
                                </p>
                            )}
                            <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
                                📅 {new Date(proximoTurno.fecha_hora).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                                {" "}&nbsp;🕐 {new Date(proximoTurno.fecha_hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                            </p>
                        </div>
                        <a
                            href="/patient/turnos"
                            style={{ display: "block", textAlign: "right", marginTop: 10, color: "#2f5cf5", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                        >
                            Ver todos mis turnos →
                        </a>
                    </>
                )}
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

            {/* ── Banner perfil incompleto ── */}
            {perfilIncompleto && (
                <div className="dashboard-card" style={{
                    background: "#fffbeb", border: "1.5px solid #fbbf24",
                    display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#92400e" }}>Completá tu perfil</p>
                        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#b45309" }}>Falta agregar género, fecha de nacimiento, email o número de afiliado.</p>
                        <button
                            onClick={openEditProfile}
                            style={{ background: "#d97706", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                            Completar ahora
                        </button>
                    </div>
                </div>
            )}

            {/* ── Card Configuración ── */}
            <div className="dashboard-card">
                <h3>Configuración</h3>

                <button className="dashboard-button" onClick={openEditProfile}>
                    Editar Perfil
                </button>

                <button
                    className="dashboard-button"
                    onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setShowPasswordModal(true);
                    }}
                >
                    Cambiar Contraseña
                </button>

                <button className="dashboard-button">Notificaciones</button>

                <button className="dashboard-button logout" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <div className="dashboard-card">
                <h3>Funciones</h3>

                <Link to="/mapa-emergencias" style={{ textDecoration: "none" }}>
                    <button className="dashboard-button">
                        Ver mapa de guardias y farmacias
                    </button>
                </Link>
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
                                        onClick={async () => {
                                            setObraSocial(o);
                                            setShowObraModal(false);
                                            if (patientData.id) {
                                                await apiFetch(`/api/pacientes/${patientData.id}/obra-social`, {
                                                    method: "PATCH",
                                                    body: JSON.stringify({ obra_social: o }),
                                                });
                                            }
                                        }}
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

            {/* modal editar perfil */}
            {showEditProfileModal && (
                <div style={overlayStyle} onClick={() => setShowEditProfileModal(false)}>
                    <div style={{ ...modalStyle, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Editar Perfil</h3>
                            <button onClick={() => setShowEditProfileModal(false)} style={closeBtnStyle}>✕</button>
                        </div>

                        <label style={labelStyle}>Nombre</label>
                        <input
                            className="auth-input"
                            placeholder="Nombre"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Apellido</label>
                        <input
                            className="auth-input"
                            placeholder="Apellido"
                            value={draftLastName}
                            onChange={(e) => setDraftLastName(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>DNI</label>
                        <input
                            className="auth-input"
                            placeholder="DNI"
                            inputMode="numeric"
                            value={draftDni}
                            onChange={(e) => setDraftDni(e.target.value.replace(/\D/g, ""))}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Email</label>
                        <input
                            className="auth-input"
                            placeholder="ejemplo@mail.com"
                            type="email"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Fecha de nacimiento</label>
                        <input
                            className="auth-input"
                            type="date"
                            value={draftFechaNacimiento}
                            onChange={(e) => setDraftFechaNacimiento(e.target.value)}
                            max={new Date().toISOString().slice(0, 10)}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Número de afiliado (obra social)</label>
                        <input
                            className="auth-input"
                            placeholder="Ej: 12345678"
                            inputMode="numeric"
                            value={draftNumeroAfiliado}
                            onChange={(e) => setDraftNumeroAfiliado(e.target.value.replace(/\D/g, ""))}
                            style={{ marginBottom: 12 }}
                        />

                        <label style={labelStyle}>Género</label>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, marginTop: 4 }}>
                            {GENEROS.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setDraftGenero(draftGenero === g ? "" : g)}
                                    style={{
                                        padding: "9px 18px", borderRadius: 10,
                                        border: draftGenero === g ? "2px solid #2f5cf5" : "1.5px solid #e5e7eb",
                                        background: draftGenero === g ? "#eef3ff" : "white",
                                        color: draftGenero === g ? "#2f5cf5" : "#374151",
                                        fontWeight: draftGenero === g ? 700 : 500,
                                        fontSize: 14, cursor: "pointer",
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>

                        <button className="auth-button" onClick={saveProfile} disabled={savingName}>
                            {savingName ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            )}

            {/* modal cambiar contraseña */}
            {showPasswordModal && (
                <div style={overlayStyle} onClick={() => setShowPasswordModal(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={modalHeaderStyle}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>Cambiar contraseña</h3>
                            <button onClick={() => setShowPasswordModal(false)} style={closeBtnStyle}>✕</button>
                        </div>
                        <label style={labelStyle}>Contraseña actual</label>
                        <input className="auth-input" type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ marginBottom: 12 }} />
                        <label style={labelStyle}>Nueva contraseña</label>
                        <input className="auth-input" type="password" placeholder="Mínimo 8 caracteres, una letra y un número" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ marginBottom: 12 }} />
                        <label style={labelStyle}>Confirmar nueva contraseña</label>
                        <input className="auth-input" type="password" placeholder="Repetí la nueva contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ marginBottom: 24 }} />
                        <button className="auth-button" onClick={changePassword} disabled={savingPassword}>
                            {savingPassword ? "Guardando..." : "Confirmar"}
                        </button>
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
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: "20px",
};

const modalStyle: React.CSSProperties = {
    background: "white",
    width: "100%",
    maxWidth: 480,
    borderRadius: "24px",
    padding: "24px 20px 32px",
    maxHeight: "90vh",
    overflowY: "auto",
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

const labelStyle: React.CSSProperties = {
    fontSize: 13, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 4,
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