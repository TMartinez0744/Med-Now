const prisma = require('../config/prisma');

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos sin médico → cancelada

async function expirarVencidas() {
    const limite = new Date(Date.now() - TIMEOUT_MS);
    try {
        await prisma.derivaciones_pendientes.updateMany({
            where: {
                estado: 'pendiente',
                created_at: { lt: limite },
            },
            data: {
                estado: 'cancelada',
                cancelada_at: new Date(),
            },
        });
    } catch (err) {
        console.error('Error expirando derivaciones:', err);
    }
}

class DerivacionesController {
    // POST /api/derivaciones
    // El paciente pide hablar con un médico humano
    async create(req, res) {
        const { id: userId, tipo_usuario } = req.user;
        if (tipo_usuario !== 'paciente') {
            return res.status(403).json({ success: false, message: 'Solo pacientes pueden crear derivaciones' });
        }

        const { contexto, resumen } = req.body;
        if (!contexto) {
            return res.status(400).json({ success: false, message: 'Falta contexto de la conversación' });
        }

        try {
            // Cancelar cualquier derivación pendiente anterior del mismo paciente
            await prisma.derivaciones_pendientes.updateMany({
                where: { paciente_id: userId, estado: 'pendiente' },
                data: { estado: 'cancelada', cancelada_at: new Date() },
            });

            const derivacion = await prisma.derivaciones_pendientes.create({
                data: {
                    paciente_id: userId,
                    contexto,
                    resumen: resumen ?? null,
                },
            });
            return res.status(201).json({ success: true, data: derivacion });
        } catch (err) {
            console.error('Error creando derivación:', err);
            return res.status(500).json({ success: false, message: 'Error al crear la derivación' });
        }
    }

    // GET /api/derivaciones/pendientes  (médicos)
    async listPendientes(req, res) {
        const { tipo_usuario } = req.user;
        if (tipo_usuario !== 'medico') {
            return res.status(403).json({ success: false, message: 'Solo médicos pueden ver pendientes' });
        }

        await expirarVencidas();

        try {
            const pendientes = await prisma.derivaciones_pendientes.findMany({
                where: { estado: 'pendiente' },
                orderBy: { created_at: 'asc' },
            });

            // Enriquecer con nombre del paciente
            const enriched = await Promise.all(pendientes.map(async (d) => {
                const profile = await prisma.profiles.findUnique({
                    where: { id: d.paciente_id },
                    select: { nombre_apellido: true },
                });
                return {
                    ...d,
                    paciente: { nombre_apellido: profile?.nombre_apellido ?? 'Paciente' },
                };
            }));

            return res.json({ success: true, data: enriched });
        } catch (err) {
            console.error('Error listando derivaciones pendientes:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener derivaciones' });
        }
    }

    // GET /api/derivaciones/:id  (el paciente dueño puede ver su derivación)
    async getById(req, res) {
        const { id } = req.params;
        const { id: userId, tipo_usuario } = req.user;

        await expirarVencidas();

        try {
            const derivacion = await prisma.derivaciones_pendientes.findUnique({
                where: { id },
            });
            if (!derivacion) {
                return res.status(404).json({ success: false, message: 'Derivación no encontrada' });
            }
            if (derivacion.paciente_id !== userId && derivacion.medico_id !== userId && tipo_usuario !== 'medico') {
                return res.status(403).json({ success: false, message: 'Acceso denegado' });
            }

            // Si está aceptada, traer info del médico
            let medicoInfo = null;
            if (derivacion.medico_id) {
                const profile = await prisma.profiles.findUnique({
                    where: { id: derivacion.medico_id },
                    select: { nombre_apellido: true },
                });
                medicoInfo = profile ? { nombre_apellido: profile.nombre_apellido, id: derivacion.medico_id } : null;
            }

            return res.json({ success: true, data: { ...derivacion, medico: medicoInfo } });
        } catch (err) {
            console.error('Error getById derivacion:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener la derivación' });
        }
    }

    // POST /api/derivaciones/:id/aceptar  (médicos)
    async aceptar(req, res) {
        const { id } = req.params;
        const { id: userId, tipo_usuario } = req.user;

        if (tipo_usuario !== 'medico') {
            return res.status(403).json({ success: false, message: 'Solo médicos pueden aceptar derivaciones' });
        }

        try {
            // 1. Race-safe: marcar aceptada solo si todavía está pendiente
            const upd = await prisma.derivaciones_pendientes.updateMany({
                where: { id, estado: 'pendiente' },
                data: {
                    estado: 'aceptada',
                    medico_id: userId,
                    aceptada_at: new Date(),
                },
            });
            if (upd.count === 0) {
                return res.status(409).json({ success: false, message: 'Otra persona ya tomó esta consulta' });
            }

            const derivacion = await prisma.derivaciones_pendientes.findUnique({ where: { id } });

            // 2. Find-or-create del room — si ya hay uno entre estos dos, lo reusamos
            let room = await prisma.chat_rooms.findFirst({
                where: { paciente_id: derivacion.paciente_id, medico_id: userId },
                orderBy: { created_at: 'desc' },
            });

            if (room) {
                room = await prisma.chat_rooms.update({
                    where: { id: room.id },
                    data: { tipo: 'urgencia', derivacion_id: id, updated_at: new Date() },
                });
            } else {
                room = await prisma.chat_rooms.create({
                    data: {
                        paciente_id: derivacion.paciente_id,
                        medico_id: userId,
                        tipo: 'urgencia',
                        derivacion_id: id,
                    },
                });
            }

            // 3. Linkear room a la derivación
            await prisma.derivaciones_pendientes.update({
                where: { id },
                data: { room_id: room.id },
            });

            // 4. Mensaje de contexto con info de la consulta IA (best-effort)
            try {
                const lineas = ['Contexto de la consulta'];
                if (derivacion.resumen) {
                    lineas.push('');
                    lineas.push(`Resumen: ${derivacion.resumen}`);
                }
                const ctx = derivacion.contexto;
                if (Array.isArray(ctx) && ctx.length > 0) {
                    const userMsgs = ctx.filter((m) => m && m.role === 'user');
                    if (userMsgs.length > 0) {
                        lineas.push('');
                        lineas.push('Lo que el paciente le contó a AlivIA:');
                        userMsgs.slice(-5).forEach((m, i) => {
                            const txt = String(m.content ?? '').trim();
                            if (txt) lineas.push(`${i + 1}. ${txt}`);
                        });
                    }
                }
                await prisma.mensajes.create({
                    data: {
                        room_id: room.id,
                        sender_id: userId,
                        contenido: lineas.join('\n'),
                        tipo: 'contexto',
                        leido: false,
                    },
                });
            } catch (ctxErr) {
                console.warn('No se pudo crear mensaje de contexto:', ctxErr.message);
            }

            // 5. Mensaje de sistema "se unió"
            try {
                await prisma.mensajes.create({
                    data: {
                        room_id: room.id,
                        sender_id: userId,
                        contenido: 'El médico se unió a la conversación.',
                        tipo: 'sistema',
                        leido: false,
                    },
                });
            } catch (msgErr) {
                console.warn('No se pudo crear mensaje de sistema:', msgErr.message);
            }

            return res.json({ success: true, data: { room_id: room.id, derivacion_id: id } });
        } catch (err) {
            console.error('Error aceptando derivación:', err);
            return res.status(500).json({ success: false, message: 'Error al aceptar la derivación' });
        }
    }

    // POST /api/derivaciones/:id/cancelar  (el paciente puede cancelar antes de que la tomen)
    async cancelar(req, res) {
        const { id } = req.params;
        const { id: userId } = req.user;
        try {
            const result = await prisma.derivaciones_pendientes.updateMany({
                where: { id, paciente_id: userId, estado: 'pendiente' },
                data: { estado: 'cancelada', cancelada_at: new Date() },
            });
            if (result.count === 0) {
                return res.status(409).json({ success: false, message: 'No se pudo cancelar (ya fue tomada o no es tuya)' });
            }
            return res.json({ success: true });
        } catch (err) {
            console.error('Error cancelando derivación:', err);
            return res.status(500).json({ success: false, message: 'Error al cancelar la derivación' });
        }
    }
}

module.exports = new DerivacionesController();
