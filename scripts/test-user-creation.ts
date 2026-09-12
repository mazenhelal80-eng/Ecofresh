import { prisma } from '../lib/prisma';
import { createUser, getUsersList } from '../actions/users';
import { UserRole } from '@prisma/client';

async function testUserCreation() {
  console.log('--- Testing Create User Flow ---');
  const owner = await prisma.userProfile.findFirst({
    where: { role: UserRole.OWNER, isActive: true },
  });

  if (!owner) throw new Error('No active owner found');
  process.env.MOCK_AUTH_USER_ID = owner.id;

  const testEmail = `accountant_test_${Date.now()}@niloticfrost.com`;
  console.log(`Attempting to create user: ${testEmail}...`);

  const createRes = await createUser({
    fullName: 'المحاسب التجريبي',
    email: testEmail,
    password: 'password123',
    role: UserRole.ACCOUNTANT,
    title: 'محاسب مالي',
  });

  console.log('Create User Result:', createRes);

  if (!createRes.success) {
    throw new Error(`Failed to create user: ${createRes.error}`);
  }

  // Verify user appears in getUsersList
  const listRes = await getUsersList();
  console.log('Users count in list:', listRes.users?.length);
  const createdUser = listRes.users?.find((u) => u.email === testEmail);
  console.log('Found created user:', createdUser);

  if (!createdUser) {
    throw new Error('Created user not found in list');
  }

  // Clean up test user
  await prisma.userProfile.delete({ where: { id: createdUser.id } });
  await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = $1::uuid;`, createdUser.id);
  console.log('Cleaned up test user successfully.');
  console.log('🎉 TEST PASSED: User creation works flawlessly!');
}

testUserCreation()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
