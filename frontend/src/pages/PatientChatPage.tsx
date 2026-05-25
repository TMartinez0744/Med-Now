import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";

const API = "http://localhost:3000/api";
const DEFAULT_ASSISTANT_NAME = "AlivIA";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

function buildWelcome(name: string): string {
    return `¡Hola! Soy ${name}, el asistente médico virtual de MedNow.\n\nEstoy acá para orientarte con consultas de salud, síntomas o información general. Tené en cuenta que no reemplazo a un médico: si tu caso amerita atención profesional te voy a sugerir sacar un turno.\n\n¿En qué te puedo ayudar hoy?`;
}

function PatientChatPage() {
    const [assistantName, setAssistantName] = useState(DEFAULT_ASSISTANT_NAME);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        let active = true;
        fetch(`${API}/chat/info`)
            .then((r) => r.json())
            .then((res) => {
                if (!active) return;
                const name = res?.data?.assistantName ?? DEFAULT_ASSISTANT_NAME;
                setAssistantName(name);
                setMessages([{ role: "assistant", content: buildWelcome(name) }]);
            })
            .catch(() => {
                if (!active) return;
                setMessages([{ role: "assistant", content: buildWelcome(DEFAULT_ASSISTANT_NAME) }]);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
        setMessages(newMessages);
        setInput("");
        setError(null);
        setLoading(true);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            const conversationMessages = newMessages.slice(1);
            const response = await fetch(`${API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: conversationMessages }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message ?? "Error al obtener respuesta");
            }

            setMessages([...newMessages, { role: "assistant", content: data.data.reply }]);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error de conexión";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-header-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="2" x2="12" y2="5" />
                        <circle cx="12" cy="2" r="1" fill="white" stroke="none" />
                        <rect x="4" y="5" width="16" height="14" rx="3" />
                        <circle cx="9" cy="11" r="1.3" fill="white" stroke="none" />
                        <circle cx="15" cy="11" r="1.3" fill="white" stroke="none" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                        <line x1="2" y1="12" x2="4" y2="12" />
                        <line x1="20" y1="12" x2="22" y2="12" />
                    </svg>
                </div>
                <div className="chat-header-text">
                    <h2 className="chat-header-name">{assistantName}</h2>
                    <p className="chat-header-status">
                        <span className="chat-status-dot" /> Asistente médico en línea
                    </p>
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`chat-bubble-row ${msg.role === "user" ? "user" : "assistant"}`}
                    >
                        <div className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"}`}>
                            {msg.content.split("\n").map((line, idx) => (
                                <p key={idx} className="chat-bubble-line">{line}</p>
                            ))}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="chat-bubble-row assistant">
                        <div className="chat-bubble assistant chat-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="chat-error">{error}</div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar">
                <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder="Escribí tu consulta..."
                    value={input}
                    onChange={(e) => { setInput(e.target.value); autoResize(); }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={loading}
                />
                <button
                    className="chat-send-btn"
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    aria-label="Enviar"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>

            <Navbar role="patient" />
        </div>
    );
}

export default PatientChatPage;
