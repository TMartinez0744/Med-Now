const medicosService = require('../services/medicosService');

class MedicosController {
    async getAll(req, res) {
        try {
            const medicos = await medicosService.getAllMedicos();
            res.json({ success: true, count: medicos.length, data: medicos });
        } catch (error) {
            console.error("Error en MedicosController.getAll:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const medico = await medicosService.getMedicoById(id);
            if (!medico) {
                return res.status(404).json({ success: false, message: "Médico no encontrado" });
            }
            res.json({ success: true, data: medico });
        } catch (error) {
            console.error("Error en MedicosController.getById:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }
}

module.exports = new MedicosController();
