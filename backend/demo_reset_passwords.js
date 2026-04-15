const supabase = require('./src/config/supabase');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DEMO_PASSWORD = 'Demo1234';

async function run() {
    const { data: medicos, error } = await supabase
        .from('profiles')
        .select('id, dni, nombre_apellido')
        .eq('tipo_usuario', 'medico');

    if (error) { console.error(error.message); return; }
    if (!medicos.length) { console.log('No hay médicos en la DB.'); return; }

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

    console.log('\n=== MÉDICOS EN LA BASE DE DATOS ===\n');
    for (const m of medicos) {
        await supabase.from('profiles').update({ password: hash }).eq('id', m.id);
        console.log(`  Matrícula : ${m.dni}`);
        console.log(`  Nombre    : ${m.nombre_apellido}`);
        console.log(`  Contraseña: ${DEMO_PASSWORD}`);
        console.log('  ---');
    }
    console.log('\nContrasenas actualizadas. Listo para la demo.');
}

run();
