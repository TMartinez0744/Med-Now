const supabase = require('./src/config/supabase');
const crypto = require('crypto');
require('dotenv').config();

async function run() {
    const userId = crypto.randomUUID();
    const dni = '44445555';
    const nombre_apellido = 'API Test User';
    const tipo_usuario = 'paciente';
    const password = 'mypassword';

    console.log('Inserting with UUID:', userId);

    const { data, error: profileError } = await supabase
        .from('profiles')
        .insert([{
            id: userId,
            dni,
            nombre_apellido,
            tipo_usuario,
            password
        }]);

    console.log('Profile insert result:', { data, profileError });
}

run();
