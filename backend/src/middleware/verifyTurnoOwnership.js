const supabase = require('../config/supabase');

const verifyTurnoOwnership = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;
    const { id: turnoId } = req.params;

    try {
        const { data: turno, error } = await supabase
            .from('turnos')
            .select('paciente_id, medico_id')
            .eq('id', turnoId)
            .maybeSingle();

        if (error || !turno) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        // Permitir cancelación si el usuario en el token es el paciente del turno o el médico del turno
        if (tokenUserId === turno.paciente_id || tokenUserId === turno.medico_id) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Acceso denegado: No tienes permisos para cancelar este turno.'
        });
    } catch (err) {
        console.error('Error in verifyTurnoOwnership middleware:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    verifyTurnoOwnership
};
