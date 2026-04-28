const cron = require('node-cron');
const supabase = require('./config/supabase');
const emailService = require('./services/emailService');

// Tarea ejecutada cada hora (por ejemplo: '0 * * * *')
// Busca turnos que ocurran exactamente mañana en la misma hora (entre 23h y 24h a futuro)
cron.schedule('0 * * * *', async () => {
    console.log('⏳ Ejecutando Cron Job de Recordatorios de Turnos...');

    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        // Ventana de 1 hora
        const fromDate = new Date(tomorrow);
        fromDate.setMinutes(0, 0, 0);
        
        const toDate = new Date(tomorrow);
        toDate.setHours(toDate.getHours() + 1);
        toDate.setMinutes(0, 0, 0);

        // Turnos agendados y confirmados en la ventana de mañana a esta misma hora
        const { data: turnos, error } = await supabase
            .from('turnos')
            .select(`
                id, fecha_hora, estado,
                pacientes:paciente_id (
                    profiles:id (nombre_apellido, email)
                ),
                medicos:medico_id (
                    profiles:id (nombre_apellido, email)
                )
            `)
            .gte('fecha_hora', fromDate.toISOString())
            .lt('fecha_hora', toDate.toISOString())
            .in('estado', ['agendado', 'confirmado']);

        if (error) {
            console.error('Error buscando turnos para recordatorio:', error);
            return;
        }

        if (turnos && turnos.length > 0) {
            console.log(`✉️ Enviando recordatorios para ${turnos.length} turno(s) de mañana.`);
            for (const turno of turnos) {
                const pacienteInfo = turno.pacientes?.profiles;
                const medicoInfo = turno.medicos?.profiles;

                if (pacienteInfo && medicoInfo) {
                    await emailService.sendReminder(
                        pacienteInfo.email,
                        medicoInfo.email,
                        pacienteInfo.nombre_apellido,
                        medicoInfo.nombre_apellido,
                        turno.fecha_hora
                    );
                }
            }
        }
    } catch (err) {
        console.error('Error fatal en cron job:', err);
    }
});

console.log('✅ Cron Jobs inicializados (Recordatorio de Turnos activo)');
