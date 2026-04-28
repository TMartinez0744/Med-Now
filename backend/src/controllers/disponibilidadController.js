const disponibilidadService = require('../services/disponibilidadService');

class DisponibilidadController {

    // GET /api/medicos/:id/disponibilidad
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

    // POST /api/medicos/:id/disponibilidad
    // Body: { dia_semana: 1, hora_inicio: "09:00", hora_fin: "13:00" }
    async create(req, res) {
        try {
            const { id } = req.params;
            const { dia_semana, hora_inicio, hora_fin, sede } = req.body;

            if (dia_semana === undefined || !hora_inicio || !hora_fin || !sede) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos: dia_semana, hora_inicio, hora_fin, sede'
                });
            }

            if (dia_semana < 0 || dia_semana > 6) {
                return res.status(400).json({
                    success: false,
                    message: 'dia_semana debe ser entre 0 (Domingo) y 6 (Sábado)'
                });
            }

            const slot = await disponibilidadService.create(id, { dia_semana, hora_inicio, hora_fin, sede });
            res.status(201).json({ success: true, data: slot });
        } catch (error) {
            console.error('Error en DisponibilidadController.create:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // DELETE /api/disponibilidad/:id
    async delete(req, res) {
        try {
            const { id } = req.params;
            await disponibilidadService.delete(id);
            res.json({ success: true, message: 'Slot de disponibilidad eliminado' });
        } catch (error) {
            if (error.code === 'P2025') {
                return res.status(404).json({ success: false, message: 'Slot no encontrado' });
            }
            console.error('Error en DisponibilidadController.delete:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // DELETE /api/medicos/:id/disponibilidad  (borra todos los slots del médico)
    async deleteAllByMedico(req, res) {
        try {
            const { id } = req.params;
            const result = await disponibilidadService.deleteAllByMedico(id);
            res.json({ success: true, deleted: result.count });
        } catch (error) {
            console.error('Error en DisponibilidadController.deleteAllByMedico:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }
}

module.exports = new DisponibilidadController();
