const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query(`
            ALTER TABLE turnos
            ADD COLUMN IF NOT EXISTS sede TEXT;
        `);
        console.log('✅ Columna "sede" agregada a turnos (o ya existía).');
    } catch (err) {
        console.error('❌ Error al migrar:', err.message);
    } finally {
        await client.end();
    }
}

run();
