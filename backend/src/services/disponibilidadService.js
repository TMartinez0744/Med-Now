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
        const existing = await this.getByMedico(medicoId);
        const diaInt = parseInt(dia_semana);
        const sameDaySlots = existing.filter(s => s.dia_semana === diaInt);

        const timeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            const h = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 0;
            return h * 60 + m;
        };

        const newStart = timeToMinutes(hora_inicio);
        const newEnd = timeToMinutes(hora_fin);

        // Margen mínimo (en minutos) que debe quedar libre entre dos franjas del mismo día.
        // Motivo: el médico no puede "teletransportarse" — necesita tiempo para trasladarse
        // entre sedes (o descansar) entre un bloque de atención y el siguiente.
        const BUFFER_MIN = 60;

        if (newStart >= newEnd) {
            const error = new Error('La hora de inicio debe ser menor que la hora de fin');
            error.code = 'OVERLAP_DISPONIBILIDAD';
            throw error;
        }

        for (const slot of sameDaySlots) {
            const slotStart = timeToMinutes(slot.hora_inicio);
            const slotEnd = timeToMinutes(slot.hora_fin);
            const slotSede = slot.sede || 'otra sede';

            // 1) Solapamiento directo (se pisan los horarios)
            if (newStart < slotEnd && newEnd > slotStart) {
                const error = new Error(`El horario seleccionado (${hora_inicio} - ${hora_fin}) se superpone con un horario existente en ${slotSede} (${slot.hora_inicio} - ${slot.hora_fin}).`);
                error.code = 'OVERLAP_DISPONIBILIDAD';
                throw error;
            }

            // 2) Margen insuficiente: no se pisan, pero quedan a menos de BUFFER_MIN minutos.
            //    Expandimos la franja existente BUFFER_MIN a cada lado y chequeamos overlap.
            if (newStart < slotEnd + BUFFER_MIN && newEnd > slotStart - BUFFER_MIN) {
                const error = new Error(`Debe haber al menos 1 hora de margen entre tus franjas horarias (por el traslado entre sedes). El horario (${hora_inicio} - ${hora_fin}) queda demasiado cerca de tu franja en ${slotSede} (${slot.hora_inicio} - ${slot.hora_fin}).`);
                error.code = 'OVERLAP_DISPONIBILIDAD';
                throw error;
            }
        }

        const { data, error } = await supabaseSedes
            .from('disponibilidad')
            .insert({
                medico_id:     medicoId,
                dia_semana:    diaInt,
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
