const disponibilidadService = require('../services/disponibilidadService');

class DisponibilidadController {

    async getByMedico(req, res) {
        try {
            const { id } = req.params;
            const slots = await disponibilidadService.getByMedico(id);
            res.json({ success: true, count: slots.length, data: slots });
        } catch (error) {
            console.error('Error en DisponibilidadController.getByMedico:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    async create(req, res) {
        try {
            const { id } = req.params;
            const { dia_semana, hora_inicio, hora_fin, sede, duracion_turno } = req.body;

            if (dia_semana === undefined || !hora_inicio || !hora_fin) {
                return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
            }

            const slot = await disponibilidadService.create(id, { dia_semana, hora_inicio, hora_fin, sede, duracion_turno });
            res.status(201).json({ success: true, data: slot });
        } catch (error) {
            if (error.code === 'OVERLAP_DISPONIBILIDAD') {
                return res.status(400).json({ success: false, message: error.message });
            }
            console.error('Error en DisponibilidadController.create:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await disponibilidadService.delete(id);
            res.json({ success: true });
        } catch (error) {
            console.error('Error en DisponibilidadController.delete:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    async deleteAllByMedico(req, res) {
        try {
            const { id } = req.params;
            const { sede } = req.query;
            const result = await disponibilidadService.deleteAllByMedico(id, sede || null);
            res.json({ success: true, deleted: result.count });
        } catch (error) {
            console.error('Error en DisponibilidadController.deleteAllByMedico:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }
}

module.exports = new DisponibilidadController();
