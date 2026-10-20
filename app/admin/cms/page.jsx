import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CMSManager } from "@/components/admin/cms-manager";
import { requireStaffSession } from "@/lib/rbac-server";
import { canManageSystemSettings } from "@/lib/rbac";
import { Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Website CMS - AR-JEN Admin",
};

export default async function CMSPage() {
  await requireStaffSession(canManageSystemSettings);
  const supabase = await createClient();

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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Elevated CMS Header with Status Pill and Live Preview CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200/60 rounded-full mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
              Content Management &amp; Branding Studio
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Website CMS</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Manage your public website content, hero photos, services catalog, and branding dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            asChild
            variant="outline"
            className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-bold text-xs h-10 px-4 gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Link href="/" target="_blank" rel="noreferrer">
              <Globe className="w-4 h-4 text-rose-500" />
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </Button>
        </div>
      </div>

      <CMSManager initialSettings={settings} />
    </div>
  );
}
