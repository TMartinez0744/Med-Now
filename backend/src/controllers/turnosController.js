const turnosService = require('../services/turnosService');
const emailService = require('../services/emailService');
const supabase = require('../config/supabase');

class TurnosController {

    // POST /api/turnos
    async create(req, res) {
        try {
            const { paciente_id, medico_id, fecha_hora, notas_triage } = req.body;

            if (!paciente_id || !medico_id || !fecha_hora) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos: paciente_id, medico_id, fecha_hora'
                });
            }

            const turno = await turnosService.create({ paciente_id, medico_id, fecha_hora, notas_triage });

            // BACKGROUND TASK: Send notifications and emails
            (async () => {
                try {
                    // Get patient and doctor data
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, nombre_apellido, email')
                        .in('id', [paciente_id, medico_id]);

                    if (profiles) {
                        const paciente = profiles.find(p => p.id === paciente_id);
                        const medico = profiles.find(p => p.id === medico_id);

                        if (paciente && medico) {
                            // In-App Notification to Doctor
                            const dateStr = new Date(fecha_hora).toLocaleString('es-AR');
                            await supabase.from('notificaciones').insert([{
                                user_id: medico_id,
                                mensaje: `Nuevo turno reservado por el paciente ${paciente.nombre_apellido} para el día ${dateStr}.`
                            }]);

                            // Email Notification
                            await emailService.notifyNewAppointment(
                                paciente.email,
                                medico.email,
                                paciente.nombre_apellido,
                                medico.nombre_apellido,
                                fecha_hora
                            );
                        }
                    }
                } catch (err) {
                    console.error("Error sending notifications background task:", err);
                }
            })();

            res.status(201).json({ success: true, data: turno });
        } catch (error) {
            if (error.code === 'TURNO_DUPLICADO') {
                return res.status(409).json({ success: false, message: error.message });
            }
            console.error('Error en TurnosController.create:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/pacientes/:id/turnos
    async getByPaciente(req, res) {
        try {
            const { id } = req.params;
            const turnos = await turnosService.getByPaciente(id);
            res.json({ success: true, count: turnos.length, data: turnos });
        } catch (error) {
            console.error('Error en TurnosController.getByPaciente:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/medicos/:id/turnos
    async getByMedico(req, res) {
        try {
            const { id } = req.params;
            const turnos = await turnosService.getByMedico(id);
            res.json({ success: true, count: turnos.length, data: turnos });
        } catch (error) {
            console.error('Error en TurnosController.getByMedico:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/pacientes/:id/turnos/historial
    async getHistorialByPaciente(req, res) {
        try {
            const { id } = req.params;
            const turnos = await turnosService.getHistorialByPaciente(id);
            res.json({ success: true, count: turnos.length, data: turnos });
        } catch (error) {
            console.error('Error en TurnosController.getHistorialByPaciente:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/medicos/:id/turnos/historial
    async getHistorialByMedico(req, res) {
        try {
            const { id } = req.params;
            const turnos = await turnosService.getHistorialByMedico(id);
            res.json({ success: true, count: turnos.length, data: turnos });
        } catch (error) {
            console.error('Error en TurnosController.getHistorialByMedico:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // PATCH /api/turnos/:id/cancelar
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const turno = await turnosService.cancel(id);
            res.json({ success: true, data: turno });
        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: 'Turno no encontrado' });
            }
            console.error('Error en TurnosController.cancel:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }
}

module.exports = new TurnosController();
