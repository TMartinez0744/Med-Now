const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseSedes = createClient(
    process.env.SUPABASE_SEDES_URL,
    process.env.SUPABASE_SEDES_KEY
);

module.exports = supabaseSedes;
