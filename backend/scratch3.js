require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        console.log("Connected using Prisma Client successfully!");
        
        // Let's assume it works, let's just alter the table
        await prisma.$executeRawUnsafe('ALTER TABLE profiles ADD COLUMN password TEXT;');
        console.log("Altered profiles table added password!");
    } catch(e) {
        console.log("Failed:", e.message);
    }
}
run();
