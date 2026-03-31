const prisma = require('../config/prisma');

class PacientesService {
    async getAllPacientes() {
        return await prisma.pacientes.findMany({
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

    async getPacienteById(id) {
        return await prisma.pacientes.findUnique({
            where: { id },
            include: {
                profile: true,
                turnos: true
            }
        });
    }
}

module.exports = new PacientesService();
