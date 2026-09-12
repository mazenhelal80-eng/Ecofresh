import { createServerClientInstance } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { UserRole, UserProfile } from '@prisma/client';
import { cache } from 'react';
import { can, PermissionAction } from './permissions';

export { can };
export type { PermissionAction };

export type AuthUser = UserProfile & {
  email?: string | null;
};

const cacheFn = typeof cache === 'function' ? cache : (fn: any) => fn;

/**
 * Get currently authenticated user and profile
 */
export const getCurrentUser = cacheFn(async function getCurrentUser(): Promise<AuthUser | null> {
  // Explicit Test / CLI Environment Mocking
  if (process.env.MOCK_AUTH_USER_ID) {
    const profile = await prisma.userProfile.findUnique({
      where: { id: process.env.MOCK_AUTH_USER_ID },
    });
    if (profile && profile.isActive) {
      return {
        ...profile,
        email: 'test@ecofresh.com',
      };
    }
  }

  const isPlaceholderUrl =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  try {
    const supabase = createServerClientInstance();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user && !error) {
      const profile = await prisma.userProfile.findUnique({
        where: { id: user.id },
      });

      if (profile && profile.isActive) {
        return {
          ...profile,
          email: user.email || null,
        };
      }
    }
  } catch (error) {
    // Supabase client failure / SSR context
  }

  return null;
});

/**
 * Reusable server-side helper: require authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: يرجى تسجيل الدخول أولاً للوصول إلى هذا المورد');
  }
  return user;
}

/**
 * Reusable server-side helper: require specific role(s)
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const hasRole = roles.some((r) => {
    if (r === UserRole.OWNER && (user.role === UserRole.OWNER || user.role === UserRole.ADMIN)) return true;
    return user.role === r;
  });

  if (!hasRole) {
    throw new Error(`FORBIDDEN: ليس لديك صلاحية الدور المطلوب (${roles.join(', ')})`);
  }

  return user;
}

/**
 * Reusable server-side helper: require specific permission
 */
export async function requirePermission(action: PermissionAction | string): Promise<AuthUser> {
  const user = await requireAuth();
  if (!can(user.role, action)) {
    throw new Error(`FORBIDDEN: ليس لديك الصلاحية المطلوبة لتنفيذ هذا الإجراء (${action})`);
  }
  return user;
}

/**
 * Reusable helper for Server Component Pages: redirects safely if unauthorized
 */
export async function requirePagePermission(action: PermissionAction | string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  if (!can(user.role, action)) {
    const { redirect } = await import('next/navigation');
    redirect('/dashboard');
  }
  return user;
}

