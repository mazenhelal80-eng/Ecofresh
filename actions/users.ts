"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { requireAuth, requirePermission } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerClientInstance } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

export interface UserViewItem {
  id: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  title: string | null;
  isActive: boolean;
  stationName: string | null;
  lastSignInAt: Date | null;
  createdAt: Date;
}

const CreateUserSchema = z.object({
  fullName: z.string().min(3, "الاسم يجب ألا يقل عن 3 أحرف"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
  role: z.enum([UserRole.OWNER, UserRole.ACCOUNTANT]),
  title: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid("معرف المستخدم غير صحيح"),
  fullName: z.string().min(3, "الاسم يجب ألا يقل عن 3 أحرف"),
  role: z.enum([UserRole.OWNER, UserRole.ACCOUNTANT]),
  title: z.string().optional().nullable(),
  isActive: z.boolean(),
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف"),
});

/**
 * 1. Get all system users with their auth metadata
 */
export async function getUsersList(): Promise<{ success: boolean; users?: UserViewItem[]; error?: string }> {
  try {
    await requirePermission('users.view');

    // Fetch profiles and join auth.users data safely
    const profiles = await prisma.userProfile.findMany({
      include: {
        station: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attempt to enrich with auth.users metadata from Postgres schema
    let authMap = new Map<string, { email: string; last_sign_in_at: Date | null }>();
    try {
      const authUsers: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, email, last_sign_in_at FROM auth.users;
      `);
      for (const au of authUsers) {
        authMap.set(au.id, {
          email: au.email,
          last_sign_in_at: au.last_sign_in_at ? new Date(au.last_sign_in_at) : null,
        });
      }
    } catch {
      // Fallback if auth schema not directly queryable
    }

    const users: UserViewItem[] = profiles.map((p) => {
      const authData = authMap.get(p.id);
      return {
        id: p.id,
        fullName: p.fullName,
        email: authData?.email || null,
        role: p.role,
        title: p.title,
        isActive: p.isActive,
        stationName: p.station?.name || null,
        lastSignInAt: authData?.last_sign_in_at || null,
        createdAt: p.createdAt,
      };
    });

    return { success: true, users };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء جلب قائمة المستخدمين' };
  }
}

/**
 * 2. Create a new User (OWNER only)
 */
export async function createUser(data: z.infer<typeof CreateUserSchema>) {
  try {
    const currentUser = await requirePermission('users.create');

    const validated = CreateUserSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const { fullName, email, password, role, title, stationId } = validated.data;

    // Check if email is already used in auth.users
    try {
      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1;`,
        email
      );
      if (existing && existing.length > 0) {
        return { success: false, error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' };
      }
    } catch {
      // ignore
    }

    let newUserId: string | null = null;

    // Strategy A: Use Supabase Admin API if service role key exists
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role },
        });

        if (!authError && authResult?.user) {
          newUserId = authResult.user.id;
        }
      } catch {
        // Fallback to Strategy B below
      }
    }

    // Strategy B: Direct PostgreSQL Auth User creation with standard bcrypt hashing
    if (!newUserId) {
      newUserId = crypto.randomUUID();
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            $1::uuid,
            'authenticated',
            'authenticated',
            $2,
            crypt($3, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('full_name', $4::text, 'role', $5::text)::jsonb,
            NOW(),
            NOW()
          );
        `, newUserId, email, password, fullName, role);
      } catch (dbAuthErr: any) {
        return {
          success: false,
          error: `فشل إنشاء حساب المستخدم في قاعدة البيانات: ${dbAuthErr.message}`,
        };
      }
    }

    // Insert UserProfile in Database
    await prisma.userProfile.create({
      data: {
        id: newUserId,
        fullName,
        role,
        title: title || (role === UserRole.OWNER ? 'مالك النظام' : 'محاسب مالي'),
        stationId: stationId || null,
        isActive: true,
      },
    });

    // Write Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: newUserId,
          action: 'CREATE_USER',
          summary: `تم إنشاء المستخدم ${fullName} بدور (${role}) بواسطة ${currentUser.fullName}`,
          performedBy: currentUser.id,
        },
      });
    } catch {
      // audit log failure should not block user creation
    }

    safeRevalidatePath('/settings');
    return { success: true, message: `تم إنشاء المستخدم ${fullName} بنجاح` };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل إنشاء المستخدم' };
  }
}

/**
 * 3. Update existing user
 */
export async function updateUser(data: z.infer<typeof UpdateUserSchema>) {
  try {
    const currentUser = await requirePermission('users.edit');

    const validated = UpdateUserSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const { id, fullName, role, title, isActive } = validated.data;

    const targetUser = await prisma.userProfile.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    // RULE 11: Prevent disabling or demoting the last active OWNER
    const isTargetOwner = targetUser.role === UserRole.OWNER || targetUser.role === UserRole.ADMIN;
    const willRemainOwner = role === UserRole.OWNER && isActive;

    if (isTargetOwner && !willRemainOwner) {
      const activeOwnersCount = await prisma.userProfile.count({
        where: {
          OR: [{ role: UserRole.OWNER }, { role: UserRole.ADMIN }],
          isActive: true,
        },
      });

      if (activeOwnersCount <= 1) {
        return {
          success: false,
          error: 'قاعدة أمان: لا يمكن تعطيل أو تغيير دور آخر مسؤول (OWNER) في النظام. يجب أن يكون هناك Owner نشط واحد على الأقل.',
        };
      }
    }

    await prisma.userProfile.update({
      where: { id },
      data: {
        fullName,
        role,
        title: title || targetUser.title,
        isActive,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: id,
          action: 'UPDATE_USER',
          summary: `تحديث بيانات المستخدم ${fullName} (الدور: ${role}، الحالة: ${isActive ? 'نشط' : 'معطل'}) بواسطة ${currentUser.fullName}`,
          performedBy: currentUser.id,
        },
      });
    } catch {
      // ignore
    }

    safeRevalidatePath('/settings');
    return { success: true, message: `تم تحديث بيانات المستخدم ${fullName} بنجاح` };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل تحديث بيانات المستخدم' };
  }
}

/**
 * 4. Toggle User Active/Inactive Status
 */
export async function toggleUserStatus(userId: string) {
  try {
    const currentUser = await requirePermission('users.disable');

    const targetUser = await prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: 'المستخدم غير موجود' };
    }

    const newActiveState = !targetUser.isActive;

    // RULE 11: Check last active OWNER protection
    if (!newActiveState && (targetUser.role === UserRole.OWNER || targetUser.role === UserRole.ADMIN)) {
      const activeOwnersCount = await prisma.userProfile.count({
        where: {
          OR: [{ role: UserRole.OWNER }, { role: UserRole.ADMIN }],
          isActive: true,
        },
      });

      if (activeOwnersCount <= 1) {
        return {
          success: false,
          error: 'قاعدة أمان: لا يمكن تعطيل أو تغيير دور آخر مسؤول في النظام. يجب أن يكون هناك Owner نشط واحد على الأقل.',
        };
      }
    }

    await prisma.userProfile.update({
      where: { id: userId },
      data: { isActive: newActiveState },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: userId,
          action: newActiveState ? 'ENABLE_USER' : 'DISABLE_USER',
          summary: `تم ${newActiveState ? 'تفعيل' : 'تعطيل'} حساب المستخدم ${targetUser.fullName} بواسطة ${currentUser.fullName}`,
          performedBy: currentUser.id,
        },
      });
    } catch {
      // ignore
    }

    safeRevalidatePath('/settings');
    return {
      success: true,
      message: `تم ${newActiveState ? 'تفعيل' : 'تعطيل'} المستخدم ${targetUser.fullName} بنجاح`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل تغيير حالة المستخدم' };
  }
}

/**
 * 5. Change current user's password (Self Account)
 */
export async function changeOwnPassword(formData: { currentPassword?: string; newPassword: string; confirmPassword: string }) {
  try {
    const currentUser = await requireAuth();

    if (formData.newPassword !== formData.confirmPassword) {
      return { success: false, error: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' };
    }

    if (formData.currentPassword && formData.currentPassword === formData.newPassword) {
      return { success: false, error: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية' };
    }

    const validated = ChangePasswordSchema.safeParse({ newPassword: formData.newPassword });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    let passwordUpdated = false;

    // Try Supabase Auth client session update
    try {
      const supabase = createServerClientInstance();
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });
      if (!error) {
        passwordUpdated = true;
      }
    } catch {
      // fallback
    }

    // Direct database update fallback
    if (!passwordUpdated) {
      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = NOW()
        WHERE id = $2::uuid;
      `, formData.newPassword, currentUser.id);
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: currentUser.id,
          action: 'CHANGE_PASSWORD',
          summary: `قام المستخدم ${currentUser.fullName} بتغيير كلمة المرور الخاصة بحسابه`,
          performedBy: currentUser.id,
        },
      });
    } catch {
      // ignore
    }

    return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل تغيير كلمة المرور' };
  }
}

/**
 * 6. Reset another user's password (OWNER only)
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const currentUser = await requirePermission('users.edit');

    if (newPassword.length < 6) {
      return { success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' };
    }

    let resetSuccess = false;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
        if (!error) {
          resetSuccess = true;
        }
      } catch {
        // fallback
      }
    }

    if (!resetSuccess) {
      await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = NOW()
        WHERE id = $2::uuid;
      `, newPassword, userId);
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'user',
          entityId: userId,
          action: 'RESET_PASSWORD',
          summary: `تم إعادة تعيين كلمة المرور للمستخدم (${userId}) بواسطة ${currentUser.fullName}`,
          performedBy: currentUser.id,
        },
      });
    } catch {
      // ignore
    }

    return { success: true, message: 'تم إعادة تعيين كلمة المرور للمستخدم بنجاح' };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل إعادة تعيين كلمة المرور' };
  }
}
