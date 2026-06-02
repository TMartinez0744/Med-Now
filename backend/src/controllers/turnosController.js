const turnosService = require('../services/turnosService');

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
            res.status(201).json({ success: true, data: turno });

            // Enviar notificación de nuevo turno por email al médico en segundo plano
            (async () => {
                try {
                    const supabase = require('../config/supabase');
                    const { sendNewTurnoEmail } = require('../services/emailService');

                    const [{ data: patientProfile }, { data: doctorInfo }] = await Promise.all([
                        supabase.from('profiles').select('nombre_apellido').eq('id', paciente_id).single(),
                        supabase.from('medicos').select('email, profiles (nombre_apellido)').eq('id', medico_id).single()
                    ]);

                    const doctorEmail = doctorInfo?.email;
                    const doctorName = doctorInfo?.profiles?.nombre_apellido || "Médico";
                    const patientName = patientProfile?.nombre_apellido || "Paciente";

                    if (doctorEmail) {
                        await sendNewTurnoEmail(doctorEmail, doctorName, patientName, fecha_hora);
                    } else {
                        console.warn(`⚠️ [Notificación] El médico ${doctorName} no tiene correo registrado.`);
                    }
                } catch (err) {
                    console.error("❌ [Notificación] Error al enviar email de nuevo turno:", err);
                }
            })();
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

            // Enviar correos de cancelación asíncronamente en segundo plano
            (async () => {
                try {
                    const supabase = require('../config/supabase');
                    const { sendCancellationEmail } = require('../services/emailService');

                    const { data: t, error: fetchError } = await supabase
                        .from('turnos')
                        .select(`
                            fecha_hora,
                            pacientes (
                                profiles (nombre_apellido),
                                paciente_perfil (email)
                            ),
                            medicos (
                                email,
                                profiles (nombre_apellido)
                            )
                        `)
                        .eq('id', id)
                        .single();

                    if (fetchError || !t) {
                        console.error("❌ [Notificación] Error al obtener detalles para correos de cancelación:", fetchError);
                        return;
                    }

                    const patientName = t.pacientes?.profiles?.nombre_apellido || "Paciente";
                    const patientEmail = t.pacientes?.paciente_perfil?.email;
                    
                    const doctorName = t.medicos?.profiles?.nombre_apellido || "Médico";
                    const doctorEmail = t.medicos?.email;

                    const promises = [];
                    if (patientEmail) {
                        promises.push(sendCancellationEmail(patientEmail, patientName, doctorName, "paciente", t.fecha_hora));
                    } else {
                        console.warn(`⚠️  [Notificación] El paciente ${patientName} no tiene correo registrado.`);
                    }
                    if (doctorEmail) {
                        promises.push(sendCancellationEmail(doctorEmail, doctorName, patientName, "medico", t.fecha_hora));
                    } else {
                        console.warn(`⚠️  [Notificación] El médico ${doctorName} no tiene correo registrado.`);
                    }

                    await Promise.all(promises);
                } catch (err) {
                    console.error("❌ [Notificación] Error al enviar emails de cancelación:", err);
                }
            })();
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
