const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const disponibilidadController = require('../controllers/disponibilidadController');
const turnosController = require('../controllers/turnosController');

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
router.put('/medicos/:id', async (req, res) => {
    const { id } = req.params;
    const { especialidades, sedes } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('medicos')
            .update({ especialidades, sedes })
            .eq('id', id)
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
router.get('/pacientes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .select('*')
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
router.get('/centros_emergencia', async (req, res) => {
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

// GET    /api/medicos/:id/disponibilidad     → listar slots del médico
// POST   /api/medicos/:id/disponibilidad     → crear slot  { dia_semana, hora_inicio, hora_fin }
// DELETE /api/medicos/:id/disponibilidad     → eliminar todos los slots del médico
// DELETE /api/disponibilidad/:id             → eliminar un slot específico

router.get('/medicos/:id/disponibilidad',    disponibilidadController.getByMedico.bind(disponibilidadController));
router.post('/medicos/:id/disponibilidad',   disponibilidadController.create.bind(disponibilidadController));
router.delete('/medicos/:id/disponibilidad', disponibilidadController.deleteAllByMedico.bind(disponibilidadController));
router.delete('/disponibilidad/:id',         disponibilidadController.delete.bind(disponibilidadController));

// ─── Turnos (reservas) ───────────────────────────────────────────────────────

// POST  /api/turnos                     → crear turno { paciente_id, medico_id, fecha_hora }
// GET   /api/pacientes/:id/turnos       → turnos de un paciente
// GET   /api/medicos/:id/turnos         → turnos de un médico
// PATCH /api/turnos/:id/cancelar        → cancelar turno

router.post('/turnos',                     turnosController.create.bind(turnosController));
router.get('/pacientes/:id/turnos',        turnosController.getByPaciente.bind(turnosController));
router.get('/medicos/:id/turnos',          turnosController.getByMedico.bind(turnosController));
router.get('/pacientes/:id/turnos/historial', turnosController.getHistorialByPaciente.bind(turnosController));
router.get('/medicos/:id/turnos/historial',   turnosController.getHistorialByMedico.bind(turnosController));
router.patch('/turnos/:id/cancelar',       turnosController.cancel.bind(turnosController));

module.exports = router;
