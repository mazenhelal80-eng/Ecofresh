import { prisma } from '../lib/prisma';

async function testAuthUsers() {
  try {
    const authUsers = await prisma.$queryRawUnsafe(`
      SELECT id, email, last_sign_in_at, created_at FROM auth.users;
    `);
    console.log('=== AUTH USERS FROM SUPABASE AUTH SCHEMA ===');
    console.log(authUsers);
  } catch (e: any) {
    console.log('Error querying auth.users:', e.message);
  }
}

testAuthUsers().finally(() => prisma.$disconnect());
