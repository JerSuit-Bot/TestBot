import { cookies } from 'next/headers';
import { validateSession, validateAdminSession, type SessionUser, type AdminSession } from './services';
import { SESSION_COOKIE, ADMIN_COOKIE } from './constants';
import { AuthError } from './errors';

export type { SessionUser, AdminSession };

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSession(token);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return validateAdminSession(token);
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('You must be logged in to access this.');
  return user;
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) throw new AuthError('Admin access required.');
  return admin;
}
