import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FichaHistorialModal from "./FichaHistorialModal";

interface Props {
    pacienteId: string;
    medicoId: string;
    nombreMedico: string;
    matriculaMedico?: string;
    nombrePaciente?: string;
    onClose: () => void;
}

interface FichaData {
    nombre_apellido: string;
    dni: string;
    obra_social: string | null;
    numero_afiliado: string | null;
    condiciones: { id: number; label: string }[];
    alergias: { id: number; label: string }[];
    genero: string | null;
    fecha_nacimiento: string | null;
    email: string | null;
}

interface TurnoFicha {
    id: string;
    fecha_hora: string;
    estado: string;
}

function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

function FichaPaciente({ pacienteId, medicoId, nombreMedico, matriculaMedico, nombrePaciente, onClose }: Props) {
    const [ficha, setFicha] = useState<FichaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [showHistorialModal, setShowHistorialModal] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [fichaRes, perfilRes] = await Promise.all([
                    apiFetch(`/api/pacientes/${pacienteId}/ficha`),
                    apiFetch(`/api/pacientes/${pacienteId}/perfil`),
                ]);
                const { data } = await fichaRes.json();
                const { data: perfil } = await perfilRes.json();
                const fm = data?.ficha_medica as any;
                setFicha({
                    nombre_apellido: data?.nombre_apellido ?? nombrePaciente ?? "Paciente",
                    dni: data?.dni ?? "-",
                    obra_social: data?.obra_social ?? null,
                    numero_afiliado: perfil?.numero_afiliado ?? null,
                    condiciones: fm?.condiciones ?? [],
                    alergias: fm?.alergias ?? [],
                    genero: perfil?.genero ?? null,
                    fecha_nacimiento: perfil?.fecha_nacimiento ?? null,
                    email: perfil?.email ?? null,
                });
            } catch {
                setFicha({ nombre_apellido: nombrePaciente ?? "Paciente", dni: "-", obra_social: null, numero_afiliado: null, condiciones: [], alergias: [], genero: null, fecha_nacimiento: null, email: null });
            }
            setLoading(false);
        };
        fetch();
    }, [pacienteId]);

    const exportarPDF = async () => {
        if (!ficha) return;
        setExportando(true);
        try {
            const res = await apiFetch(`/api/pacientes/${pacienteId}/turnos/con-medico/${medicoId}`);
            const { data: turnos } = await res.json();

            const formatFecha = (iso: string) => {
                const d = new Date(iso);
                return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
                    + " — " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) + " hs";
            };

            const estadoBadge = (estado: string) => {
                const colores: Record<string, string> = {
                    pendiente: "#d1fae5",
                    cancelado: "#fee2e2",
                    completado: "#e0e7ff",
                };
                return `<span style="background:${colores[estado] ?? "#f3f4f6"};padding:2px 10px;border-radius:999px;font-size:12px;">${estado}</span>`;
            };

            const turnosHtml = (turnos ?? []).length === 0
                ? `<p style="color:#9ca3af;font-size:14px;">Sin turnos registrados entre este paciente y el médico.</p>`
                : (turnos as TurnoFicha[]).map(t => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;">
                        <span style="font-size:14px;color:#374151;">${formatFecha(t.fecha_hora)}</span>
                        ${estadoBadge(t.estado)}
                    </div>`).join("");

            const condicionesHtml = ficha.condiciones.length === 0
                ? `<span style="color:#9ca3af;font-size:13px;">Sin condiciones registradas</span>`
                : ficha.condiciones.map(c => `<span style="background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:999px;font-size:13px;margin:3px;display:inline-block;">${c.label}</span>`).join("");

            const alergiasHtml = ficha.alergias.length === 0
                ? `<span style="color:#9ca3af;font-size:13px;">Sin alergias registradas</span>`
                : ficha.alergias.map(a => `<span style="background:#fef3c7;color:#b45309;padding:4px 12px;border-radius:999px;font-size:13px;margin:3px;display:inline-block;">${a.label}</span>`).join("");

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Ficha Médica — ${ficha.nombre_apellido}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 48px; color: #111827; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 22px; color: #1e3a8a; margin: 0 0 4px; }
  h2 { font-size: 16px; color: #374151; margin: 24px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  .meta { font-size: 13px; color: #6b7280; margin: 2px 0; }
  .header-box { background: #f0f4ff; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
  .print-btn { margin-top: 32px; padding: 10px 24px; background: #2f5cf5; color: white; border: none; border-radius: 10px; font-size: 15px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
    <div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">MedNow — Ficha Médica</div>
      <h1>${ficha.nombre_apellido}</h1>
    </div>
    <div style="text-align:right;font-size:12px;color:#9ca3af;">
      Generado el ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
    </div>
  </div>

  <div class="header-box">
    <p class="meta"><strong>DNI:</strong> ${ficha.dni}</p>
    ${ficha.genero ? `<p class="meta"><strong>Género:</strong> ${ficha.genero}</p>` : ""}
    ${ficha.fecha_nacimiento ? `<p class="meta"><strong>Fecha de nacimiento:</strong> ${new Date(ficha.fecha_nacimiento + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} (${calcularEdad(ficha.fecha_nacimiento)} años)</p>` : ""}
    ${ficha.email ? `<p class="meta"><strong>Email:</strong> ${ficha.email}</p>` : ""}
    ${ficha.obra_social ? `<p class="meta"><strong>Obra Social:</strong> ${ficha.obra_social}${ficha.numero_afiliado ? ` — N° afiliado: ${ficha.numero_afiliado}` : ""}</p>` : ""}
    <p class="meta"><strong>Médico tratante:</strong> ${nombreMedico}${matriculaMedico ? ` — Mat. ${matriculaMedico}` : ""}</p>
  </div>

  <h2>Condiciones médicas</h2>
  <div style="margin-bottom:20px;">${condicionesHtml}</div>

  <h2>Alergias</h2>
  <div style="margin-bottom:20px;">${alergiasHtml}</div>

  <h2>Historial de turnos con ${nombreMedico}</h2>
  <div>${turnosHtml}</div>

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;display:flex;justify-content:space-between;">
    <span>MedNow — Sistema de gestión médica</span>
    <span>${nombreMedico}${matriculaMedico ? ` · Mat. ${matriculaMedico}` : ""}</span>
  </div>

  <button class="print-btn" onclick="window.print()">Guardar como PDF / Imprimir</button>
</body>
</html>`;

            const ventana = window.open("", "_blank");
            if (ventana) {
                ventana.document.write(html);
                ventana.document.close();
            }
        } catch {
            alert("No se pudo generar el PDF. Intentá de nuevo.");
        } finally {
            setExportando(false);
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Ficha del paciente</h3>
                    <button onClick={onClose} style={closeBtnStyle}>✕</button>
                </div>

                {loading ? (
                    <p style={{ textAlign: "center", color: "#6b7280", padding: "24px 0" }}>Cargando...</p>
                ) : ficha && (
                    <>
                        <div style={{ background: "#f0f4ff", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16, color: "#111827" }}>
                                {ficha.nombre_apellido}
                            </p>
                            <p style={{ margin: "0 0 2px", fontSize: 13, color: "#6b7280" }}>DNI: {ficha.dni}</p>
                            {ficha.genero && (
                                <p style={{ margin: "0 0 2px", fontSize: 13, color: "#6b7280" }}>{ficha.genero}</p>
                            )}
                            {ficha.fecha_nacimiento && (
                                <p style={{ margin: "0 0 2px", fontSize: 13, color: "#6b7280" }}>
                                    {calcularEdad(ficha.fecha_nacimiento)} años
                                </p>
                            )}
                            {ficha.obra_social && (
                                <p style={{ margin: "0 0 2px", fontSize: 13, color: "#6b7280" }}>
                                    🛡 {ficha.obra_social}{ficha.numero_afiliado ? ` · N° ${ficha.numero_afiliado}` : ""}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Condiciones</span>
                            </div>
                            {ficha.condiciones.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin condiciones registradas</p>
                            ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {ficha.condiciones.map((c) => (
                                        <span key={c.id} style={chipStyle("#fee2e2", "#b91c1c")}>{c.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#374151" }}>Alergias</span>
                            </div>
                            {ficha.alergias.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin alergias registradas</p>
                            ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {ficha.alergias.map((a) => (
                                        <span key={a.id} style={chipStyle("#fef3c7", "#b45309")}>{a.label}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={exportarPDF}
                                disabled={exportando}
                                style={{
                                    flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #2f5cf5",
                                    background: "white", color: "#2f5cf5", fontWeight: 700, fontSize: 14,
                                    cursor: exportando ? "not-allowed" : "pointer", opacity: exportando ? 0.6 : 1,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                {exportando ? "Generando..." : "Exportar PDF"}
                            </button>
                            
                            <button
                                onClick={() => setShowHistorialModal(true)}
                                style={{
                                    flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #10b981",
                                    background: "white", color: "#10b981", fontWeight: 700, fontSize: 14,
                                    cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Ver Historial
                            </button>
                        </div>
                    </>
                )}
            </div>
            {showHistorialModal && (
                <FichaHistorialModal
                    pacienteId={pacienteId}
                    onClose={() => setShowHistorialModal(false)}
                    currentUserId={medicoId}
                />
            )}
        </div>
    );
}

const chipStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: 999, fontSize: 13,
    background: bg, color, fontWeight: 500,
});

const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 200, padding: 20,
};

const modalStyle: React.CSSProperties = {
    background: "white", width: "100%", maxWidth: 480,
    borderRadius: 24, padding: "24px 20px 32px",
    maxHeight: "85vh", overflowY: "auto",
};

const closeBtnStyle: React.CSSProperties = {
    background: "none", border: "none", fontSize: 18,
    cursor: "pointer", color: "#6b7280",
};

export default FichaPaciente;
