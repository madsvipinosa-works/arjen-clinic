// app/admin/settings/page.jsx
// AR-JEN Maternity Clinic: System Settings & Profile
// Strictly restricted to Clinic Administrators with full session authentication.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { canManageSystemSettings } from "@/lib/rbac";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsManager } from "@/components/admin/settings-manager";

export const metadata = {
  title: 'System Settings & Profile | AR-JEN Clinic Admin',
  description: 'Manage clinic identity, administrator security credentials, and view system health.',
};

export default async function SettingsPage() {
  const supabase = await createClient();

  // 1. Authenticate Admin Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // 2. Fetch User Role & Profile from public.users
  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const isAdmin = canManageSystemSettings(userData?.role);

  // 3. Strict RBAC Guard: Restrict non-admins (e.g. staff, nurses)
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-100 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted: Super Administrator Role Required</h2>
          <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
            In compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, 
            modification of clinic settings, official hotline data, and root administrator credentials is strictly reserved for Super Administrators.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/admin">
            <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
              <ArrowLeft className="w-4 h-4" />
              Return to Clinical Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Fetch Clinic Settings (ID: 1)
  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const currentUser = {
    id: user.id,
    email: user.email,
    role: userData?.role || 'admin',
    full_name: userData?.full_name || 'Clinic Administrator',
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <SettingsManager 
        initialSettings={settings || {}} 
        currentUser={currentUser} 
      />
    </div>
  );
}
