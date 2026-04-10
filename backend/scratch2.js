require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.auth.signUp({
        email: 'test_trigger_103@gmail.com',
        password: 'Password123!',
        options: {
            data: {
                dni: "99887766",
                nombre_apellido: "Juan Lopez",
                tipo_usuario: "medico"
            }
        }
    });
    console.log(error || data);
}
test();
