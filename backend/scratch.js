const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        // Find constraints on the "profiles" table referencing auth.users (if any)
        const res = await client.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'profiles'::regclass AND contype = 'f';
        `);

        console.log('Constraints on profiles:', res.rows);

        for (const row of res.rows) {
            console.log(`Dropping constraint: ${row.conname}`);
            await client.query(`ALTER TABLE profiles DROP CONSTRAINT "${row.conname}"`);
        }

        // Add password column if it doesn't exist
        try {
            await client.query(`ALTER TABLE profiles ADD COLUMN password TEXT;`);
            console.log('Column password added successfully.');
        } catch (e) {
            console.log('Column password might already exist:', e.message);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
