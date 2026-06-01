const verifyOwnershipOrRole = (allowedRoles = [], idParamName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }

        const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;
        const targetId = req.params[idParamName];

        // 1. Si el usuario pertenece a uno de los roles exentos de propiedad (ej. médico accediendo a ficha de paciente)
        if (allowedRoles.includes(tokenUserRole)) {
            return next();
        }

        // 2. Si el usuario está operando sobre su propio recurso
        if (targetId && tokenUserId === targetId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Acceso denegado: No tienes permisos para realizar esta acción sobre este recurso.'
        });
    };
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        }

        const { tipo_usuario: tokenUserRole } = req.user;

        if (allowedRoles.includes(tokenUserRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Acceso denegado: Tu tipo de usuario no tiene permisos para realizar esta acción.'
        });
    };
};

module.exports = {
    verifyOwnershipOrRole,
    authorizeRoles
};
