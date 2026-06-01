const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token requerido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Estandarizar req.user con id y tipo_usuario
        req.user = {
            id: decoded.id,
            tipo_usuario: decoded.tipo_usuario
        };
        next();
    } catch {
        return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
};

module.exports = { verifyToken };
