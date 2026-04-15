const supabase = require('./src/config/supabase');
require('dotenv').config();

// Nombres argentinos reales por especialidad
const NOMBRES_POR_ESPECIALIDAD = {
    "Cardiología":     ["Dr. Martín Ferreyra", "Dra. Valeria Santillán"],
    "Clínica médica":  ["Dr. Pablo Iriarte", "Dra. Luciana Vega"],
    "Dermatología":    ["Dra. Camila Rodríguez", "Dr. Sebastián Morales"],
    "Pediatría":       ["Dra. Florencia Aguirre", "Dr. Nicolás Pereyra"],
    "Traumatología":   ["Dr. Ezequiel Mansilla", "Dra. Andrea Giménez"],
    "Ginecología":     ["Dra. Romina Salcedo", "Dra. Natalia Córdoba"],
    "Neurología":      ["Dr. Alejandro Benítez", "Dra. Sofía Herrera"],
    "Oftalmología":    ["Dr. Federico Maldonado", "Dra. Mariana Acosta"],
};

const NOMBRES_GENERICOS = [
    "Dr. Gustavo Ledesma",
    "Dra. Carolina Sánchez",
    "Dr. Roberto Villanueva",
    "Dra. Paola Giordano",
    "Dr. Hernán Molina",
    "Dra. Silvina Quiroga",
];

async function run() {
    // 1. Traer todos los médicos (id == profile_id en este schema)
    const { data: medicos, error: errMedicos } = await supabase
        .from('medicos')
        .select('id, especialidades');

    if (errMedicos) {
        console.error('Error al traer médicos:', errMedicos.message);
        return;
    }

    if (!medicos || medicos.length === 0) {
        console.log('No se encontraron médicos en la base de datos.');
        return;
    }

    console.log(`Encontrados ${medicos.length} médico(s). Actualizando nombres...\n`);

    const contadores = {};
    let genericoIdx = 0;

    for (const medico of medicos) {
        const especialidad = medico.especialidades?.[0] ?? null;
        let nuevoNombre;

        if (especialidad && NOMBRES_POR_ESPECIALIDAD[especialidad]) {
            contadores[especialidad] = contadores[especialidad] ?? 0;
            const lista = NOMBRES_POR_ESPECIALIDAD[especialidad];
            nuevoNombre = lista[contadores[especialidad] % lista.length];
            contadores[especialidad]++;
        } else {
            nuevoNombre = NOMBRES_GENERICOS[genericoIdx % NOMBRES_GENERICOS.length];
            genericoIdx++;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ nombre_apellido: nuevoNombre })
            .eq('id', medico.id);

        if (error) {
            console.error(`  ✗ Error actualizando médico ${medico.id}:`, error.message);
        } else {
            console.log(`  ✓ ${medico.id} → ${nuevoNombre} (${especialidad ?? 'sin especialidad'})`);
        }
    }

    console.log('\nListo.');
}

run();
