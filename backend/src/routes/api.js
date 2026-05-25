const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const supabaseSedes = require('../config/supabaseSedes');
const disponibilidadController = require('../controllers/disponibilidadController');
const disponibilidadService = require('../services/disponibilidadService');
const turnosController = require('../controllers/turnosController');
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Rutas REST clásicas de ejemplo para interactuar con Supabase en lugar de MongoDB

// GET /api/medicos
// Obtiene todos los médicos cruzado con su información de perfil y obras sociales.
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

        const { data: obrasData } = await supabaseSedes
            .from('medico_obras_sociales')
            .select('medico_id, obras_sociales');

        const obrasMap = {};
        (obrasData ?? []).forEach(o => { obrasMap[o.medico_id] = o.obras_sociales ?? []; });

        const merged = data.map(m => ({ ...m, obras_sociales: obrasMap[m.id] ?? [] }));

        res.json({ success: true, count: merged.length, data: merged });
    } catch (err) {
        console.error("Error obteniendo médicos:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/medicos/:id/obras-sociales
router.get('/medicos/:id/obras-sociales', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabaseSedes
            .from('medico_obras_sociales')
            .select('obras_sociales')
            .eq('medico_id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json({ success: true, data: data?.obras_sociales ?? [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/medicos/:id/obras-sociales
router.put('/medicos/:id/obras-sociales', async (req, res) => {
    const { id } = req.params;
    const { obras_sociales } = req.body;
    try {
        const { data, error } = await supabaseSedes
            .from('medico_obras_sociales')
            .upsert({ medico_id: id, obras_sociales }, { onConflict: 'medico_id' })
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
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

// GET /api/medicos/:id/slots?sede=X&fecha=YYYY-MM-DD → slots disponibles reales
router.get('/medicos/:id/slots', async (req, res) => {
    const { id } = req.params;
    const { sede, fecha } = req.query;
    if (!sede || !fecha) return res.status(400).json({ success: false, message: 'sede y fecha son requeridos' });
    try {
        const diaSemana = new Date(`${fecha}T12:00:00`).getDay();
        const disponibilidad = await disponibilidadService.getByMedico(id);
        const intervalos = disponibilidad.filter(s => s.sede === sede && s.dia_semana === diaSemana);
        if (intervalos.length === 0) return res.json({ success: true, data: [] });

        const allSlots = [];
        for (const iv of intervalos) {
            const [sh, sm] = iv.hora_inicio.split(':').map(Number);
            const [eh, em] = iv.hora_fin.split(':').map(Number);
            let cur = sh * 60 + sm;
            const end = eh * 60 + em;
            while (cur + 30 <= end) {
                allSlots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
                cur += 30;
            }
        }

        const { data: booked, error } = await supabase
            .from('turnos')
            .select('fecha_hora')
            .eq('medico_id', id)
            .neq('estado', 'cancelado')
            .gte('fecha_hora', `${fecha}T00:00:00`)
            .lte('fecha_hora', `${fecha}T23:59:59`);
        if (error) throw error;

        const bookedTimes = new Set((booked ?? []).map(t => t.fecha_hora.slice(11, 16)));
        res.json({ success: true, data: allSlots.filter(s => !bookedTimes.has(s)) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

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

// GET /api/pacientes/:id/turnos/con-medico/:medicoId → historial entre paciente y médico
router.get('/pacientes/:id/turnos/con-medico/:medicoId', async (req, res) => {
    const { id, medicoId } = req.params;
    try {
        const { data, error } = await supabase
            .from('turnos')
            .select('id, fecha_hora, estado')
            .eq('paciente_id', id)
            .eq('medico_id', medicoId)
            .order('fecha_hora', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get('/medicos/:id/turnos/historial',   turnosController.getHistorialByMedico.bind(turnosController));
router.patch('/turnos/:id/cancelar',       turnosController.cancel.bind(turnosController));

router.get('/chat/info', chatController.info.bind(chatController));
router.post('/chat',     chatController.send.bind(chatController));

// ─── Paciente: perfil extendido (genero, fecha_nacimiento, email) ────────────

// GET /api/pacientes/:id/perfil
router.get('/pacientes/:id/perfil', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabaseSedes
            .from('paciente_perfil')
            .select('*')
            .eq('paciente_id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json({ success: true, data: data ?? null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/change-password
router.post('/auth/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ success: false, message: 'Faltan datos' });
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword))
        return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres, una letra y un número' });
    try {
        const { data: profile, error } = await supabase
            .from('profiles').select('password').eq('id', userId).single();
        if (error || !profile) throw new Error('Usuario no encontrado');
        const isValid = await bcrypt.compare(currentPassword, profile.password);
        if (!isValid)
            return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });
        const hashed = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('profiles').update({ password: hashed }).eq('id', userId);
        if (updateError) throw updateError;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/pacientes/:id/perfil
router.patch('/pacientes/:id/perfil', async (req, res) => {
    const { id } = req.params;
    const { genero, fecha_nacimiento, email, numero_afiliado } = req.body;
    try {
        if (numero_afiliado) {
            const { data: existing } = await supabaseSedes
                .from('paciente_perfil').select('paciente_id')
                .eq('numero_afiliado', numero_afiliado).neq('paciente_id', id).maybeSingle();
            if (existing)
                return res.status(400).json({ success: false, message: 'Ese número de afiliado ya está registrado' });
        }
        const { data, error } = await supabaseSedes
            .from('paciente_perfil')
            .upsert({ paciente_id: id, genero, fecha_nacimiento, email, numero_afiliado: numero_afiliado || null }, { onConflict: 'paciente_id' })
            .select()
            .single();
        if (error) {
            console.error('Error upsert paciente_perfil:', JSON.stringify(error));
            throw error;
        }
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Paciente: historial y obra social ──────────────────────────────────────

// GET  /api/pacientes/:id/ficha   → perfil + ficha médica del paciente
router.get('/pacientes/:id/ficha', async (req, res) => {
    const { id } = req.params;
    try {
        const [{ data: paciente, error: e1 }, { data: profile, error: e2 }] = await Promise.all([
            supabase.from('pacientes').select('obra_social, ficha_medica').eq('id', id).single(),
            supabase.from('profiles').select('nombre_apellido, dni').eq('id', id).single(),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        res.json({ success: true, data: { ...profile, ...paciente } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/pacientes/:id/historial  → actualiza ficha_medica
router.patch('/pacientes/:id/historial', async (req, res) => {
    const { id } = req.params;
    const { ficha_medica } = req.body;
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .update({ ficha_medica })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/pacientes/:id/obra-social  → actualiza obra_social
router.patch('/pacientes/:id/obra-social', async (req, res) => {
    const { id } = req.params;
    const { obra_social } = req.body;
    try {
        const { data, error } = await supabase
            .from('pacientes')
            .update({ obra_social })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profiles/:id  → actualiza nombre_apellido y/o dni
router.patch('/profiles/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_apellido, dni } = req.body;
    const updates = {};
    if (nombre_apellido) updates.nombre_apellido = nombre_apellido;
    if (dni) updates.dni = dni;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
