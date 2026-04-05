const pacientesService = require('../services/pacientesService');

class PacientesController {
    async getAll(req, res) {
        try {
            const pacientes = await pacientesService.getAllPacientes();
            res.json({ success: true, count: pacientes.length, data: pacientes });
        } catch (error) {
            console.error("Error en PacientesController.getAll:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const paciente = await pacientesService.getPacienteById(id);
            if (!paciente) {
                return res.status(404).json({ success: false, message: "Paciente no encontrado" });
            }
            res.json({ success: true, data: paciente });
        } catch (error) {
            console.error("Error en PacientesController.getById:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }
}

module.exports = new PacientesController();
