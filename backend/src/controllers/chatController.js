const geminiService = require('../services/geminiService');

class ChatController {

    info(req, res) {
        res.json({
            success: true,
            data: {
                assistantName: geminiService.ASSISTANT_NAME,
            },
        });
    }

    async send(req, res) {
        try {
            const { messages } = req.body;

            if (!Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el campo "messages" (array no vacío de { role, content })',
                });
            }

            const invalid = messages.find(
                (m) => !m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)
            );
            if (invalid) {
                return res.status(400).json({
                    success: false,
                    message: 'Cada mensaje debe tener role ("user"|"assistant") y content (string)',
                });
            }

            if (messages[messages.length - 1].role !== 'user') {
                return res.status(400).json({
                    success: false,
                    message: 'El último mensaje debe ser del usuario',
                });
            }

            const reply = await geminiService.chatCompletion(messages);
            res.json({ success: true, data: { reply } });
        } catch (error) {
            if (error.code === 'MISSING_API_KEY') {
                console.error('Falta GEMINI_API_KEY en backend/.env');
                return res.status(500).json({
                    success: false,
                    message: 'El servicio de IA no está configurado. Falta GEMINI_API_KEY en el backend.',
                });
            }
            if (error.code === 'BLOCKED') {
                return res.status(400).json({
                    success: false,
                    message: 'Tu consulta no pudo ser procesada por los filtros de seguridad. Reformulala.',
                });
            }
            if (error.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: 'AlivIA está sobrecargado. Probá pedirle un médico humano con el botón "Solicitar médico" arriba.',
                });
            }
            console.error('Error en ChatController.send:', error);
            res.status(500).json({
                success: false,
                message: 'Error al consultar al asistente médico. Intentá de nuevo en unos segundos.',
            });
        }
    }
}

module.exports = new ChatController();
