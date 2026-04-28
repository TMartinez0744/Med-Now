const chatService = require('../services/chatService');

class ChatController {
    // GET /api/chat/conversaciones/:userId
    async getConversaciones(req, res) {
        try {
            const { userId } = req.params;
            const conversaciones = await chatService.getConversaciones(userId);
            res.json({ success: true, data: conversaciones });
        } catch (error) {
            console.error('Error en ChatController.getConversaciones:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/chat/mensajes/:userId1/:userId2
    async getMensajes(req, res) {
        try {
            const { userId1, userId2 } = req.params;
            const mensajes = await chatService.getMensajes(userId1, userId2);
            res.json({ success: true, data: mensajes });
        } catch (error) {
            console.error('Error en ChatController.getMensajes:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // POST /api/chat/mensajes
    async sendMessage(req, res) {
        try {
            const { sender_id, receiver_id, contenido } = req.body;

            if (!sender_id || !receiver_id || !contenido) {
                return res.status(400).json({ success: false, message: 'Faltan campos (sender_id, receiver_id, contenido)' });
            }

            const message = await chatService.sendMessage(sender_id, receiver_id, contenido);
            res.status(201).json({ success: true, data: message });
        } catch (error) {
            console.error('Error en ChatController.sendMessage:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // GET /api/chat/usuarios/buscar?q=...
    async searchUsers(req, res) {
        try {
            const query = req.query.q || '';
            const type = req.query.type || '';
            const users = await chatService.searchUsers(query, type);
            res.json({ success: true, data: users });
        } catch (error) {
            console.error('Error en ChatController.searchUsers:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }
}

module.exports = new ChatController();
