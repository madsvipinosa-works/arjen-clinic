// app/admin/audit-logs/page.jsx
// AR-JEN Maternity Clinic: DPA 2012 Compliance Audit Trail.
// Strictly restricted to Clinic Administrators (RA 10173 compliance).

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuditLogsViewer } from '@/components/admin/audit-logs-viewer';

export const metadata = {
  title: 'DPA Audit Logs | AR-JEN Clinic Admin',
  description: 'Immutable medical audit trail and PHI access surveillance log complying with RA 10173.',
};

export default async function AuditLogsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // Fetch current user's role from public.users
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = userData?.role === 'admin';

  // Access Guard: Strictly restricted to Clinic Administrators
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-100 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted: Administrator Role Required</h2>
          <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
            In compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, 
            access to the immutable medical surveillance audit trail is strictly limited to authorized Clinic Administrators.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/admin">
            <Button variant="outline" className="rounded-xl text-xs font-bold gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch audit logs
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AuditLogsViewer logs={logs || []} currentUserRole={userData?.role} />
    </div>
  );
}
