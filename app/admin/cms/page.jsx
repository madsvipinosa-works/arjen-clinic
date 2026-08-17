import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CMSManager } from "@/components/admin/cms-manager";

export const metadata = {
  title: "Website CMS - AR-JEN Admin",
};

export default async function CMSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Fetch clinic settings
  const { data: settings } = await supabase
    .from("clinic_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Error: Unable to load clinic settings from database.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Website CMS</h1>
          <p className="text-gray-500 mt-1">
            Manage your public website content, hero photos, services catalog, and branding dynamically.
          </p>
        </div>
      </div>

      <CMSManager initialSettings={settings} />
    </div>
  );
}
