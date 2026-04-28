require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

class EmailService {
    async sendEmail(to, subject, htmlContent) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('Falta configuración de correo, email no enviado a:', to);
            return false;
        }

        try {
            const info = await transporter.sendMail({
                from: `"MedNow App" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html: htmlContent
            });
            console.log('Email enviado: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Error enviando email:', error);
            return false;
        }
    }

    async notifyNewAppointment(patientEmail, doctorEmail, pacienteNombre, doctorNombre, fechaHora) {
        const dateStr = new Date(fechaHora).toLocaleString('es-AR');

        if (patientEmail) {
            await this.sendEmail(
                patientEmail,
                'Turno Confirmado en MedNow',
                `<h2>Turno Confirmado</h2><p>Hola ${pacienteNombre},</p><p>Tu turno con el Dr/a. ${doctorNombre} ha sido agendado exitosamente para el <b>${dateStr}</b>.</p><p>¡Gracias por usar MedNow!</p>`
            );
        }

        if (doctorEmail) {
            await this.sendEmail(
                doctorEmail,
                'Nuevo Turno Agendado - MedNow',
                `<h2>Nuevo Turno</h2><p>Dr/a. ${doctorNombre},</p><p>El paciente <b>${pacienteNombre}</b> ha agendado un nuevo turno para el <b>${dateStr}</b>.</p><p>Puedes ver los detalles en tu tablero de MedNow.</p>`
            );
        }
    }

    async sendReminder(patientEmail, doctorEmail, pacienteNombre, doctorNombre, fechaHora) {
        const dateStr = new Date(fechaHora).toLocaleString('es-AR');

        if (patientEmail) {
            await this.sendEmail(
                patientEmail,
                'Recordatorio de Turno Médico - MedNow',
                `<h2>Recordatorio</h2><p>Hola ${pacienteNombre},</p><p>Te recordamos que tienes un turno con el Dr/a. ${doctorNombre} agendado para mañana a las <b>${dateStr}</b>.</p><p>Si no puedes asistir, recuerda cancelarlo desde la aplicación.</p>`
            );
        }

        if (doctorEmail) {
            await this.sendEmail(
                doctorEmail,
                'Recordatorio de Turno - MedNow',
                `<h2>Recordatorio de Agenda</h2><p>Dr/a. ${doctorNombre},</p><p>Le recordamos que tiene un turno con el paciente <b>${pacienteNombre}</b> agendado para mañana a las <b>${dateStr}</b>.</p>`
            );
        }
    }
}

module.exports = new EmailService();
