const { execSync } = require('child_process');
try {
    console.log(execSync('npx prisma db push', {
        env: {
            ...process.env,
            DATABASE_URL: 'postgresql://postgres.eufakajmjeenxeciisom:5p%1dV2R8KwCn%26@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
        },
        stdio: 'inherit'
    }));
} catch(e) {
    console.log(e.message);
}
