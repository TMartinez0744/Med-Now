const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const disponibilidadController = require('../controllers/disponibilidadController');
const turnosController = require('../controllers/turnosController');
const chatController = require('../controllers/chatController');
const notificacionesController = require('../controllers/notificacionesController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Rutas REST clásicas de ejemplo para interactuar con Supabase en lugar de MongoDB

// GET /api/medicos
// Obtiene todos los médicos cruzado con su información de perfil.
router.get('/medicos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('medicos')
            .select(`
                id,
                especialidades,
                sedes,
                recibir_turnos,
                profiles (nombre_apellido, dni)
            `);
        
        if (error) throw error;
        
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error("Error obteniendo médicos:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/medicos/:id
// Actualiza especialidades y sedes de un médico
router.put('/medicos/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { especialidades, sedes } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('medicos')
            .upsert({ id, especialidades, sedes, recibir_turnos: true })
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ success: true, data });
    } catch (err) {
        console.error("Error actualizando médico:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/pacientes/:id
// Obtiene un paciente por su UUID
router.get('/pacientes/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .select('*, profiles(nombre_apellido, dni)')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });

        res.json({ success: true, data });
    } catch (err) {
        console.error("Error obteniendo paciente:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/pacientes/:id
// Actualiza la ficha médica u obra social
router.put('/pacientes/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { obra_social, ficha_medica } = req.body;
    
    try {
        const payload = {};
        if (obra_social !== undefined) payload.obra_social = obra_social;
        if (ficha_medica !== undefined) payload.ficha_medica = ficha_medica;

        const { data, error } = await supabase
            .from('pacientes')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error("Error actualizando paciente:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/pacientes
// Obtiene todos los pacientes registrados cruzado con su perfil
router.get('/pacientes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .select(`
                id,
                obra_social,
                ficha_medica,
                profiles (nombre_apellido, dni)
            `);
        
        if (error) throw error;
        
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error("Error obteniendo pacientes:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/centros_emergencia
// Obtiene la lista de centros médicos/guardias guardados en la base de datos
router.get('/centros_emergencia', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('centros_emergencia')
            .select('*');
        
        if (error) throw error;
        
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error("Error obteniendo centros de emergencia:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Disponibilidad de médicos ───────────────────────────────────────────────

router.get('/medicos/:id/disponibilidad',    verifyToken, disponibilidadController.getByMedico.bind(disponibilidadController));
router.post('/medicos/:id/disponibilidad',   verifyToken, disponibilidadController.create.bind(disponibilidadController));
router.delete('/medicos/:id/disponibilidad', verifyToken, disponibilidadController.deleteAllByMedico.bind(disponibilidadController));
router.delete('/disponibilidad/:id',         verifyToken, disponibilidadController.delete.bind(disponibilidadController));

// ─── Turnos (reservas) ───────────────────────────────────────────────────────

router.post('/turnos',                     verifyToken, turnosController.create.bind(turnosController));
router.get('/pacientes/:id/turnos',        verifyToken, turnosController.getByPaciente.bind(turnosController));
router.get('/medicos/:id/turnos',          verifyToken, turnosController.getByMedico.bind(turnosController));
router.get('/pacientes/:id/turnos/historial', verifyToken, turnosController.getHistorialByPaciente.bind(turnosController));
router.get('/medicos/:id/turnos/historial',   verifyToken, turnosController.getHistorialByMedico.bind(turnosController));
router.patch('/turnos/:id/cancelar',       verifyToken, turnosController.cancel.bind(turnosController));

// ─── Chat / Mensajería ───────────────────────────────────────────────────────

router.get('/chat/conversaciones/:userId', verifyToken, chatController.getConversaciones.bind(chatController));
router.get('/chat/mensajes/:userId1/:userId2', verifyToken, chatController.getMensajes.bind(chatController));
router.post('/chat/mensajes',              verifyToken, chatController.sendMessage.bind(chatController));
router.get('/chat/usuarios/buscar',        verifyToken, chatController.searchUsers.bind(chatController));
// ==========================================
// NOTIFICACIONES (Protegidas)
// ==========================================
router.get('/notificaciones', verifyToken, notificacionesController.getByUser);
router.patch('/notificaciones/:id/leido', verifyToken, notificacionesController.marcarLeido);

module.exports = router;
