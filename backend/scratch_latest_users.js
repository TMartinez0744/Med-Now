const supabase = require('./src/config/supabase');
require('dotenv').config();

async function run() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    console.log(profiles);
}

run();
