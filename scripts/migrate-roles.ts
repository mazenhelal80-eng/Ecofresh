import { prisma } from '../lib/prisma';

async function migrateRoles() {
  console.log('--- Migrating Roles in DB ---');
  // 1. Add enum values if they do not exist
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role_type' AND enumlabel = 'owner'
      ) THEN
        ALTER TYPE "user_role_type" ADD VALUE 'owner';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role_type' AND enumlabel = 'accountant'
      ) THEN
        ALTER TYPE "user_role_type" ADD VALUE 'accountant';
      END IF;
    END $$;
  `);

  console.log('Enum values added.');

  // 2. Migrate existing ADMIN users to OWNER
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "user_profiles" SET "role" = 'owner'::"user_role_type" WHERE "role" = 'admin'::"user_role_type";
  `);
  console.log('Updated admin users to owner:', updated);

  const users = await prisma.$queryRawUnsafe(`
    SELECT u.id, u.full_name, u.role, u.is_active, a.email, a.last_sign_in_at
    FROM "user_profiles" u
    LEFT JOIN auth.users a ON u.id = a.id;
  `);
  console.log('Current users after role migration:', users);
}

migrateRoles().catch(console.error).finally(() => prisma.$disconnect());
