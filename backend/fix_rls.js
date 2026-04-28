require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
      await prisma.$executeRawUnsafe('ALTER TABLE mensajes DISABLE ROW LEVEL SECURITY;');
      console.log('RLS disabled successfully!');
  } catch (e) {
      console.error(e);
  } finally {
      await prisma.$disconnect();
  }
}
run();
