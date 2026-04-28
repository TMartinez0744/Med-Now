const supabase = require('../config/supabase');

class ChatService {
    // 1. Obtener todas las conversaciones de un usuario (lista de contactos activos)
    async getConversaciones(userId) {
        // Obtenemos todos los mensajes donde el usuario es remitente o destinatario
        const { data: mensajes, error } = await supabase
            .from('mensajes')
            .select(`
                sender_id, 
                receiver_id, 
                contenido, 
                created_at,
                sender:profiles!mensajes_sender_id_fkey(id, nombre_apellido, tipo_usuario),
                receiver:profiles!mensajes_receiver_id_fkey(id, nombre_apellido, tipo_usuario)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Procesar para obtener una lista única de contactos con el último mensaje
        const conversacionesMap = new Map();

        mensajes.forEach((msg) => {
            const isSender = msg.sender_id === userId;
            const contactId = isSender ? msg.receiver_id : msg.sender_id;
            const contactProfile = isSender ? msg.receiver : msg.sender;

            if (!conversacionesMap.has(contactId)) {
                conversacionesMap.set(contactId, {
                    contactId,
                    profile: contactProfile,
                    lastMessage: msg.contenido,
                    updatedAt: msg.created_at
                });
            }
        });

        return Array.from(conversacionesMap.values());
    }

    // 2. Obtener historial de mensajes entre dos usuarios
    async getMensajes(userId1, userId2) {
        const { data, error } = await supabase
            .from('mensajes')
            .select('*')
            .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    // 3. Enviar un mensaje
    async sendMessage(sender_id, receiver_id, contenido) {
        const { data, error } = await supabase
            .from('mensajes')
            .insert({
                sender_id,
                receiver_id,
                contenido
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // 4. Buscar usuarios (para iniciar un nuevo chat)
    async searchUsers(query, currentUserType) {
        // Si el currentUserType es 'paciente', sugerir 'medico'. Si es 'medico', sugerir 'paciente'.
        // O buscar en todos. Haremos busqueda completa para mayor flexibilidad.
        let req = supabase
            .from('profiles')
            .select('id, nombre_apellido, tipo_usuario, dni');

        if (query) {
            req = req.ilike('nombre_apellido', `%${query}%`);
        }

        const { data, error } = await req.limit(20);
        
        if (error) throw error;
        return data;
    }
}

module.exports = new ChatService();
