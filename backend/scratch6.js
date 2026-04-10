require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    const userId = crypto.randomUUID();
    const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
                id: userId,
                dni: '99999999|hash',
                nombre_apellido: 'hack',
                tipo_usuario: 'paciente'
            }]);
    console.log(profileError);
}
test();
