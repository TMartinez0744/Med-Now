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

    // PATCH /api/turnos/:id/cancelar
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const turno = await turnosService.cancel(parseInt(id));
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
