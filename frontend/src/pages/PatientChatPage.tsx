import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { apiFetch } from "../lib/api";
import { showToast } from "../lib/toast";

const DEFAULT_ASSISTANT_NAME = "AlivIA";
const HISTORY_LIMIT = 20;

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type ChatHistoryItem = {
    id: string;
    title: string;
    preview: string;
    messages: ChatMessage[];
    createdAt: string;
};

type View = "intro" | "chat" | "viewing";

function buildWelcome(name: string): string {
    return `¡Hola! Soy ${name}, el asistente médico virtual de MedNow.\n\nEstoy acá para orientarte con consultas de salud, síntomas o información general. Tené en cuenta que no reemplazo a un médico: si tu caso amerita atención profesional te voy a sugerir sacar un turno.\n\n¿En qué te puedo ayudar hoy?`;
}

function getHistoryKey(userId: string | undefined | null): string {
    return `mednow.chatHistory.${userId || "anon"}`;
}

function loadHistory(userId: string | undefined | null): ChatHistoryItem[] {
    try {
        const raw = localStorage.getItem(getHistoryKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(userId: string | undefined | null, items: ChatHistoryItem[]) {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

function parseDerivar(content: string): { cleaned: string; resumen: string | null; hasDerivar: boolean } {
    const m = content.match(/\[\s*DERIVAR\s*\]/i);
    if (!m || m.index === undefined) {
        return { cleaned: content, resumen: null, hasDerivar: false };
    }
    const cleaned = content.slice(0, m.index).trim();
    const after = content.slice(m.index + m[0].length);
    const resumenMatch = after.match(/RESUMEN\s*:\s*(.+)/i);
    return {
        cleaned,
        resumen: resumenMatch ? resumenMatch[1].trim() : null,
        hasDerivar: true,
    };
}

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function buildTitle(messages: ChatMessage[]): string {
    const firstUser = messages.find((m) => m.role === "user");
    const text = firstUser?.content?.trim() ?? "Conversación";
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const hoy = new Date();
        const sameDay = d.toDateString() === hoy.toDateString();
        if (sameDay) {
            return "Hoy · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) +
            " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

const RobotAvatar = ({ size = 24, stroke = "white" }: { size?: number; stroke?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <circle cx="12" cy="2" r="1" fill={stroke} stroke="none" />
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <circle cx="9" cy="11" r="1.3" fill={stroke} stroke="none" />
        <circle cx="15" cy="11" r="1.3" fill={stroke} stroke="none" />
        <line x1="9" y1="15" x2="15" y2="15" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
    </svg>
);

function PatientChatPage() {
    const navigate = useNavigate();
    const patientData = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("patientData") || "{}");
        } catch {
            return {};
        }
    }, []);

    const [assistantName, setAssistantName] = useState(DEFAULT_ASSISTANT_NAME);
    const [view, setView] = useState<View>("intro");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<ChatHistoryItem[]>(() => loadHistory(patientData.id));
    const [viewingChat, setViewingChat] = useState<ChatHistoryItem | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Derivación a médico humano
    const [derivacionId, setDerivacionId] = useState<string | null>(null);
    const [derivacionResumen, setDerivacionResumen] = useState<string | null>(null);
    const [derivacionStarting, setDerivacionStarting] = useState(false);
    const [derivacionStartedAt, setDerivacionStartedAt] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Polling de la derivación cuando hay una activa
    useEffect(() => {
        if (!derivacionId) return;
        let active = true;

        const tick = async () => {
            try {
                const res = await apiFetch(`/api/derivaciones/${derivacionId}`);
                if (!res.ok) return;
                const json = await res.json();
                if (!active || !json?.success) return;
                const d = json.data;
                if (d.estado === "aceptada" && d.room_id) {
                    showToast(`${d.medico?.nombre_apellido ?? "Un médico"} se unió al chat`, "success");
                    setDerivacionId(null);
                    setDerivacionStartedAt(null);
                    navigate(`/patient/chat/${d.room_id}`);
                } else if (d.estado === "cancelada") {
                    setDerivacionId(null);
                    setDerivacionStartedAt(null);
                    showToast("Ningún médico disponible por ahora. AlivIA seguirá ayudándote.");
                }
            } catch { /* silencioso */ }
        };

        tick();
        const interval = window.setInterval(tick, 3000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [derivacionId, navigate]);

    const requestDoctor = async (resumenSugerido?: string | null) => {
        if (derivacionId || derivacionStarting) return;
        setDerivacionStarting(true);
        try {
            const res = await apiFetch("/api/derivaciones", {
                method: "POST",
                body: JSON.stringify({
                    contexto: messages.length > 0 ? messages : [{ role: "user", content: "Solicito hablar con un médico" }],
                    resumen: resumenSugerido ?? "Paciente solicitó hablar con un médico humano",
                }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                const msg = json?.message ?? `No se pudo crear la solicitud (${res.status})`;
                showToast(msg);
                console.error("Error creando derivación:", res.status, json);
                return;
            }
            setDerivacionId(json.data.id);
            setDerivacionResumen(resumenSugerido ?? "Paciente solicitó hablar con un médico humano");
            setDerivacionStartedAt(Date.now());
            showToast("Buscando médico disponible...", "success");
        } catch (err) {
            console.error("Error al solicitar médico:", err);
            showToast("Error al conectar con el servidor");
        } finally {
            setDerivacionStarting(false);
        }
    };

    const cancelDerivacion = async () => {
        if (!derivacionId) return;
        try {
            await apiFetch(`/api/derivaciones/${derivacionId}/cancelar`, { method: "POST" });
        } catch { /* ignorar */ }
        setDerivacionId(null);
        setDerivacionStartedAt(null);
    };

    useEffect(() => {
        let active = true;
        apiFetch("/api/chat/info")
            .then((r) => r.json())
            .then((res) => {
                if (!active) return;
                const name = res?.data?.assistantName ?? DEFAULT_ASSISTANT_NAME;
                setAssistantName(name);
            })
            .catch(() => {
                if (!active) return;
                setAssistantName(DEFAULT_ASSISTANT_NAME);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (view === "chat" || view === "viewing") {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading, view, viewingChat]);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const startNewChat = () => {
        setMessages([{ role: "assistant", content: buildWelcome(assistantName) }]);
        setInput("");
        setError(null);
        setView("chat");
    };

    const finishChat = () => {
        const userMessages = messages.filter((m) => m.role === "user");
        if (userMessages.length > 0) {
            const item: ChatHistoryItem = {
                id: crypto.randomUUID(),
                title: buildTitle(messages),
                preview: userMessages[0].content.trim().slice(0, 90),
                messages,
                createdAt: new Date().toISOString(),
            };
            const next = [item, ...history];
            setHistory(next);
            saveHistory(patientData.id, next);
        }
        setMessages([]);
        setInput("");
        setError(null);
        setView("intro");
    };

    const openHistoryItem = (item: ChatHistoryItem) => {
        setViewingChat(item);
        setView("viewing");
    };

    const askDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDeleteId(id);
    };

    const confirmDelete = () => {
        if (!pendingDeleteId) return;
        const next = history.filter((h) => h.id !== pendingDeleteId);
        setHistory(next);
        saveHistory(patientData.id, next);
        setPendingDeleteId(null);
    };

    const cancelDelete = () => setPendingDeleteId(null);

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
            const response = await apiFetch("/api/chat", {
                method: "POST",
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

    if (view === "intro") {
        return (
            <div className="chat-container">
                <div className="chat-intro">
                    <div className="chat-intro-hero">
                        <div className="chat-intro-avatar">
                            <RobotAvatar size={56} stroke="white" />
                        </div>
                        <h1 className="chat-intro-name">{assistantName}</h1>
                        <p className="chat-intro-subtitle">Asistente médico virtual de MedNow</p>
                        <p className="chat-intro-desc">
                            Te oriento con consultas de salud, síntomas o información general.
                            No reemplazo a un médico — si tu caso amerita atención profesional te voy a
                            sugerir sacar un turno.
                        </p>
                        <button className="chat-intro-cta" onClick={startNewChat}>
                            Iniciar conversación
                        </button>
                    </div>

                    <div className="chat-history-section">
                        <h3 className="chat-history-title">Historial de chats</h3>
                        {history.length === 0 ? (
                            <p className="chat-history-empty">Todavía no tenés conversaciones guardadas.</p>
                        ) : (
                            <ul className="chat-history-list">
                                {history.map((item) => (
                                    <li
                                        key={item.id}
                                        className="chat-history-item"
                                        onClick={() => openHistoryItem(item)}
                                    >
                                        <div className="chat-history-item-icon">
                                            <RobotAvatar size={18} stroke="#2f5cf5" />
                                        </div>
                                        <div className="chat-history-item-body">
                                            <p className="chat-history-item-title">{item.title}</p>
                                            <p className="chat-history-item-meta">{formatDate(item.createdAt)}</p>
                                        </div>
                                        <button
                                            className="chat-history-item-delete"
                                            onClick={(e) => askDeleteHistoryItem(item.id, e)}
                                            aria-label="Eliminar"
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {pendingDeleteId && (
                    <div className="chat-confirm-overlay" onClick={cancelDelete}>
                        <div className="chat-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                            <h4 className="chat-confirm-title">¿Eliminar esta conversación?</h4>
                            <p className="chat-confirm-text">
                                Se va a borrar de tu historial. Esta acción no se puede deshacer.
                            </p>
                            <div className="chat-confirm-actions">
                                <button className="chat-confirm-cancel" onClick={cancelDelete}>
                                    Cancelar
                                </button>
                                <button className="chat-confirm-delete" onClick={confirmDelete}>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <Navbar role="patient" />
            </div>
        );
    }

    if (view === "viewing" && viewingChat) {
        return (
            <div className="chat-container">
                <div className="chat-header">
                    <button
                        className="chat-header-back"
                        onClick={() => { setViewingChat(null); setView("intro"); }}
                        aria-label="Volver"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="chat-header-avatar">
                        <RobotAvatar size={24} stroke="white" />
                    </div>
                    <div className="chat-header-text">
                        <h2 className="chat-header-name">{viewingChat.title}</h2>
                        <p className="chat-header-status chat-header-status-muted">
                            {formatDate(viewingChat.createdAt)} · solo lectura
                        </p>
                    </div>
                </div>

                <div className="chat-messages">
                    {viewingChat.messages.map((msg, i) => {
                        const prev = viewingChat.messages[i - 1];
                        const next = viewingChat.messages[i + 1];
                        const isMine = msg.role === "user";
                        const isFirstOfGroup = !prev || prev.role !== msg.role;
                        const isLastOfGroup = !next || next.role !== msg.role;
                        const senderName = isMine ? (patientData.name || "Vos") : assistantName;
                        const display = isMine ? msg.content : parseDerivar(msg.content).cleaned || msg.content;
                        return (
                            <div key={i} className={`chat-message-group ${isMine ? "mine" : "other"}`}>
                                {isFirstOfGroup && (
                                    <p className={`chat-sender-label ${isMine ? "mine" : "other"}`}>{senderName}</p>
                                )}
                                <div className={`chat-bubble-row ${isMine ? "user" : "assistant"}`}>
                                    {!isMine && (
                                        isLastOfGroup
                                            ? <div className="chat-avatar chat-avatar-bot"><RobotAvatar size={18} stroke="white" /></div>
                                            : <div className="chat-avatar-placeholder" />
                                    )}
                                    <div className={`chat-bubble ${isMine ? "user" : "assistant"}`}>
                                        {display.split("\n").map((line, idx) => (
                                            <p key={idx} className="chat-bubble-line">{line}</p>
                                        ))}
                                    </div>
                                    {isMine && (
                                        isLastOfGroup
                                            ? <div className="chat-avatar chat-avatar-mine">{getInitials(senderName)}</div>
                                            : <div className="chat-avatar-placeholder" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <Navbar role="patient" />
            </div>
        );
    }

    // Encontrar el último mensaje del asistente con [DERIVAR] (para mostrar CTA debajo)
    const lastDerivarIdx = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.role === "assistant" && parseDerivar(m.content).hasDerivar) return i;
        }
        return -1;
    })();
    const lastDerivarResumen = lastDerivarIdx >= 0
        ? parseDerivar(messages[lastDerivarIdx].content).resumen
        : null;

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-header-avatar">
                    <RobotAvatar size={24} stroke="white" />
                </div>
                <div className="chat-header-text">
                    <h2 className="chat-header-name">{assistantName}</h2>
                    <p className="chat-header-status">
                        <span className="chat-status-dot" /> Asistente médico en línea
                    </p>
                </div>
                <button
                    className="chat-header-doctor"
                    onClick={() => requestDoctor(lastDerivarResumen)}
                    disabled={!!derivacionId || derivacionStarting}
                    title="Pedir hablar con un médico humano"
                >
                    {derivacionStarting ? "..." : "Solicitar médico"}
                </button>
                <button
                    className="chat-header-finish"
                    onClick={finishChat}
                    aria-label="Finalizar chat"
                >
                    Finalizar
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, i) => {
                    const prev = messages[i - 1];
                    const next = messages[i + 1];
                    const isMine = msg.role === "user";
                    const isFirstOfGroup = !prev || prev.role !== msg.role;
                    const isLastOfGroup = !next || next.role !== msg.role;
                    const senderName = isMine ? (patientData.name || "Vos") : assistantName;
                    const parsed = isMine ? null : parseDerivar(msg.content);
                    const display = parsed ? (parsed.cleaned || msg.content) : msg.content;
                    const showCTA = !isMine && i === lastDerivarIdx && !derivacionId;
                    return (
                        <div key={i} className={`chat-message-group ${isMine ? "mine" : "other"}`}>
                            {isFirstOfGroup && (
                                <p className={`chat-sender-label ${isMine ? "mine" : "other"}`}>{senderName}</p>
                            )}
                            <div className={`chat-bubble-row ${isMine ? "user" : "assistant"}`}>
                                {!isMine && (
                                    isLastOfGroup
                                        ? <div className="chat-avatar chat-avatar-bot"><RobotAvatar size={18} stroke="white" /></div>
                                        : <div className="chat-avatar-placeholder" />
                                )}
                                <div className={`chat-bubble ${isMine ? "user" : "assistant"}`}>
                                    {display.split("\n").map((line, idx) => (
                                        <p key={idx} className="chat-bubble-line">{line}</p>
                                    ))}
                                </div>
                                {isMine && (
                                    isLastOfGroup
                                        ? <div className="chat-avatar chat-avatar-mine">{getInitials(senderName)}</div>
                                        : <div className="chat-avatar-placeholder" />
                                )}
                            </div>
                            {showCTA && (
                                <div className="derivar-cta">
                                    <p className="derivar-cta-title">¿Querés que te conecte con un médico?</p>
                                    <p className="derivar-cta-sub">Un profesional de MedNow te va a contestar en cuanto esté disponible.</p>
                                    <button
                                        className="derivar-cta-btn"
                                        onClick={() => requestDoctor(parsed?.resumen ?? null)}
                                        disabled={derivacionStarting}
                                    >
                                        {derivacionStarting ? "Enviando..." : "Hablar con un médico"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {loading && (
                    <div className="chat-message-group other">
                        <div className="chat-bubble-row assistant">
                            <div className="chat-avatar chat-avatar-bot"><RobotAvatar size={18} stroke="white" /></div>
                            <div className="chat-bubble assistant chat-typing">
                                <span /><span /><span />
                            </div>
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

            {derivacionId && (
                <DerivacionWaiting
                    resumen={derivacionResumen}
                    startedAt={derivacionStartedAt}
                    onCancel={cancelDerivacion}
                />
            )}
        </div>
    );
}

function DerivacionWaiting({
    resumen,
    startedAt,
    onCancel,
}: {
    resumen: string | null;
    startedAt: number | null;
    onCancel: () => void;
}) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!startedAt) return;
        const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [startedAt]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
        <div className="derivar-overlay">
            <div className="derivar-overlay-card">
                <div className="derivar-spinner" />
                <h3 className="derivar-overlay-title">Buscando un médico disponible…</h3>
                <p className="derivar-overlay-text">
                    Te avisamos apenas alguien tome tu consulta. Si pasan 5 minutos sin respuesta, vamos a cancelar la solicitud automáticamente.
                </p>
                {resumen && (
                    <div className="derivar-overlay-resumen">
                        <p className="derivar-overlay-resumen-label">Resumen enviado al médico</p>
                        <p className="derivar-overlay-resumen-text">{resumen}</p>
                    </div>
                )}
                <p className="derivar-overlay-timer">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
                <button className="derivar-overlay-cancel" onClick={onCancel}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}

export default PatientChatPage;
