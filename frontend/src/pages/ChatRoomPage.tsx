import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";
import { showToast } from "../lib/toast";
import { formatDoctorName } from "../lib/doctorName";
import Navbar from "../components/Navbar";
import FichaPaciente from "../components/FichaPaciente";

type Message = {
    id: string;
    room_id: string;
    sender_id: string;
    contenido: string;
    leido: boolean;
    created_at: string;
    tipo?: string | null;
};

type ChatRoomProps = {
    role: "patient" | "doctor";
};

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getFilenameFromUrl(url: string): string {
    try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split("/");
        const lastPart = parts[parts.length - 1];
        // Quitar el timestamp del inicio si existe
        return lastPart.split("_").slice(2).join("_") || lastPart.split("_").slice(1).join("_") || lastPart;
    } catch {
        return "receta_medica.pdf";
    }
}

function compressImage(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(event.target?.result as string); // fallback to original base64
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function ChatRoomPage({ role }: ChatRoomProps) {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const activeUser = useMemo(() => {
        try {
            return JSON.parse(
                localStorage.getItem(role === "patient" ? "patientData" : "doctorData") || "{}"
            );
        } catch {
            return {};
        }
    }, [role]);
    const activeUserId: string = activeUser.id ?? "";
    const activeUserName: string = role === "doctor"
        ? formatDoctorName(activeUser.nombre_apellido, activeUser.licenseNumber)
        : (activeUser.nombre_apellido ?? "Vos");

    const [messages, setMessages] = useState<Message[]>([]);
    const [destinatarioName, setDestinatarioName] = useState<string>("Cargando...");
    const [destinatarioId, setDestinatarioId] = useState<string | null>(null);
    const [destinatarioFotoUrl, setDestinatarioFotoUrl] = useState<string | null>(null);
    const [fichaAbierta, setFichaAbierta] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [fetchingMessages, setFetchingMessages] = useState(true);
    const [otherTyping, setOtherTyping] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pdfInputRef = useRef<HTMLInputElement | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const lastTypingSentRef = useRef<number>(0);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !roomId) return;
        e.target.value = "";
        setUploadingImage(true);
        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `room_${roomId}/${fileName}`;

            // Comprimir la imagen antes de subirla
            const base64File = await compressImage(file);

            // Subir a través del backend
            const uploadRes = await apiFetch("/api/upload", {
                method: "POST",
                body: JSON.stringify({
                    file: base64File,
                    filename: filePath,
                    mimeType: "image/jpeg" // siempre es jpeg luego de canvas.toDataURL("image/jpeg")
                })
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(uploadData.message ?? "Error al subir la imagen");
            }
            const publicUrl = uploadData.publicUrl;

            const res = await apiFetch(`/api/chats/${roomId}/mensajes`, {
                method: "POST",
                body: JSON.stringify({ contenido: publicUrl, tipo: "imagen" }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message ?? "Error al enviar la imagen");
            const sentMsg = data.data as Message;
            setMessages((prev) => {
                if (prev.some((m) => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al subir la imagen";
            showToast(msg);
        } finally {
            setUploadingImage(false);
        }
    };
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !roomId) return;
        if (file.type !== "application/pdf") {
            showToast("El archivo seleccionado debe ser un archivo PDF.");
            return;
        }
        e.target.value = "";
        setUploadingPdf(true);
        try {
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name}`;
            const filePath = `room_${roomId}/documents/${fileName}`;

            // Leer archivo como Base64
            const base64File = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
            });

            // Subir a través del backend
            const uploadRes = await apiFetch("/api/upload", {
                method: "POST",
                body: JSON.stringify({
                    file: base64File,
                    filename: filePath,
                    mimeType: "application/pdf"
                })
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(uploadData.message ?? "Error al subir el archivo");
            }
            const publicUrl = uploadData.publicUrl;

            // Guardar el mensaje como tipo 'documento'
            const res = await apiFetch(`/api/chats/${roomId}/mensajes`, {
                method: "POST",
                body: JSON.stringify({ contenido: publicUrl, tipo: "documento" }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message ?? "Error al enviar el archivo");
            const sentMsg = data.data as Message;
            setMessages((prev) => {
                if (prev.some((m) => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al subir el documento";
            showToast(msg);
        } finally {
            setUploadingPdf(false);
        }
    };

    // 1. Cargar historial y nombre del destinatario
    useEffect(() => {
        if (!roomId) return;
        let active = true;
        (async () => {
            try {
                const resMsg = await apiFetch(`/api/chats/${roomId}/mensajes`);
                const dataMsg = await resMsg.json();
                if (active && dataMsg.success) setMessages(dataMsg.data ?? []);

                const resRooms = await apiFetch("/api/chats/rooms");
                const dataRooms = await resRooms.json();
                if (active && dataRooms.success) {
                    const currentRoom = (dataRooms.data ?? []).find((r: any) => r.id === roomId);
                    if (currentRoom?.destinatario) {
                        const nombre = currentRoom.destinatario.nombre_apellido;
                        setDestinatarioName(role === "patient" ? formatDoctorName(nombre) : nombre);
                        setDestinatarioId(currentRoom.destinatario.id);
                        setDestinatarioFotoUrl(currentRoom.destinatario.foto_url ?? null);
                    } else {
                        setDestinatarioName(role === "patient" ? "Médico" : "Paciente");
                    }
                }
            } catch (err) {
                console.error("Error loading chat details:", err);
                if (active) showToast("Error al cargar la sala de chat.");
            } finally {
                if (active) setFetchingMessages(false);
            }
        })();
        return () => { active = false; };
    }, [roomId, role]);

    // 2. Realtime: mensajes + typing
    useEffect(() => {
        if (!roomId || !activeUserId) return;

        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!anonKey || anonKey === "TU_ANON_KEY_DE_SUPABASE") {
            console.warn("Supabase Anon Key no configurada. Realtime deshabilitado.");
            return;
        }

        const channel = supabase
            .channel(`room:${roomId}`, { config: { broadcast: { self: false } } })
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "mensajes",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    if (newMsg.sender_id !== activeUserId) setOtherTyping(false);
                }
            )
            .on("broadcast", { event: "typing" }, (payload) => {
                const data = payload.payload as { userId: string; typing: boolean };
                if (data?.userId && data.userId !== activeUserId) {
                    setOtherTyping(!!data.typing);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        };
    }, [roomId, activeUserId]);

    // 3. Scroll automático
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, otherTyping]);

    const autoResize = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    };

    const sendTypingBroadcast = (typing: boolean) => {
        const ch = channelRef.current;
        if (!ch) return;
        ch.send({
            type: "broadcast",
            event: "typing",
            payload: { userId: activeUserId, typing },
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        autoResize();

        const now = Date.now();
        // throttle: solo mandar typing=true cada 1500ms
        if (now - lastTypingSentRef.current > 1500) {
            sendTypingBroadcast(true);
            lastTypingSentRef.current = now;
        }

        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            sendTypingBroadcast(false);
            lastTypingSentRef.current = 0;
        }, 2500);
    };

    const handleSendMessage = async () => {
        const text = input.trim();
        if (!text || sending || !roomId) return;

        setInput("");
        setSending(true);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        sendTypingBroadcast(false);
        lastTypingSentRef.current = 0;

        try {
            const res = await apiFetch(`/api/chats/${roomId}/mensajes`, {
                method: "POST",
                body: JSON.stringify({ contenido: text }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message ?? "Error al enviar mensaje");

            const sentMsg = data.data as Message;
            setMessages((prev) => {
                if (prev.some((m) => m.id === sentMsg.id)) return prev;
                return [...prev, sentMsg];
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al conectar con el servidor";
            showToast(msg);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const [showConfirmClose, setShowConfirmClose] = useState(false);

    const handleBack = () => {
        navigate(role === "patient" ? "/patient/dashboard" : "/doctor/dashboard");
    };

    const finalizarChat = async () => {
        setShowConfirmClose(false);
        if (!roomId) return;
        const quien = role === "patient" ? "El paciente" : "El médico";
        try {
            await apiFetch(`/api/chats/${roomId}/mensajes`, {
                method: "POST",
                body: JSON.stringify({ contenido: `${quien} finalizó la conversación.`, tipo: "sistema" }),
            });
        } catch { /* best-effort */ }
        navigate(role === "patient" ? "/patient/dashboard" : "/doctor/dashboard");
    };

    return (
        <div className="chat-container">
            <div className="chat-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                    onClick={handleBack}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 4 }}
                    aria-label="Volver"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>

                <div className="chat-header-avatar">
                    {destinatarioFotoUrl ? (
                        <img 
                            src={destinatarioFotoUrl} 
                            alt={getInitials(destinatarioName)} 
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                        />
                    ) : (
                        getInitials(destinatarioName)
                    )}
                </div>

                <div className="chat-header-text">
                    <h2 className="chat-header-name">{destinatarioName}</h2>
                    <p className="chat-header-status">
                        <span className="chat-status-dot" style={{ background: "#10b981" }} /> En línea
                    </p>
                </div>

                {role === "doctor" && destinatarioId && (
                    <button
                        onClick={() => setFichaAbierta(true)}
                        title="Ver ficha médica del paciente"
                        style={{
                            marginLeft: "auto",
                            background: "rgba(255,255,255,0.15)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        📋 Ficha
                    </button>
                )}
                <button
                    className="chat-header-finish"
                    onClick={() => setShowConfirmClose(true)}
                    title="Finalizar conversación"
                    style={role === "doctor" && destinatarioId ? {} : { marginLeft: "auto" }}
                >
                    Finalizar
                </button>
            </div>

            <div className="chat-messages" style={{ padding: "16px 20px" }}>
                {fetchingMessages ? (
                    <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 40 }}>
                        Cargando mensajes...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 }}>
                        Estableciendo conexión. ¡Escribí un mensaje para iniciar la conversación!
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        if (msg.tipo === "sistema") {
                            return (
                                <div key={msg.id} className="chat-system-msg">
                                    {msg.contenido}
                                </div>
                            );
                        }
                        if (msg.tipo === "contexto") {
                            const lines = msg.contenido.split("\n");
                            return (
                                <div key={msg.id} className="chat-contexto-card">
                                    <div className="chat-contexto-header">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                        </svg>
                                        <span>{lines[0]}</span>
                                    </div>
                                    <div className="chat-contexto-body">
                                        {lines.slice(1).map((l, idx) => (
                                            <p key={idx} className="chat-contexto-line">{l}</p>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        const isMine = msg.sender_id === activeUserId;
                        const prev = messages[i - 1];
                        const next = messages[i + 1];
                        const isFirstOfGroup = !prev || prev.sender_id !== msg.sender_id || prev.tipo === "sistema" || prev.tipo === "contexto";
                        const isLastOfGroup = !next || next.sender_id !== msg.sender_id || next.tipo === "sistema" || next.tipo === "contexto";
                        const senderName = isMine ? activeUserName : destinatarioName;
                        const initials = getInitials(senderName);
                        const time = new Date(msg.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

                        return (
                            <div key={msg.id} className={`chat-message-group ${isMine ? "mine" : "other"}`}>
                                {isFirstOfGroup && (
                                    <p className={`chat-sender-label ${isMine ? "mine" : "other"}`}>{senderName}</p>
                                )}
                                <div className={`chat-bubble-row ${isMine ? "user" : "assistant"}`}>
                                    {!isMine && (
                                        isLastOfGroup ? (
                                            <div className="chat-avatar chat-avatar-other">
                                                {destinatarioFotoUrl ? (
                                                    <img 
                                                        src={destinatarioFotoUrl} 
                                                        alt={initials} 
                                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                                                    />
                                                ) : (
                                                    initials
                                                )}
                                            </div>
                                        ) : (
                                            <div className="chat-avatar-placeholder" />
                                        )
                                    )}
                                    <div
                                        className={`chat-bubble ${isMine ? "user" : "assistant"}`}
                                        style={msg.tipo === "imagen" ? { padding: 4, background: "transparent", border: "none" } : msg.tipo === "documento" ? { padding: 0, overflow: "hidden", border: "none", background: "transparent" } : {}}
                                    >
                                        {msg.tipo === "imagen" ? (
                                            <img
                                                src={msg.contenido}
                                                alt="Imagen enviada"
                                                className="chat-image-preview"
                                                onClick={() => setLightboxImage(msg.contenido)}
                                            />
                                        ) : msg.tipo === "documento" ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isMine ? "#2f5cf5" : "#f3f4f6", border: isMine ? "none" : "1px solid #e5e7eb", borderRadius: 16, minWidth: 220 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: isMine ? "rgba(255,255,255,0.2)" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isMine ? "white" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                        <polyline points="14 2 14 8 20 8"/>
                                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                                    </svg>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isMine ? "white" : "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {getFilenameFromUrl(msg.contenido)}
                                                    </p>
                                                    <a 
                                                        href={msg.contenido} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        style={{ display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 700, color: isMine ? "#93c5fd" : "#2f5cf5", textDecoration: "none" }}
                                                    >
                                                        Ver / Descargar PDF
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="chat-bubble-line">{msg.contenido}</p>
                                        )}
                                        <span
                                            style={{
                                                display: "block",
                                                textAlign: "right",
                                                fontSize: 10,
                                                marginTop: 4,
                                                opacity: 0.7,
                                                color: isMine ? (msg.tipo === "imagen" ? "#6b7280" : "white") : "#6b7280",
                                            }}
                                        >
                                            {time}
                                        </span>
                                    </div>
                                    {isMine && (
                                        isLastOfGroup ? (
                                            <div className="chat-avatar chat-avatar-mine">
                                                {activeUser.foto_url ? (
                                                    <img 
                                                        src={activeUser.foto_url} 
                                                        alt={initials} 
                                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                                                    />
                                                ) : (
                                                    initials
                                                )}
                                            </div>
                                        ) : (
                                            <div className="chat-avatar-placeholder" />
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {otherTyping && (
                    <div className="chat-message-group other">
                        <div className="chat-bubble-row assistant">
                            <div className="chat-avatar chat-avatar-other">
                                {destinatarioFotoUrl ? (
                                    <img 
                                        src={destinatarioFotoUrl} 
                                        alt={getInitials(destinatarioName)} 
                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                                    />
                                ) : (
                                    getInitials(destinatarioName)
                                )}
                            </div>
                            <div className="chat-bubble assistant chat-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <button
                    className="chat-attachment-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploadingImage || fetchingMessages}
                    type="button"
                    title="Enviar foto"
                >
                    {uploadingImage ? (
                        <span className="chat-upload-spinner" style={{ margin: 0 }} />
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    )}
                </button>
                {role === "doctor" && (
                    <>
                        <input
                            type="file"
                            ref={pdfInputRef}
                            style={{ display: "none" }}
                            accept="application/pdf"
                            onChange={handlePdfUpload}
                        />
                        <button
                            className="chat-attachment-btn"
                            onClick={() => pdfInputRef.current?.click()}
                            disabled={sending || uploadingPdf || fetchingMessages}
                            type="button"
                            title="Enviar receta/certificado (PDF)"
                        >
                            {uploadingPdf ? (
                                <span className="chat-upload-spinner" style={{ margin: 0 }} />
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                            )}
                        </button>
                    </>
                )}
                <textarea
                    ref={textareaRef}
                    className="chat-input"
                    placeholder="Escribí un mensaje..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={fetchingMessages}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={sending || !input.trim() || fetchingMessages}
                    aria-label="Enviar"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>

            <Navbar role={role} />

            {role === "doctor" && fichaAbierta && destinatarioId && (
                <FichaPaciente
                    pacienteId={destinatarioId}
                    medicoId={activeUserId}
                    nombreMedico={formatDoctorName(activeUser.nombre_apellido, activeUser.licenseNumber)}
                    matriculaMedico={activeUser.licenseNumber ?? undefined}
                    nombrePaciente={destinatarioName}
                    onClose={() => setFichaAbierta(false)}
                />
            )}

            {showConfirmClose && (
                <div className="chat-confirm-overlay" onClick={() => setShowConfirmClose(false)}>
                    <div className="chat-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <h4 className="chat-confirm-title">¿Finalizar la conversación?</h4>
                        <p className="chat-confirm-text">
                            {role === "patient"
                                ? "Vas a salir del chat. El médico va a ver que finalizaste."
                                : "Vas a salir del chat. El paciente va a ver que finalizaste."}
                        </p>
                        <div className="chat-confirm-actions">
                            <button className="chat-confirm-cancel" onClick={() => setShowConfirmClose(false)}>
                                Cancelar
                            </button>
                            <button className="chat-confirm-delete" onClick={finalizarChat}>
                                Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lightboxImage && (
                <div className="chat-lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <div className="chat-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="chat-lightbox-close" onClick={() => setLightboxImage(null)}>
                            ✕
                        </button>
                        <img src={lightboxImage} alt="Fullscreen" className="chat-lightbox-img" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatRoomPage;
