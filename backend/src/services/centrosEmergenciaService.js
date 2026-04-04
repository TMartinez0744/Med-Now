const prisma = require('../config/prisma');

class CentrosEmergenciaService {
    async getAllCentros() {
        return await prisma.centros_emergencia.findMany();
    }
}

module.exports = new CentrosEmergenciaService();
