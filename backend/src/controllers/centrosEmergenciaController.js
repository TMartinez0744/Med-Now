const centrosEmergenciaService = require('../services/centrosEmergenciaService');

class CentrosEmergenciaController {
    async getAll(req, res) {
        try {
            const centros = await centrosEmergenciaService.getAllCentros();
            res.json({ success: true, count: centros.length, data: centros });
        } catch (error) {
            console.error("Error en CentrosEmergenciaController.getAll:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }
}

module.exports = new CentrosEmergenciaController();
