const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseSedes = createClient(
    process.env.SUPABASE_SEDES_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SEDES_KEY || process.env.SUPABASE_KEY || 'placeholder_key'
);

module.exports = supabaseSedes;
