import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";
import { showToast } from "../lib/toast";

type Message = {
    id: string;
    room_id: string;
    sender_id: string;
    contenido: string;
    leido: boolean;
    created_at: string;
};

type ChatRoomProps = {
    role: "patient" | "doctor";
};

function ChatRoomPage({ role }: ChatRoomProps) {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const activeUser = JSON.parse(
        localStorage.getItem(role === "patient" ? "patientData" : "doctorData") || "{}"
    );
    const activeUserId = activeUser.id ?? "";

    const [messages, setMessages] = useState<Message[]>([]);
    const [destinatarioName, setDestinatarioName] = useState<string>("Cargando...");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingMessages, setFetchingMessages] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // 1. Cargar historial inicial y nombre del destinatario
    useEffect(() => {
        if (!roomId) return;

        let active = true;

        const loadChatDetails = async () => {
            try {
                // Obtener mensajes de la sala
                const resMsg = await apiFetch(`/api/chats/${roomId}/mensajes`);
                const dataMsg = await resMsg.json();
                if (active && dataMsg.success) {
                    setMessages(dataMsg.data ?? []);
                }

                // Obtener nombre del destinatario desde la lista de salas
                const resRooms = await apiFetch("/api/chats/rooms");
                const dataRooms = await resRooms.json();
                if (active && dataRooms.success) {
                    const currentRoom = (dataRooms.data ?? []).find((r: any) => r.id === roomId);
                    if (currentRoom?.destinatario) {
                        setDestinatarioName(currentRoom.destinatario.nombre_apellido);
                    } else {
                        setDestinatarioName(role === "patient" ? "Médico" : "Paciente");
                    }
                }
            } catch (err) {
                console.error("Error loading chat details:", err);
                if (active) {
                    showToast("Error al cargar la sala de chat.");
                }
            } finally {
                if (active) setFetchingMessages(false);
            }
        };

        loadChatDetails();

        return () => {
            active = false;
        };
    }, [roomId, role]);

    // 2. Conectar a Supabase Realtime para recibir mensajes en tiempo real
    useEffect(() => {
        if (!roomId) return;

        // Comprobación de que la Anon Key no es el placeholder para evitar errores en consola
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!anonKey || anonKey === "TU_ANON_KEY_DE_SUPABASE") {
            console.warn("⚠️ Supabase Anon Key no configurada. El chat funcionará en modo de solo envío local.");
            return;
        }

        const channel = supabase
            .channel(`room:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "mensajes",
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // Evitar duplicados (por ejemplo, si el remitente lo insertó localmente al recibir la respuesta del POST)
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // 3. Scroll automático hacia el último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    // 4. Enviar mensaje al backend
    const handleSendMessage = async () => {
        const text = input.trim();
        if (!text || loading || !roomId) return;

        setInput("");
        setLoading(true);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            const res = await apiFetch(`/api/chats/${roomId}/mensajes`, {
                method: "POST",
                body: JSON.stringify({ contenido: text }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message ?? "Error al enviar mensaje");
            }

            // Añadimos localmente para feedback inmediato (Realtime deduplicará por ID)
            const sentMsg = data.data as Message;
            setMessages((prev) => {
                if (prev.some((m) => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al conectar con el servidor";
            showToast(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleBack = () => {
        navigate(role === "patient" ? "/patient/dashboard" : "/doctor/dashboard");
    };

    return (
        <div className="chat-container">
            {/* Header del Chat */}
            <div className="chat-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                    onClick={handleBack}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 4
                    }}
                    aria-label="Volver"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <div className="chat-header-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>

                <div className="chat-header-text">
                    <h2 className="chat-header-name">{destinatarioName}</h2>
                    <p className="chat-header-status">
                        <span className="chat-status-dot" style={{ background: "#10b981" }} /> En línea
                    </p>
                </div>
            </div>

            {/* Listado de Mensajes */}
            <div className="chat-messages" style={{ padding: "16px 20px" }}>
                {fetchingMessages ? (
                    <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 40 }}>
                        Cargando mensajes...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 }}>
                        Estableciendo conexión. ¡Escribí un mensaje para iniciar la conversación! 💬
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.sender_id === activeUserId;
                        const date = new Date(msg.created_at);
                        const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

                        return (
                            <div
                                key={msg.id}
                                className={`chat-bubble-row ${isMine ? "user" : "assistant"}`}
                            >
                                <div className={`chat-bubble ${isMine ? "user" : "assistant"}`}>
                                    <p className="chat-bubble-line">{msg.contenido}</p>
                                    <span
                                        style={{
                                            display: "block",
                                            textAlign: "right",
                                            fontSize: 10,
                                            marginTop: 4,
                                            opacity: 0.7,
                                            color: isMine ? "white" : "#6b7280"
                                        }}
                                    >
                                        {time}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

                {loading && (
                    <div className="chat-bubble-row user">
                        <div className="chat-bubble user chat-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Barra de Entrada del Mensaje */}
            <div className="chat-input-bar">
                <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder="Escribí un mensaje..."
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        autoResize();
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={fetchingMessages}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={loading || !input.trim() || fetchingMessages}
                    aria-label="Enviar"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default ChatRoomPage;
