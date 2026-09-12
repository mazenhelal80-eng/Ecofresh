import { prisma } from '../lib/prisma';

async function main() {
  const users = await prisma.userProfile.findMany({
    include: {
      station: { select: { name: true } },
    }
  });
  console.log('=== USER PROFILES IN DATABASE ===');
  console.log('Count:', users.length);
  console.log(JSON.stringify(users, null, 2));

  try {
    const rawRoles = await prisma.$queryRawUnsafe(`
      SELECT enumlabel FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'user_role_type';
    `);
    console.log('=== DB ENUM VALUES (user_role_type) ===');
    console.log(rawRoles);
  } catch (e) {
    console.log('Error querying enum:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
