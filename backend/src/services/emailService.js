const nodemailer = require('nodemailer');

// Cargar variables SMTP
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter = null;

if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true para 465, false para otros
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });
    console.log("📧 Servicio de Email: Transportador SMTP configurado correctamente.");
} else {
    console.log("📧 Servicio de Email: Sin credenciales SMTP en .env. Se usará el emulador en consola.");
}

// Función auxiliar para imprimir un email maquetado por consola
function logEmailToConsole(to, subject, text, html) {
    console.log("\n=================== 📧 NUEVO CORREO ELECTRÓNICO (EMULADOR) ===================");
    console.log(`Para:       ${to}`);
    console.log(`Asunto:     ${subject}`);
    console.log(`Mensaje:    ${text}`);
    console.log("---------------------------- HTML PREVIEW ----------------------------");
    console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()); // Limpia etiquetas html para mostrar en consola
    console.log("======================================================================\n");
}

/**
 * Envía un correo electrónico de notificación o recordatorio.
 */
async function sendEmail({ to, subject, text, html }) {
    if (!to) {
        console.warn("⚠️  Intento de envío de email sin dirección de destino.");
        return false;
    }

    try {
        if (transporter) {
            await transporter.sendMail({
                from: `"MedNow 🩺" <${smtpUser}>`,
                to,
                subject,
                text,
                html
            });
            console.log(`📧 Email enviado exitosamente a: ${to} (Vía SMTP)`);
            return true;
        } else {
            logEmailToConsole(to, subject, text, html);
            return true;
        }
    } catch (err) {
        console.error(`❌ Error al enviar email a ${to}:`, err);
        return false;
    }
}

/**
 * Notificación al médico sobre un nuevo turno reservado
 */
async function sendNewTurnoEmail(doctorEmail, doctorName, patientName, fechaHora) {
    const formattedDate = new Date(fechaHora).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    }) + " hs";

    const subject = "🩺 MedNow: Nuevo Turno Reservado";
    const text = `Hola Dr/a. ${doctorName},\n\nEl paciente ${patientName} ha reservado un nuevo turno para el día ${formattedDate} a las ${formattedTime}.\n\nSaludos,\nEl equipo de MedNow`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #2f5cf5; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">+</div>
                <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
            </div>
            <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola Dr/a. ${doctorName},</p>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Te informamos que un paciente ha reservado un nuevo turno en tu agenda:</p>
            <div style="background: #f0f4ff; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #2f5cf5;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Paciente:</strong> ${patientName}</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Fecha:</strong> ${formattedDate}</p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Hora:</strong> ${formattedTime}</p>
            </div>
            <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                MedNow — Sistema de Gestión Médica Profesional.
            </p>
        </div>
    `;

    return sendEmail({ to: doctorEmail, subject, text, html });
}

/**
 * Confirmación al paciente sobre un nuevo turno reservado
 */
async function sendNewTurnoPatientEmail(patientEmail, patientName, doctorName, fechaHora, sede) {
    const formattedDate = new Date(fechaHora).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    }) + " hs";

    const subject = "✅ MedNow: Turno reservado con éxito";
    const text = `Hola ${patientName},\n\nTu turno con el/la Dr/a. ${doctorName} quedó reservado para el día ${formattedDate} a las ${formattedTime}${sede ? `, en ${sede}` : ""}.\n\nSaludos,\nEl equipo de MedNow`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">✓</div>
                <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
            </div>
            <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola ${patientName},</p>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Tu turno fue reservado con éxito:</p>
            <div style="background: #ecfdf5; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #065f46;"><strong>Profesional:</strong> Dr/a. ${doctorName}</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #065f46;"><strong>Fecha:</strong> ${formattedDate}</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #065f46;"><strong>Hora:</strong> ${formattedTime}</p>
                ${sede ? `<p style="margin: 0; font-size: 14px; color: #065f46;"><strong>Sede:</strong> ${sede}</p>` : ""}
            </div>
            <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                Te vamos a enviar un recordatorio 24 horas antes. Si necesitás cancelar podés hacerlo desde el portal de MedNow.
            </p>
        </div>
    `;

    return sendEmail({ to: patientEmail, subject, text, html });
}

/**
 * Recordatorio de turno (para médico y paciente) 24h antes
 */
async function sendReminderEmail(email, name, partnerName, role, fechaHora) {
    const formattedDate = new Date(fechaHora).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    }) + " hs";

    const subject = "⏰ Recordatorio: Turno en 24 horas";
    
    let text = "";
    let html = "";

    if (role === "medico") {
        text = `Hola Dr/a. ${name},\n\nTe recordamos que tienes un turno agendado mañana con el paciente ${partnerName} a las ${formattedTime}.\n\nSaludos,\nEl equipo de MedNow`;
        html = `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #2f5cf5; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">+</div>
                    <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
                </div>
                <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola Dr/a. ${name},</p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Te recordamos que tenés una consulta médica agendada para mañana:</p>
                <div style="background: #f0f4ff; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #2f5cf5;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Paciente:</strong> ${partnerName}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Fecha:</strong> mañana, ${formattedDate}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Hora:</strong> ${formattedTime}</p>
                </div>
                <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                    Por favor, recordá conectarte o asistir a la sede correspondiente.
                </p>
            </div>
        `;
    } else {
        text = `Hola ${name},\n\nTe recordamos que tienes un turno médico reservado para mañana con el/la Dr/a. ${partnerName} a las ${formattedTime}.\n\nSaludos,\nEl equipo de MedNow`;
        html = `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #2f5cf5; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">+</div>
                    <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
                </div>
                <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola ${name},</p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Te recordamos que tenés un turno médico agendado para mañana:</p>
                <div style="background: #eef3ff; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Profesional:</strong> Dr/a. ${partnerName}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;"><strong>Fecha:</strong> mañana, ${formattedDate}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Hora:</strong> ${formattedTime}</p>
                </div>
                <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                    Si no podés asistir, por favor cancelalo con anticipación desde el portal de MedNow.
                </p>
            </div>
        `;
    }

    return sendEmail({ to: email, subject, text, html });
}

/**
 * Notificación de cancelación de turno (para médico y paciente)
 */
async function sendCancellationEmail(email, name, partnerName, role, fechaHora) {
    const formattedDate = new Date(fechaHora).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const formattedTime = new Date(fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
    }) + " hs";

    const subject = "❌ Cancelación de Turno - MedNow";
    
    let text = "";
    let html = "";

    if (role === "medico") {
        text = `Hola Dr/a. ${name},\n\nTe informamos que el turno agendado con el paciente ${partnerName} para el día ${formattedDate} a las ${formattedTime} ha sido CANCELADO.\n\nSaludos,\nEl equipo de MedNow`;
        html = `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #dc2626; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">✕</div>
                    <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
                </div>
                <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola Dr/a. ${name},</p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Te informamos que se ha cancelado el siguiente turno en tu agenda:</p>
                <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #991b1b;"><strong>Estado:</strong> CANCELADO</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;"><strong>Paciente:</strong> ${partnerName}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;"><strong>Fecha:</strong> ${formattedDate}</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Hora:</strong> ${formattedTime}</p>
                </div>
                <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                    El horario ha quedado libre en tu disponibilidad para ser reservado por otro paciente.
                </p>
            </div>
        `;
    } else {
        text = `Hola ${name},\n\nTe informamos que tu turno médico programado con el/la Dr/a. ${partnerName} para el día ${formattedDate} a las ${formattedTime} ha sido CANCELADO.\n\nSaludos,\nEl equipo de MedNow`;
        html = `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: #dc2626; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; font-weight: 700; line-height: 40px; text-align: center;">✕</div>
                    <h1 style="font-size: 20px; color: #1e3a8a; margin: 8px 0 0;">MedNow</h1>
                </div>
                <p style="font-size: 16px; font-weight: bold; color: #374151;">Hola ${name},</p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Te informamos que tu turno médico ha sido cancelado:</p>
                <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #991b1b;"><strong>Estado:</strong> CANCELADO</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;"><strong>Profesional:</strong> Dr/a. ${partnerName}</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563;"><strong>Fecha:</strong> ${formattedDate}</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Hora:</strong> ${formattedTime}</p>
                </div>
                <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center;">
                    Si necesitas reprogramar la consulta, podés buscar nuevos turnos disponibles desde el portal de MedNow.
                </p>
            </div>
        `;
    }

    return sendEmail({ to: email, subject, text, html });
}

module.exports = {
    sendNewTurnoEmail,
    sendNewTurnoPatientEmail,
    sendReminderEmail,
    sendCancellationEmail
};
