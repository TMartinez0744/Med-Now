const supabase = require('../config/supabase');

class NotificacionesController {
    
    // GET /api/notificaciones
    async getByUser(req, res) {
        try {
            const userId = req.user.userId; // Viene del token JWT
            
            const { data, error } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            res.json({ success: true, count: data.length, data });
        } catch (error) {
            console.error('Error obteniendo notificaciones:', error);
            res.status(500).json({ success: false, message: 'Error interno' });
        }
    }

    // PATCH /api/notificaciones/:id/leido
    async marcarLeido(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('notificaciones')
                .update({ leido: true })
                .eq('id', id)
                .select();
                
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error actualizando notificacion:', error);
            res.status(500).json({ success: false, message: 'Error interno' });
        }
    }
}

module.exports = new NotificacionesController();
