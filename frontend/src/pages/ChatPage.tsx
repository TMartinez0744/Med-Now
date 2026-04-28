import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { authFetch } from "../utils/authFetch";

const API = "http://localhost:3000/api";

interface Profile {
    id: string;
    nombre_apellido: string;
    tipo_usuario: string;
    dni?: string;
}

interface Conversation {
    contactId: string;
    profile: Profile;
    lastMessage: string;
    updatedAt: string;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    contenido: string;
    leido: boolean;
    created_at: string;
}

function ChatPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [role, setRole] = useState<"patient" | "doctor" | null>(null);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");

    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Profile[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<number | null>(null);

    // 1. Identificar usuario actual
    useEffect(() => {
        const patientRaw = localStorage.getItem("patientData");
        const doctorRaw = localStorage.getItem("doctorData");

        if (patientRaw) {
            const data = JSON.parse(patientRaw);
            setCurrentUser({ id: data.id, nombre_apellido: data.nombre_apellido, tipo_usuario: "paciente" });
            setRole("patient");
        } else if (doctorRaw) {
            const data = JSON.parse(doctorRaw);
            setCurrentUser({ id: data.id, nombre_apellido: data.nombre_apellido, tipo_usuario: "medico" });
            setRole("doctor");
        } else {
            navigate("/"); // No hay sesión
        }
    }, [navigate]);

    // 2. Cargar lista de conversaciones
    useEffect(() => {
        if (!currentUser) return;

        const loadConversations = () => {
            authFetch(`${API}/chat/conversaciones/${currentUser.id}`)
                .then((res) => res.json())
                .then(({ data }) => setConversations(data || []))
                .catch(console.error);
        };

        loadConversations();
        // Recargar conversaciones cada 10s
        const convInterval = setInterval(loadConversations, 10000);
        return () => clearInterval(convInterval);
    }, [currentUser]);

    // 3. Cargar mensajes del chat seleccionado y activar polling
    useEffect(() => {
        if (!currentUser || !selectedUser) return;

        const loadMessages = () => {
            authFetch(`${API}/chat/mensajes/${currentUser.id}/${selectedUser.id}`)
                .then((res) => res.json())
                .then(({ data }) => {
                    setMessages(data || []);
                })
                .catch(console.error);
        };

        loadMessages();
        
        // Polling cada 3 segundos
        intervalRef.current = setInterval(loadMessages, 3000) as unknown as number;

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [currentUser, selectedUser]);

    // 4. Auto-scroll al fondo cuando hay mensajes nuevos
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 5. Enviar mensaje
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !selectedUser) return;

        const contenido = newMessage.trim();
        setNewMessage("");

        // Optimistic UI insert
        const tempMsg: Message = {
            id: Date.now().toString(),
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            contenido,
            leido: false,
            created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            await authFetch(`${API}/chat/mensajes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender_id: currentUser.id,
                    receiver_id: selectedUser.id,
                    contenido
                })
            });
        } catch (error) {
            console.error("Error enviando mensaje", error);
        }
    };

    // 6. Buscar usuarios
    useEffect(() => {
        if (!searchModalOpen) return;
        
        const delayDebounceForSearch = setTimeout(() => {
            authFetch(`${API}/chat/usuarios/buscar?q=${searchQuery}`)
                .then(r => r.json())
                .then(({ data }) => {
                    // Filtrar yo mismo de los resultados
                    const filtered = (data || []).filter((u: Profile) => u.id !== currentUser?.id);
                    setSearchResults(filtered);
                });
        }, 300);

        return () => clearTimeout(delayDebounceForSearch);
    }, [searchQuery, searchModalOpen, currentUser]);

    const startNewChat = (user: Profile) => {
        setSelectedUser(user);
        setSearchModalOpen(false);
    };

    if (!currentUser || !role) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", paddingBottom: "70px", boxSizing: "border-box", backgroundColor: "#f9fafb" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, color: "#111827", fontSize: "20px" }}>Mensajes</h2>
                <button 
                    onClick={() => setSearchModalOpen(true)}
                    style={{
                        background: "#2f5cf5", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer"
                    }}
                >
                    + Nuevo Chat
                </button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                
                {/* Sidebar de Conversaciones */}
                <div style={{ width: "300px", borderRight: "1px solid #e5e7eb", backgroundColor: "#fff", display: "flex", flexDirection: "column" }}>
                    <div style={{ overflowY: "auto", flex: 1 }}>
                        {conversations.length === 0 ? (
                            <p style={{ textAlign: "center", color: "#6b7280", marginTop: "20px", fontSize: "14px" }}>No tienes conversaciones activas.</p>
                        ) : (
                            conversations.map((conv) => {
                                const isSelected = selectedUser?.id === conv.contactId;
                                const isDoctor = conv.profile.tipo_usuario === "medico";
                                return (
                                    <div 
                                        key={conv.contactId} 
                                        onClick={() => setSelectedUser(conv.profile)}
                                        style={{ 
                                            padding: "16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer",
                                            backgroundColor: isSelected ? "#eef3ff" : "transparent"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontWeight: 600, color: "#111827" }}>{isDoctor ? "Dr. " : ""}{conv.profile.nombre_apellido}</span>
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {conv.lastMessage}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Zona Principal de Chat */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f9fafb" }}>
                    {selectedUser ? (
                        <>
                            {/* Cabecera del chat actual */}
                            <div style={{ padding: "16px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" }}>
                                <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>
                                    {selectedUser.tipo_usuario === "medico" ? "Dr. " : ""}{selectedUser.nombre_apellido}
                                </h3>
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                    {selectedUser.tipo_usuario === "medico" ? "Profesional" : "Paciente"}
                                </span>
                            </div>

                            {/* Mensajes */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                {messages.length === 0 ? (
                                    <p style={{ textAlign: "center", color: "#9ca3af", margin: "auto", fontSize: "14px" }}>Envía un mensaje para iniciar la conversación.</p>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine = msg.sender_id === currentUser.id;
                                        return (
                                            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                                                <div style={{
                                                    maxWidth: "70%",
                                                    padding: "10px 14px",
                                                    borderRadius: "14px",
                                                    backgroundColor: isMine ? "#2f5cf5" : "#e5e7eb",
                                                    color: isMine ? "white" : "#111827",
                                                    borderBottomRightRadius: isMine ? "4px" : "14px",
                                                    borderBottomLeftRadius: isMine ? "14px" : "4px"
                                                }}>
                                                    <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>{msg.contenido}</p>
                                                    <span style={{ display: "block", fontSize: "10px", marginTop: "4px", textAlign: "right", color: isMine ? "#d1d5db" : "#6b7280" }}>
                                                        {new Date(msg.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Creador de mensajes */}
                            <div style={{ padding: "16px 24px", backgroundColor: "#fff", borderTop: "1px solid #e5e7eb" }}>
                                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "12px" }}>
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        style={{
                                            flex: 1,
                                            padding: "12px 16px",
                                            borderRadius: "999px",
                                            border: "1px solid #d1d5db",
                                            outline: "none",
                                            fontSize: "14px"
                                        }}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        style={{
                                            backgroundColor: newMessage.trim() ? "#2f5cf5" : "#9ca3af",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "999px",
                                            padding: "0 24px",
                                            fontWeight: 600,
                                            cursor: newMessage.trim() ? "pointer" : "not-allowed"
                                        }}
                                    >
                                        Enviar
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#6b7280" }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px", opacity: 0.5 }}>
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            <p style={{ fontSize: "16px" }}>Selecciona un chat o inicia uno nuevo</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navbar Bottom */}
            <Navbar role={role} />

            {/* Modal de Nuevo Chat */}
            {searchModalOpen && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSearchModalOpen(false)}>
                    <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", width: "90%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0 }}>Nuevo Chat</h3>
                            <button onClick={() => setSearchModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
                        </div>
                        
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "16px", boxSizing: "border-box" }}
                        />

                        <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {searchResults.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#6b7280", margin: "10px 0" }}>Sin resultados.</p>
                            ) : (
                                searchResults.map((u) => (
                                    <div 
                                        key={u.id}
                                        onClick={() => startNewChat(u)}
                                        style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                                    >
                                        <span style={{ fontWeight: 500 }}>{u.tipo_usuario === 'medico' ? 'Dr. ' : ''}{u.nombre_apellido}</span>
                                        <span style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>{u.tipo_usuario}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatPage;
