const { Client } = require('pg');

const regions = [
    'aws-0-us-east-1',
    'aws-0-us-west-1',
    'aws-0-eu-central-1',
    'aws-0-eu-west-1',
    'aws-0-sa-east-1',
    'aws-0-ap-southeast-1',
    'aws-0-ap-northeast-1',
    'aws-0-ap-south-1',
    'aws-0-ca-central-1',
    'aws-0-eu-west-2'
];

async function tryRegion(region) {
    const connStr = `postgresql://postgres.eufakajmjeenxeciisom:5p%1dV2R8KwCn%26@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log(`SUCCESS! Connected on ${region}`);
        await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;');
        console.log("Successfully added password column!");
        return true;
    } catch (e) {
        if (e.message.includes('Tenant or user not found')) {
            // expected if wrong region
        } else {
            console.log(`Failed on ${region} with: ${e.message}`);
        }
        return false;
    } finally {
        client.end();
    }
}

async function run() {
    for (const region of regions) {
        const success = await tryRegion(region);
        if (success) return;
    }
    console.log("All failed.");
}

run();
