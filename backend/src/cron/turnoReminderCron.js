const supabase = require('../config/supabase');
const supabaseSedes = require('../config/supabaseSedes');
const { sendReminderEmail } = require('../services/emailService');

async function sendReminderCron() {
    console.log("⏰ [Cron] Ejecutando control periódico de recordatorios de turnos (24h antes)...");
    
    // Rango: entre 23 y 25 horas en el futuro
    const minTime = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const maxTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    try {
        const { data: turnos, error } = await supabase
            .from('turnos')
            .select(`
                id,
                fecha_hora,
                paciente_id,
                medico_id,
                pacientes (
                    profiles (nombre_apellido),
                    paciente_perfil (email)
                ),
                medicos (
                    email,
                    profiles (nombre_apellido)
                )
            `)
            .or('recordatorio_enviado.is.null,recordatorio_enviado.eq.false')
            .neq('estado', 'cancelado')
            .gte('fecha_hora', minTime)
            .lte('fecha_hora', maxTime);

        if (error) {
            console.error("❌ [Cron] Error al consultar turnos próximos:", error);
            return;
        }

        if (!turnos || turnos.length === 0) {
            console.log("⏰ [Cron] Sin turnos pendientes de recordatorio en la ventana de 24 hs.");
            return;
        }

        console.log(`⏰ [Cron] Se encontraron ${turnos.length} turnos para notificar.`);

        for (const t of turnos) {
            const patientName = t.pacientes?.profiles?.nombre_apellido || "Paciente";
            const patientEmail = t.pacientes?.paciente_perfil?.email;
            
            const doctorName = t.medicos?.profiles?.nombre_apellido || "Médico";
            const doctorEmail = t.medicos?.email;

            let patientSuccess = false;
            let doctorSuccess = false;

            // 1. Enviar email al Paciente
            if (patientEmail) {
                patientSuccess = await sendReminderEmail(
                    patientEmail,
                    patientName,
                    doctorName,
                    "paciente",
                    t.fecha_hora
                );
            } else {
                console.warn(`⚠️  [Cron] El paciente ${patientName} no tiene correo registrado.`);
            }

            // 2. Enviar email al Médico
            if (doctorEmail) {
                doctorSuccess = await sendReminderEmail(
                    doctorEmail,
                    doctorName,
                    patientName,
                    "medico",
                    t.fecha_hora
                );
            } else {
                console.warn(`⚠️  [Cron] El médico ${doctorName} no tiene correo registrado.`);
            }

            // 3. Marcar turno como recordatorio_enviado = true
            if (patientSuccess || doctorSuccess) {
                const { error: updateError } = await supabase
                    .from('turnos')
                    .update({ recordatorio_enviado: true })
                    .eq('id', t.id);

                if (updateError) {
                    console.error(`❌ [Cron] Error al actualizar estado de recordatorio en turno ID ${t.id}:`, updateError);
                } else {
                    console.log(`⏰ [Cron] Turno ID ${t.id} marcado como notificado con éxito.`);
                }
            }
        }
    } catch (err) {
        console.error("❌ [Cron] Error en ejecución del recordatorio:", err);
    }
}

module.exports = { sendReminderCron };
