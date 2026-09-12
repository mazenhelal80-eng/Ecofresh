import { UserRole } from '@prisma/client';
import { can } from '../lib/permissions';
import { prisma } from '../lib/prisma';
import { updateUser, toggleUserStatus, getUsersList } from '../actions/users';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runRBACTests() {
  console.log('==============================================');
  console.log('🧪 RUNNING COMPREHENSIVE RBAC & AUTH TEST SUITE');
  console.log('==============================================\n');

  // TEST 1: OWNER Permissions
  console.log('--- TEST 1: OWNER Full Access Verification ---');
  assert(can(UserRole.OWNER, 'users.view'), 'OWNER can users.view');
  assert(can(UserRole.OWNER, 'users.create'), 'OWNER can users.create');
  assert(can(UserRole.OWNER, 'users.edit'), 'OWNER can users.edit');
  assert(can(UserRole.OWNER, 'users.disable'), 'OWNER can users.disable');
  assert(can(UserRole.OWNER, 'settings.view'), 'OWNER can settings.view');
  assert(can(UserRole.OWNER, 'operations.create'), 'OWNER can operations.create');
  assert(can(UserRole.OWNER, 'inventory.transfer'), 'OWNER can inventory.transfer');
  assert(can(UserRole.OWNER, 'stations.create'), 'OWNER can stations.create');
  assert(can(UserRole.OWNER, 'finance.view'), 'OWNER can finance.view');
  assert(can(UserRole.OWNER, 'treasury.create'), 'OWNER can treasury.create');
  assert(can(UserRole.OWNER, 'MANAGE_MASTER_DATA'), 'OWNER can legacy MANAGE_MASTER_DATA');

  // TEST 2: ACCOUNTANT Permissions
  console.log('\n--- TEST 2: ACCOUNTANT Restricted Financial Scope Verification ---');
  // Allowed
  assert(can(UserRole.ACCOUNTANT, 'finance.view'), 'ACCOUNTANT can finance.view');
  assert(can(UserRole.ACCOUNTANT, 'finance.create'), 'ACCOUNTANT can finance.create');
  assert(can(UserRole.ACCOUNTANT, 'finance.edit'), 'ACCOUNTANT can finance.edit');
  assert(can(UserRole.ACCOUNTANT, 'finance.cancel'), 'ACCOUNTANT can finance.cancel');
  assert(can(UserRole.ACCOUNTANT, 'treasury.view'), 'ACCOUNTANT can treasury.view');
  assert(can(UserRole.ACCOUNTANT, 'treasury.create'), 'ACCOUNTANT can treasury.create');
  assert(can(UserRole.ACCOUNTANT, 'payables.view'), 'ACCOUNTANT can payables.view');
  assert(can(UserRole.ACCOUNTANT, 'receivables.view'), 'ACCOUNTANT can receivables.view');
  assert(can(UserRole.ACCOUNTANT, 'reports.finance.view'), 'ACCOUNTANT can reports.finance.view');
  assert(can(UserRole.ACCOUNTANT, 'suppliers.financial_view'), 'ACCOUNTANT can suppliers.financial_view');
  assert(can(UserRole.ACCOUNTANT, 'customers.financial_view'), 'ACCOUNTANT can customers.financial_view');
  assert(can(UserRole.ACCOUNTANT, 'MANAGE_FINANCIALS'), 'ACCOUNTANT can legacy MANAGE_FINANCIALS');

  // Forbidden
  assert(!can(UserRole.ACCOUNTANT, 'users.view'), 'ACCOUNTANT CANNOT users.view');
  assert(!can(UserRole.ACCOUNTANT, 'users.create'), 'ACCOUNTANT CANNOT users.create');
  assert(!can(UserRole.ACCOUNTANT, 'users.edit'), 'ACCOUNTANT CANNOT users.edit');
  assert(!can(UserRole.ACCOUNTANT, 'users.disable'), 'ACCOUNTANT CANNOT users.disable');
  assert(!can(UserRole.ACCOUNTANT, 'settings.view'), 'ACCOUNTANT CANNOT settings.view');
  assert(!can(UserRole.ACCOUNTANT, 'operations.view'), 'ACCOUNTANT CANNOT operations.view');
  assert(!can(UserRole.ACCOUNTANT, 'operations.create'), 'ACCOUNTANT CANNOT operations.create');
  assert(!can(UserRole.ACCOUNTANT, 'inventory.view'), 'ACCOUNTANT CANNOT inventory.view');
  assert(!can(UserRole.ACCOUNTANT, 'inventory.transfer'), 'ACCOUNTANT CANNOT inventory.transfer');
  assert(!can(UserRole.ACCOUNTANT, 'stations.view'), 'ACCOUNTANT CANNOT stations.view');
  assert(!can(UserRole.ACCOUNTANT, 'stations.create'), 'ACCOUNTANT CANNOT stations.create');
  assert(!can(UserRole.ACCOUNTANT, 'agreements.view'), 'ACCOUNTANT CANNOT agreements.view');
  assert(!can(UserRole.ACCOUNTANT, 'contractors.view'), 'ACCOUNTANT CANNOT contractors.view');
  assert(!can(UserRole.ACCOUNTANT, 'MANAGE_MASTER_DATA'), 'ACCOUNTANT CANNOT legacy MANAGE_MASTER_DATA');

  // TEST 3: Rule 5 - Last Active OWNER Protection
  console.log('\n--- TEST 3: Rule 5 - Last Active OWNER Protection ---');
  const activeOwners = await prisma.userProfile.findMany({
    where: {
      OR: [{ role: UserRole.OWNER }, { role: UserRole.ADMIN }],
      isActive: true,
    },
  });
  console.log(`Found ${activeOwners.length} active OWNER(s) in DB.`);

  if (activeOwners.length === 1) {
    const singleOwner = activeOwners[0];
    process.env.MOCK_AUTH_USER_ID = singleOwner.id;
    console.log(`Attempting to disable the only active owner (${singleOwner.fullName})...`);

    // Test toggle status on last owner
    const toggleRes = await toggleUserStatus(singleOwner.id);
    assert(
      !toggleRes.success && toggleRes.error?.includes('قاعدة أمان'),
      `toggleUserStatus prevented disabling the last active OWNER (${toggleRes.error})`
    );

    // Test demote role on last owner
    const updateRes = await updateUser({
      id: singleOwner.id,
      fullName: singleOwner.fullName,
      role: UserRole.ACCOUNTANT,
      title: 'محاسب',
      isActive: true,
    });
    assert(
      !updateRes.success && updateRes.error?.includes('قاعدة أمان'),
      `updateUser prevented demoting the last active OWNER to ACCOUNTANT (${updateRes.error})`
    );
  }

  // TEST 4: Users list query
  console.log('\n--- TEST 4: Users List Retrieval ---');
  const usersRes = await getUsersList();
  assert(usersRes.success && Array.isArray(usersRes.users), 'getUsersList returns success and array');
  console.log(`Retrieved ${usersRes.users?.length} user(s).`);

  console.log('\n==============================================');
  console.log('🎉 ALL RBAC & SECURITY TESTS PASSED PERFECTLY!');
  console.log('==============================================\n');
}

runRBACTests()
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
