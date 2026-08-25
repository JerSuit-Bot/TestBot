import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { AdminShell } from './shell';

/**
 * Server-side admin guard. Every /admin page is protected here before the
 * client shell renders - no sensitive UI is ever served to unauthenticated
 * visitors, and the guard cannot be bypassed from the browser.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect('/admin/login');
  }

  return <AdminShell sessionUsername={admin.username ?? 'admin'}>{children}</AdminShell>;
}
