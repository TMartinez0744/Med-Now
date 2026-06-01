const express = require('express');
const router = express.Router();
const chatRoomController = require('../controllers/chatRoomController');
const { verifyToken } = require('../middleware/authMiddleware');

// Proteger todas las rutas de chat con token JWT
router.use(verifyToken);

// Rutas de salas de chat y mensajes
router.post('/room', chatRoomController.createRoom);
router.get('/rooms', chatRoomController.getRooms);
router.get('/:roomId/mensajes', chatRoomController.getMessages);
router.post('/:roomId/mensajes', chatRoomController.sendMessage);

module.exports = router;
