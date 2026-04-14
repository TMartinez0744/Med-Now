const supabase = require('./src/config/supabase');
const crypto = require('crypto');
require('dotenv').config();

async function run() {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    console.log('Profiles currently in DB:', profiles);
    console.log('Error:', error);
}

run();
