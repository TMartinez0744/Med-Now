const supabase = require('../config/supabase');

class TurnosService {

    // Crear un turno
    async create({ paciente_id, medico_id, fecha_hora, notas_triage }) {
        // Verificar que no exista ya un turno activo para el mismo médico y fecha/hora
        const { data: existente, error: checkError } = await supabase
            .from('turnos')
            .select('id')
            .eq('medico_id', medico_id)
            .eq('fecha_hora', fecha_hora)
            .neq('estado', 'cancelado')
            .limit(1);

        if (checkError) throw checkError;

        if (existente && existente.length > 0) {
            const err = new Error('Este horario ya fue reservado por otro paciente.');
            err.code = 'TURNO_DUPLICADO';
            throw err;
        }

        const { data, error } = await supabase
            .from('turnos')
            .insert({
                paciente_id,
                medico_id,
                fecha_hora,
                estado: 'pendiente',
            })
            .select('id, paciente_id, medico_id, fecha_hora, estado')
            .single();

        if (error) throw error;
        return data;
    }

    // Turnos de un paciente — incluye nombre del médico y especialidades
    async getByPaciente(pacienteId) {
        const { data, error } = await supabase
            .from('turnos')
            .select(`
                id, fecha_hora, estado,
                medico_id,
                medicos (
                    especialidades,
                    profiles ( nombre_apellido, foto_url )
                )
            `)
            .eq('paciente_id', pacienteId)
            .neq('estado', 'cancelado')
            .gte('fecha_hora', new Date().toISOString())
            .order('fecha_hora', { ascending: true });

        if (error) throw error;
        return data;
    }

    // Turnos de un médico — incluye nombre del paciente
    async getByMedico(medicoId) {
        const { data, error } = await supabase
            .from('turnos')
            .select(`
                id, fecha_hora, estado,
                paciente_id,
                pacientes (
                    profiles ( nombre_apellido, foto_url )
                )
            `)
            .eq('medico_id', medicoId)
            .neq('estado', 'cancelado')
            .gte('fecha_hora', new Date().toISOString())
            .order('fecha_hora', { ascending: true });

        if (error) throw error;
        return data;
    }

    // Historial de turnos de un paciente
    async getHistorialByPaciente(pacienteId) {
        const { data, error } = await supabase
            .from('turnos')
            .select(`
                id, fecha_hora, estado,
                medico_id,
                medicos (
                    especialidades,
                    profiles ( nombre_apellido, foto_url )
                )
            `)
            .eq('paciente_id', pacienteId)
            .order('fecha_hora', { ascending: false });

        if (error) throw error;
        return data;
    }

    // Historial de turnos de un médico
    async getHistorialByMedico(medicoId) {
        const { data, error } = await supabase
            .from('turnos')
            .select(`
                id, fecha_hora, estado,
                paciente_id,
                pacientes (
                    profiles ( nombre_apellido, foto_url )
                )
            `)
            .eq('medico_id', medicoId)
            .order('fecha_hora', { ascending: false });

        if (error) throw error;
        return data;
    }

    // Cancelar turno
    async cancel(id) {
        const { data, error } = await supabase
            .from('turnos')
            .update({ estado: 'cancelado' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = new TurnosService();
