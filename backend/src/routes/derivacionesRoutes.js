const express = require('express');
const router = express.Router();
const derivacionesController = require('../controllers/derivacionesController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', derivacionesController.create);
router.get('/pendientes', derivacionesController.listPendientes);
router.get('/:id', derivacionesController.getById);
router.post('/:id/aceptar', derivacionesController.aceptar);
router.post('/:id/cancelar', derivacionesController.cancelar);

module.exports = router;
