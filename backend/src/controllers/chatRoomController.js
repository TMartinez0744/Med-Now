const prisma = require('../config/prisma');

class ChatRoomController {

    // POST /api/chats/room
    // Crea o recupera una sala de chat. Solo si hay un turno agendado no cancelado.
    async createRoom(req, res) {
        const { paciente_id, medico_id } = req.body;
        const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;

        if (!paciente_id || !medico_id) {
            return res.status(400).json({ success: false, message: 'paciente_id y medico_id son obligatorios' });
        }

        // Seguridad: El usuario solicitante debe ser el paciente o el médico
        if (tokenUserId !== paciente_id && tokenUserId !== medico_id) {
            return res.status(403).json({ success: false, message: 'Acceso denegado: No puedes abrir salas para terceros.' });
        }

        try {
            // REGLA DE NEGOCIO: Validar que exista al menos un turno agendado (no cancelado)
            const turnosCount = await prisma.turnos.count({
                where: {
                    paciente_id,
                    medico_id,
                    estado: {
                        not: 'cancelado'
                    }
                }
            });

            if (turnosCount === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Acceso denegado: Solo puedes chatear si tienes un turno agendado vigente o previo.' 
                });
            }

            // Buscar si ya existe una sala "turno" entre estos dos
            let room = await prisma.chat_rooms.findFirst({
                where: {
                    paciente_id,
                    medico_id,
                    tipo: 'turno',
                },
                orderBy: { created_at: 'desc' },
            });

            // Si no existe, la creamos
            if (!room) {
                room = await prisma.chat_rooms.create({
                    data: {
                        paciente_id,
                        medico_id,
                        tipo: 'turno',
                    },
                });
            }

            return res.status(201).json({ success: true, data: room });
        } catch (error) {
            console.error('Error en ChatRoomController.createRoom:', error);
            return res.status(500).json({ success: false, message: 'Error interno al gestionar la sala de chat.' });
        }
    }

    // GET /api/chats/rooms
    // Obtiene todas las salas de chat activas del usuario de la sesión, incluyendo nombres del destinatario.
    async getRooms(req, res) {
        const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;

        try {
            // Buscar salas de chat donde participe el usuario
            const rooms = await prisma.chat_rooms.findMany({
                where: {
                    OR: [
                        { paciente_id: tokenUserId },
                        { medico_id: tokenUserId }
                    ]
                },
                orderBy: {
                    updated_at: 'desc'
                }
            });

            if (rooms.length === 0) {
                return res.json({ success: true, data: [] });
            }

            // Para enriquecer el resultado con la información del perfil del destinatario
            const enrichedRooms = await Promise.all(rooms.map(async (room) => {
                const targetId = tokenUserRole === 'paciente' ? room.medico_id : room.paciente_id;

                // Buscar perfil del destinatario
                const profile = await prisma.profiles.findUnique({
                    where: { id: targetId },
                    select: {
                        nombre_apellido: true,
                        dni: true,
                        tipo_usuario: true
                    }
                });

                // Resumen de la derivación si aplica
                let resumen = null;
                if (room.derivacion_id) {
                    const d = await prisma.derivaciones_pendientes.findUnique({
                        where: { id: room.derivacion_id },
                        select: { resumen: true },
                    });
                    resumen = d?.resumen ?? null;
                }

                return {
                    ...room,
                    destinatario: profile ? {
                        id: targetId,
                        nombre_apellido: profile.nombre_apellido,
                        dni: profile.dni,
                        tipo_usuario: profile.tipo_usuario
                    } : null,
                    resumen_derivacion: resumen,
                };
            }));

            return res.json({ success: true, data: enrichedRooms });
        } catch (error) {
            console.error('Error en ChatRoomController.getRooms:', error);
            return res.status(500).json({ success: false, message: 'Error interno al obtener las salas de chat.' });
        }
    }

    // GET /api/chats/:roomId/mensajes
    // Obtiene el historial de mensajes de una sala de chat
    async getMessages(req, res) {
        const { roomId } = req.params;
        const { id: tokenUserId } = req.user;

        try {
            // 1. Verificar existencia de la sala y participación del usuario
            const room = await prisma.chat_rooms.findUnique({
                where: { id: roomId }
            });

            if (!room) {
                return res.status(404).json({ success: false, message: 'Sala de chat no encontrada' });
            }

            if (room.paciente_id !== tokenUserId && room.medico_id !== tokenUserId) {
                return res.status(403).json({ success: false, message: 'Acceso denegado: No perteneces a esta sala de chat.' });
            }

            // 2. Marcar como leídos los mensajes dirigidos al usuario actual
            await prisma.mensajes.updateMany({
                where: {
                    room_id: roomId,
                    sender_id: { not: tokenUserId },
                    leido: false,
                },
                data: { leido: true },
            });

            // 3. Obtener mensajes ordenados por fecha
            const messages = await prisma.mensajes.findMany({
                where: { room_id: roomId },
                orderBy: { created_at: 'asc' }
            });

            return res.json({ success: true, data: messages });
        } catch (error) {
            console.error('Error en ChatRoomController.getMessages:', error);
            return res.status(500).json({ success: false, message: 'Error interno al obtener los mensajes.' });
        }
    }

    // GET /api/chats/unread-count
    // Devuelve la cantidad total de mensajes sin leer dirigidos al usuario actual
    async getUnreadCount(req, res) {
        const { id: userId } = req.user;
        try {
            const count = await prisma.mensajes.count({
                where: {
                    leido: false,
                    sender_id: { not: userId },
                    chat_rooms: {
                        OR: [
                            { paciente_id: userId },
                            { medico_id: userId },
                        ],
                    },
                },
            });
            return res.json({ success: true, data: { count } });
        } catch (error) {
            console.error('Error en ChatRoomController.getUnreadCount:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener mensajes sin leer.' });
        }
    }

    // GET /api/chats/unread-by-counterparty
    // Devuelve un map { counterpartyId: count } con los no leídos por la otra persona del chat
    async getUnreadByCounterparty(req, res) {
        const { id: userId, tipo_usuario } = req.user;
        try {
            const rooms = await prisma.chat_rooms.findMany({
                where: {
                    OR: [
                        { paciente_id: userId },
                        { medico_id: userId },
                    ],
                },
                select: { id: true, paciente_id: true, medico_id: true },
            });

            if (rooms.length === 0) {
                return res.json({ success: true, data: {} });
            }

            const counts = await Promise.all(rooms.map(async (room) => {
                const counterpartyId = tipo_usuario === 'paciente' ? room.medico_id : room.paciente_id;
                const count = await prisma.mensajes.count({
                    where: {
                        room_id: room.id,
                        sender_id: { not: userId },
                        leido: false,
                    },
                });
                return { counterpartyId, count };
            }));

            const map = {};
            for (const { counterpartyId, count } of counts) {
                if (count > 0) map[counterpartyId] = count;
            }
            return res.json({ success: true, data: map });
        } catch (error) {
            console.error('Error en ChatRoomController.getUnreadByCounterparty:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener mensajes sin leer.' });
        }
    }

    // POST /api/chats/:roomId/mensajes
    // Envía un mensaje a la sala de chat
    async sendMessage(req, res) {
        const { roomId } = req.params;
        const { contenido, tipo } = req.body;
        const { id: tokenUserId } = req.user;

        if (!contenido || !contenido.trim()) {
            return res.status(400).json({ success: false, message: 'El contenido del mensaje no puede estar vacío.' });
        }

        const tipoValido = ['texto', 'sistema', 'contexto'].includes(tipo) ? tipo : 'texto';

        try {
            // 1. Verificar existencia de la sala y participación del usuario
            const room = await prisma.chat_rooms.findUnique({
                where: { id: roomId }
            });

            if (!room) {
                return res.status(404).json({ success: false, message: 'Sala de chat no encontrada' });
            }

            if (room.paciente_id !== tokenUserId && room.medico_id !== tokenUserId) {
                return res.status(403).json({ success: false, message: 'Acceso denegado: No perteneces a esta sala de chat.' });
            }

            // 2. Crear mensaje
            const message = await prisma.mensajes.create({
                data: {
                    room_id: roomId,
                    sender_id: tokenUserId,
                    contenido: contenido.trim(),
                    tipo: tipoValido,
                    leido: false
                }
            });

            // 3. Actualizar updated_at en chat_rooms
            await prisma.chat_rooms.update({
                where: { id: roomId },
                data: { updated_at: new Date() }
            });

            return res.status(201).json({ success: true, data: message });
        } catch (error) {
            console.error('Error en ChatRoomController.sendMessage:', error);
            return res.status(500).json({ success: false, message: 'Error interno al enviar el mensaje.' });
        }
    }
}

module.exports = new ChatRoomController();
