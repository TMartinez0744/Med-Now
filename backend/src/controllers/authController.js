const supabase = require('../config/supabase');
const supabaseSedes = require('../config/supabaseSedes');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { dni, password, nombre_apellido, tipo_usuario, genero, fecha_nacimiento, email } = req.body;

    if (!dni || !password || !nombre_apellido || !tipo_usuario) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('dni', dni);

        if (existing && existing.length > 0) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        // Requiere que el usuario corra ALTER TABLE profiles ADD COLUMN password TEXT; y DROP CONSTRAINT
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
                id: userId,
                dni,
                nombre_apellido,
                tipo_usuario,
                password: hashedPassword
            }]);

        if (profileError) {
            console.error('Profile insert error:', profileError);
            return res.status(500).json({ message: 'Asegúrate de ejecutar el comando SQL en Supabase que te indiqué.', error: JSON.stringify(profileError) });
        }

        if (tipo_usuario === 'medico') {
            await supabase.from('medicos').insert([{ id: userId, especialidades: [], sedes: [], recibir_turnos: true }]);
            
            // Insertar disponibilidad por defecto (Lunes a Viernes, de 08:00 a 18:00)
            const defaultDisponibilidad = [1, 2, 3, 4, 5].map(dia => ({
                id: crypto.randomUUID(),
                medico_id: userId,
                dia_semana: dia,
                hora_inicio: '08:00:00',
                hora_fin: '18:00:00'
            }));
            await supabase.from('disponibilidad').insert(defaultDisponibilidad);
        } else if (tipo_usuario === 'paciente') {
            await supabase.from('pacientes').insert([{ id: userId, obra_social: null }]);
            await supabaseSedes.from('paciente_perfil').insert([{
                paciente_id: userId,
                genero: genero || null,
                fecha_nacimiento: fecha_nacimiento || null,
                email: email || null,
            }]);
        }

        return res.status(201).json({ message: 'Registro exitoso' });
    } catch (error) {
        console.error('Error en register:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const login = async (req, res) => {
    const { dni, password } = req.body;

    if (!dni || !password) {
        return res.status(400).json({ message: 'DNI y password son obligatorios' });
    }

    // Normaliza: "MN 99001", "M.N. 99001", "MP99001" → "99001"
    const dniNormalizado = dni.replace(/^M[NP]\.?\s*/i, '').trim();

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, nombre_apellido, dni, tipo_usuario, password')
            .or(`dni.eq.${dniNormalizado},dni.ilike.*${dniNormalizado}`);

        if (error) {
            console.error('Supabase fetch error in login:', error);
            return res.status(500).json({ message: 'Error de red con Supabase', error });
        }
        if (!profiles || profiles.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas (Usuario no encontrado)' });
        }

        const profile = profiles[0];

        if (!profile.password) {
            return res.status(401).json({ message: 'Cuenta sin contraseña, por favor registrar de nuevo.' });
        }

        const isValid = await bcrypt.compare(password, profile.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        let medicoData = null;
        if (profile.tipo_usuario === 'medico') {
            const { data: medico } = await supabase
                .from('medicos')
                .select('id, especialidades, sedes, recibir_turnos')
                .eq('id', profile.id)
                .single();
            medicoData = medico;
        }

        delete profile.password;

        const token = jwt.sign(
            { id: profile.id, tipo_usuario: profile.tipo_usuario },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            message: 'Login correcto',
            token,
            user: {
                ...profile,
                ...(medicoData && { medico: medicoData }),
            },
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { register, login };