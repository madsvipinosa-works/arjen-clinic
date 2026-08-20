"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  CalendarCheck, 
  ClipboardList, 
  MessageSquare, 
  PhoneCall 
} from "lucide-react";
import { EmergencyContactModal } from "./emergency-dialog";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/patient", icon: Home, exact: true },
    { label: "Bookings", href: "/patient/appointments", icon: CalendarCheck },
    { label: "Emergency", isEmergency: true, icon: PhoneCall },
    { label: "History", href: "/patient/history", icon: ClipboardList },
    { label: "Chat", href: "/patient/consultation", icon: MessageSquare },
  ];

  const isItemActive = (item) => {
    if (item.isEmergency) return false;
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <EmergencyContactModal 
        open={emergencyOpen} 
        onOpenChange={setEmergencyOpen} 
      />

      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around bg-card/95 backdrop-blur-lg border-t border-border px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      >
        {navItems.map((item, idx) => {
          const Icon = item.icon;

          if (item.isEmergency) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setEmergencyOpen(true)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
                aria-label="Emergency Contact & Triage"
              >
                <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95">
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-primary uppercase tracking-tight mt-1">
                  Urgent
                </span>
              </button>
            );
          }

          const active = isItemActive(item);

          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                active 
                  ? "text-primary font-bold" 
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${active ? "bg-primary/10" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${active ? "font-bold text-primary" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
