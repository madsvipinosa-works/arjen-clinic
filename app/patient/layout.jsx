import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, PhoneCall, LogOut } from "lucide-react";
import { PatientSidebar } from "@/components/blocks/patient-side-bar";
import { MobileBottomNav } from "@/components/patient/mobile-bottom-nav";
import { logout } from "../(auth)/actions";

export default async function PatientLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PatientSidebar user={user} logoutAction={logout}>
      {/* Mobile Top Header (Visible on small screens only) */}
      <header className="sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
        <Link href="/patient" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="font-black text-foreground text-sm tracking-tight">AR-JEN</span>
            <span className="text-[9px] font-bold text-primary block leading-none">Maternity</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <form action={logout}>
            <button 
              type="submit" 
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 md:p-10 w-full min-h-screen pb-28 md:pb-12 max-w-7xl mx-auto">
        {children}
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on small screens only) */}
      <MobileBottomNav />
    </PatientSidebar>
  );
}
