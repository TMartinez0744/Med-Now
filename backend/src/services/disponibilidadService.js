const supabaseSedes = require('../config/supabaseSedes');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

class DisponibilidadService {

    async getByMedico(medicoId) {
        const { data, error } = await supabaseSedes
            .from('disponibilidad_sedes')
            .select('*')
            .eq('medico_id', medicoId)
            .order('dia_semana', { ascending: true })
            .order('hora_inicio', { ascending: true });

        if (error) throw error;

        return data.map(s => ({
            ...s,
            dia_nombre: DIAS[s.dia_semana] ?? `Día ${s.dia_semana}`,
        }));
    }

    async create(medicoId, { dia_semana, hora_inicio, hora_fin, sede }) {
        const { data, error } = await supabase
            .from('disponibilidad')
            .insert({
                medico_id:   medicoId,
                dia_semana:  parseInt(dia_semana),
                hora_inicio: hora_inicio,   // "HH:MM"
                hora_fin:    hora_fin,      // "HH:MM"
                sede:        sede,          // "Sede / Hospital"
            })
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            dia_nombre: DIAS[data.dia_semana] ?? `Día ${data.dia_semana}`,
        };
    }

    async delete(id) {
        const { error } = await supabaseSedes
            .from('disponibilidad_sedes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { deleted: true };
    }

    async deleteAllByMedico(medicoId, sede = null) {
        let query = supabaseSedes
            .from('disponibilidad_sedes')
            .delete()
            .eq('medico_id', medicoId);

        if (sede) query = query.eq('sede', sede);

        const { data, error } = await query.select();

        if (error) throw error;
        return { count: data.length };
    }
}

module.exports = new DisponibilidadService();
