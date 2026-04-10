const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.eufakajmjeenxeciisom:5p%1dV2R8KwCn%26@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => {
    console.log('Connected to Supabase via Pooler!');
    return client.query('ALTER TABLE profiles ADD COLUMN password TEXT;');
  })
  .then(() => {
    console.log('Column added (or already exists)');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
