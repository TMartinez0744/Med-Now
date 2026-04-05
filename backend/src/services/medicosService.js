const prisma = require('../config/prisma');

class MedicosService {
    async getAllMedicos() {
        return await prisma.medicos.findMany({
            include: {
                profile: {
                    select: {
                        nombre_apellido: true,
                        dni: true
                    }
                }
            }
        });
    }

    async getMedicoById(id) {
        return await prisma.medicos.findUnique({
            where: { id },
            include: {
                profile: true,
                turnos: true
            }
        });
    }
}

module.exports = new MedicosService();
