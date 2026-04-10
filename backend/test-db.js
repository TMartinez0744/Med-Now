const { Client } = require('pg');

const uri = process.env.DATABASE_URL || "postgresql://postgres.uxnujlpztzeiosjelxpf:5p%251dV2R8KwCn%26@aws-1-us-east-2.pooler.supabase.com:5432/postgres";
const client = new Client({ connectionString: uri });

client.connect()
  .then(() => {
    console.log('Connected to database successfully!');
    return client.query(`
      ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
      ALTER TABLE medicos DISABLE ROW LEVEL SECURITY;
      ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
    `);
  })
  .then(res => {
    console.log('Altered profiles table');
    client.end();
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    client.end();
  });
