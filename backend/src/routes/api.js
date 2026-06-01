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
const { authorizeRoles, verifyOwnershipOrRole } = require('../middleware/roleMiddleware');
const { verifyTurnoOwnership } = require('../middleware/verifyTurnoOwnership');

router.use(verifyToken);

// Rutas REST clásicas de ejemplo para interactuar con Supabase en lugar de MongoDB

// GET /api/medicos
// Obtiene todos los médicos cruzado con su información de perfil y obras sociales.
// Accesible por cualquier usuario autenticado (pacientes o médicos)
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
        res.status(500).json({ success: false, message: "Error interno al obtener los médicos." });
    }
});

// GET /api/medicos/:id/obras-sociales
// Accesible por el médico propietario o cualquier paciente/usuario autenticado
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
        console.error("Error al obtener obras sociales:", err);
        res.status(500).json({ success: false, message: "Error interno al obtener las obras sociales." });
    }
});

// PUT /api/medicos/:id/obras-sociales
// Solo el médico propietario puede modificar sus propias obras sociales
router.put('/medicos/:id/obras-sociales', verifyOwnershipOrRole([], 'id'), async (req, res) => {
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
        console.error("Error actualizando obras sociales:", err);
        res.status(500).json({ success: false, message: "Error interno al actualizar las obras sociales." });
    }
});

// PUT /api/medicos/:id
// Solo el médico propietario puede actualizar sus especialidades y sedes
router.put('/medicos/:id', verifyOwnershipOrRole([], 'id'), async (req, res) => {
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
        res.status(500).json({ success: false, message: "Error interno al actualizar los datos médicos." });
    }
});

// GET /api/pacientes/:id
// Permitido al paciente dueño o a médicos
router.get('/pacientes/:id', verifyOwnershipOrRole(['medico'], 'id'), async (req, res) => {
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
        res.status(500).json({ success: false, message: "Error interno al obtener los datos del paciente." });
    }
});

// GET /api/pacientes
// Obtiene todos los pacientes registrados cruzado con su perfil.
// Solo médicos o administradores tienen acceso a este listado completo.
router.get('/pacientes', authorizeRoles('medico', 'admin'), async (req, res) => {
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
        res.status(500).json({ success: false, message: "Error interno al obtener la lista de pacientes." });
    }
});

// GET /api/centros_emergencia
// Obtiene la lista de centros médicos/guardias. Público para usuarios autenticados.
router.get('/centros_emergencia', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('centros_emergencia')
            .select('*');
        
        if (error) throw error;
        
        res.json({ success: true, count: data.length, data });
    } catch (err) {
        console.error("Error obteniendo centros de emergencia:", err);
        res.status(500).json({ success: false, message: "Error interno al obtener centros de emergencia." });
    }
});

// ─── Disponibilidad de médicos ───────────────────────────────────────────────

// GET /api/medicos/:id/slots?sede=X&fecha=YYYY-MM-DD → slots disponibles reales (público)
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
        console.error("Error obteniendo slots de disponibilidad:", err);
        res.status(500).json({ success: false, message: "Error interno al calcular slots libres." });
    }
});

// GET /api/medicos/:id/disponibilidad
// Obtiene slots del médico. Puede verlo el propio médico o un paciente para sacar turno.
router.get('/medicos/:id/disponibilidad', disponibilidadController.getByMedico.bind(disponibilidadController));

// POST /api/medicos/:id/disponibilidad
// Solo el médico propietario puede configurar su disponibilidad
router.post('/medicos/:id/disponibilidad', verifyOwnershipOrRole([], 'id'), disponibilidadController.create.bind(disponibilidadController));

// DELETE /api/medicos/:id/disponibilidad
// Solo el médico propietario puede borrar su disponibilidad
router.delete('/medicos/:id/disponibilidad', verifyOwnershipOrRole([], 'id'), disponibilidadController.deleteAllByMedico.bind(disponibilidadController));

// DELETE /api/disponibilidad/:id
// Dado que elimina por ID de slot, primero verificamos la propiedad en el servicio/controlador, o la restringimos a médicos en general.
// Para ser robustos, solo permitimos a médicos ejecutar este delete.
router.delete('/disponibilidad/:id', authorizeRoles('medico'), disponibilidadController.delete.bind(disponibilidadController));

// ─── Turnos (reservas) ───────────────────────────────────────────────────────

// POST /api/turnos → crear turno { paciente_id, medico_id, fecha_hora }
// Protegemos para que un paciente no cree un turno en nombre de otro paciente
router.post('/turnos', (req, res, next) => {
    const { paciente_id } = req.body;
    const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;
    
    if (tokenUserRole !== 'medico' && tokenUserId !== paciente_id) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: No puedes agendar turnos para otro paciente.' });
    }
    next();
}, turnosController.create.bind(turnosController));

// GET /api/pacientes/:id/turnos
// Solo el paciente dueño o un médico pueden ver los turnos
router.get('/pacientes/:id/turnos', verifyOwnershipOrRole(['medico'], 'id'), turnosController.getByPaciente.bind(turnosController));

// GET /api/medicos/:id/turnos
// Solo el médico dueño puede ver sus propios turnos
router.get('/medicos/:id/turnos', verifyOwnershipOrRole([], 'id'), turnosController.getByMedico.bind(turnosController));

// GET /api/pacientes/:id/turnos/historial
// Solo el paciente dueño o un médico pueden ver su historial
router.get('/pacientes/:id/turnos/historial', verifyOwnershipOrRole(['medico'], 'id'), turnosController.getHistorialByPaciente.bind(turnosController));

// GET /api/pacientes/:id/turnos/con-medico/:medicoId → historial entre paciente y médico
// Solo el paciente dueño o el médico implicado pueden acceder
router.get('/pacientes/:id/turnos/con-medico/:medicoId', (req, res, next) => {
    const { id, medicoId } = req.params;
    const { id: tokenUserId, tipo_usuario: tokenUserRole } = req.user;
    if (tokenUserId === id || tokenUserId === medicoId) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Acceso denegado: No tienes permisos para ver esta información.' });
}, async (req, res) => {
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
        console.error("Error al obtener historial con médico:", err);
        res.status(500).json({ success: false, message: "Error interno al obtener el historial." });
    }
});

// GET /api/medicos/:id/turnos/historial
// Solo el médico dueño puede ver el historial
router.get('/medicos/:id/turnos/historial', verifyOwnershipOrRole([], 'id'), turnosController.getHistorialByMedico.bind(turnosController));

// PATCH /api/turnos/:id/cancelar
// Protegido por verifyTurnoOwnership para asegurar que solo los implicados cancelen
router.patch('/turnos/:id/cancelar', verifyTurnoOwnership, turnosController.cancel.bind(turnosController));

router.get('/chat/info', chatController.info.bind(chatController));
router.post('/chat', chatController.send.bind(chatController));

// ─── Paciente: perfil extendido (genero, fecha_nacimiento, email) ────────────

// GET /api/pacientes/:id/perfil
// Solo el paciente dueño o un médico pueden ver su perfil detallado
router.get('/pacientes/:id/perfil', verifyOwnershipOrRole(['medico'], 'id'), async (req, res) => {
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
        console.error("Error al obtener perfil paciente:", err);
        res.status(500).json({ success: false, message: "Error interno al obtener el perfil." });
    }
});

// POST /api/auth/change-password
// Protegido implícitamente ya que usa el req.user.id extraído del token JWT
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
        console.error("Error al cambiar contraseña:", err);
        res.status(500).json({ success: false, message: "Error interno al cambiar la contraseña." });
    }
});

// PATCH /api/pacientes/:id/perfil
// Solo el paciente dueño puede modificar sus datos de perfil personal
router.patch('/pacientes/:id/perfil', verifyOwnershipOrRole([], 'id'), async (req, res) => {
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
        console.error("Error al actualizar perfil:", err);
        res.status(500).json({ success: false, message: "Error interno al actualizar el perfil." });
    }
});

// ─── Paciente: historial y obra social ──────────────────────────────────────

// GET /api/pacientes/:id/ficha → perfil + ficha médica del paciente
// Solo el paciente dueño o un médico pueden consultarla
router.get('/pacientes/:id/ficha', verifyOwnershipOrRole(['medico'], 'id'), async (req, res) => {
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
        console.error("Error al obtener ficha médica:", err);
        res.status(500).json({ success: false, message: "Error interno al obtener la ficha médica." });
    }
});

// PATCH /api/pacientes/:id/historial → actualiza ficha_medica
// Solo el propio paciente o un médico pueden actualizar la historia clínica
router.patch('/pacientes/:id/historial', verifyOwnershipOrRole(['medico'], 'id'), async (req, res) => {
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
        console.error("Error actualizando historial médico:", err);
        res.status(500).json({ success: false, message: "Error interno al actualizar la historia clínica." });
    }
});

// PATCH /api/pacientes/:id/obra-social → actualiza obra_social
// Solo el paciente dueño puede actualizar su obra social
router.patch('/pacientes/:id/obra-social', verifyOwnershipOrRole([], 'id'), async (req, res) => {
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
        console.error("Error al actualizar obra social:", err);
        res.status(500).json({ success: false, message: "Error interno al actualizar la obra social." });
    }
});

// PATCH /api/profiles/:id → actualiza nombre_apellido y/o dni
// Solo el propio usuario dueño del perfil puede actualizar sus datos
router.patch('/profiles/:id', verifyOwnershipOrRole([], 'id'), async (req, res) => {
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
        console.error("Error al actualizar perfil general:", err);
        res.status(500).json({ success: false, message: "Error interno al actualizar el perfil general." });
    }
});

module.exports = router;
