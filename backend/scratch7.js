require('dotenv').config();
const prisma = require('./src/config/prisma');

async function run() {
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE profiles ADD COLUMN password TEXT;');
        console.log("Successfully added password column!");
    } catch(e) {
        console.log("Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
