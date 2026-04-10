require('dotenv').config();
const bcrypt = require('bcryptjs');

async function main() {
    const hash = await bcrypt.hash('password1', 10);
    console.log('Hash de password1:', hash);
    console.log('\nSQL para ejecutar en Supabase:\n');
    console.log(`-- 1. Agregar columna password a profiles`);
    console.log(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;`);
    console.log(`\n-- 2. Actualizar todos los usuarios con el hash`);
    console.log(`UPDATE profiles SET password = '${hash}';`);
}

main();
