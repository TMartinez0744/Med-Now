const supabaseSedes = require('../config/supabaseSedes');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

class DisponibilidadService {

    async getByMedico(medicoId) {
        const { data, error } = await supabaseSedes
            .from('disponibilidad')
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

    async create(medicoId, { dia_semana, hora_inicio, hora_fin, sede, duracion_turno }) {
        const { data, error } = await supabaseSedes
            .from('disponibilidad')
            .insert({
                medico_id:     medicoId,
                dia_semana:    parseInt(dia_semana),
                hora_inicio:   hora_inicio,
                hora_fin:      hora_fin,
                sede:          sede || null,
                duracion_turno: duracion_turno ?? 30,
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
            .from('disponibilidad')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { deleted: true };
    }

    async deleteAllByMedico(medicoId, sede = null) {
        if (sede) {
            // Eliminar slots donde la sede es nula (slots por defecto del registro)
            await supabaseSedes
                .from('disponibilidad')
                .delete()
                .eq('medico_id', medicoId)
                .is('sede', null);

            // Eliminar slots de la sede específica seleccionada
            const { data, error } = await supabaseSedes
                .from('disponibilidad')
                .delete()
                .eq('medico_id', medicoId)
                .eq('sede', sede)
                .select();

            if (error) throw error;
            return { count: data ? data.length : 0 };
        } else {
            const { data, error } = await supabaseSedes
                .from('disponibilidad')
                .delete()
                .eq('medico_id', medicoId)
                .select();

            if (error) throw error;
            return { count: data ? data.length : 0 };
        }
    }
}

module.exports = new DisponibilidadService();
