const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Buscar el token en los headers (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. No hay token proporcionado.' });
    }

    const token = authHeader.split(' ')[1]; // Separar 'Bearer' del token real
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Formato de token inválido.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'mednow_super_secret_key';
        const decoded = jwt.verify(token, secret);
        
        // Adjuntar los datos descubiertos al objeto req para las siguientes funciones
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'El token ha expirado. Por favor, inicia sesión nuevamente.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ success: false, message: 'Token inválido.' });
    }
};

module.exports = { verifyToken };
