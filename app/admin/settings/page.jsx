import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Info, Building2, Save, Shield, Key, Eye, EyeOff } from "lucide-react";
import { ServiceManager } from "@/components/forms/service-manager";
import { updateSettings, updateServices, updateAdminCredentials } from "../../actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    { data: settings },
    { data: adminCreds }
  ] = await Promise.all([
    supabase
      .from("clinic_settings")
      .select("*")
      .eq("id", 1)
      .single(),
    supabase
      .from("admin_credentials")
      .select("username, email, updated_at")
      .eq("username", "admin")
      .single()
  ]);

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-gray-500 mt-2 font-medium">Manage clinic profile, services, and core system configurations.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 items-start">
        {/* Clinic Profile Section */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
          <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-100 bg-rose-50/40">
            <div className="p-2.5 bg-rose-500 rounded-2xl shadow-lg shadow-rose-100">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-xl tracking-tight">Clinic Profile</h2>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Public Information</p>
            </div>
          </div>

          <form action={updateSettings} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clinic_name" className="text-sm font-black text-gray-700 uppercase tracking-widest">Clinic Name</Label>
                <Input 
                  id="clinic_name" 
                  name="clinic_name" 
                  defaultValue={settings?.clinic_name} 
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_address" className="text-sm font-black text-gray-700 uppercase tracking-widest">Address</Label>
                <Input 
                  id="clinic_address" 
                  name="clinic_address" 
                  defaultValue={settings?.clinic_address} 
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_contact" className="text-sm font-black text-gray-700 uppercase tracking-widest">Contact Number</Label>
                <Input 
                  id="clinic_contact" 
                  name="clinic_contact" 
                  defaultValue={settings?.clinic_contact} 
                  className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 font-black text-lg gap-3 shadow-lg shadow-rose-100 transition-all active:scale-95">
              <Save className="w-5 h-5" />
              Update Profile
            </Button>
          </form>
        </div>

        {/* Services Manager Section */}
        <ServiceManager 
          initialServices={settings?.services} 
          updateServices={updateServices} 
        />
      </div>

      {/* Admin Credentials Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
        <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-100 bg-rose-50/40">
          <div className="p-2.5 bg-rose-500 rounded-2xl shadow-lg shadow-rose-100">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-xl tracking-tight">Admin Credentials</h2>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Security Settings</p>
          </div>
        </div>

        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 uppercase tracking-wider">Current Credentials</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm font-semibold text-gray-600">Username:</span>
                  <span className="font-mono text-gray-900">{adminCreds?.username || 'admin'}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm font-semibold text-gray-600">Email:</span>
                  <span className="font-mono text-gray-900">{adminCreds?.email || 'admin@arjen-clinic.com'}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm font-semibold text-gray-600">Last Updated:</span>
                  <span className="font-mono text-gray-900">
                    {adminCreds?.updated_at ? new Date(adminCreds.updated_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 uppercase tracking-wider">Update Credentials</h3>
              <form action={updateAdminCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_username" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    New Username
                  </Label>
                  <Input 
                    id="new_username" 
                    name="new_username" 
                    placeholder="Leave blank to keep current"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_email" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    New Email
                  </Label>
                  <Input 
                    id="new_email" 
                    name="new_email" 
                    type="email"
                    placeholder="Leave blank to keep current"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    New Password
                  </Label>
                  <Input 
                    id="new_password" 
                    name="new_password" 
                    type="password"
                    placeholder="Leave blank to keep current"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Confirm New Password
                  </Label>
                  <Input 
                    id="confirm_password" 
                    name="confirm_password" 
                    type="password"
                    placeholder="Re-enter new password"
                    className="h-12 rounded-2xl border-gray-200 focus:ring-rose-500 font-bold text-gray-800"
                  />
                </div>

                <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 font-black text-lg gap-3 shadow-lg shadow-rose-100 transition-all active:scale-95">
                  <Key className="w-5 h-5" />
                  Update Credentials
                </Button>
              </form>
            </div>
          </div>

          <Alert className="rounded-2xl border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800 font-medium">
              <strong>Security Notice:</strong> After updating credentials, you will need to log in again with the new details. 
              Make sure to remember your new username and password.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex items-start gap-6">
        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-black text-emerald-900 text-xl tracking-tight mb-2 uppercase tracking-widest">Administrator Notice</h3>
          <p className="text-emerald-800 font-medium leading-relaxed max-w-3xl">
            Changes made here will be reflected immediately on the public booking pages and patient dashboard. 
            Removing a service will prevent new patients from selecting it, but will not delete existing appointments.
            Admin credential changes require immediate re-login for security.
          </p>
        </div>
      </div>
    </div>
  );
}
