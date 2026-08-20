"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CalendarCheck,
  ClipboardList,
  Heart
} from "lucide-react";

const navigationItems = [
  { id: "dashboard",    name: "My Dashboard",     icon: Home,           href: "/patient" },
  { id: "appointments", name: "My Appointments",  icon: CalendarCheck,  href: "/patient/appointments" },
  { id: "history",      name: "Medical History",  icon: ClipboardList,  href: "/patient/history" },
  { id: "consultation", name: "Consultation",     icon: MessageSquare,  href: "/patient/consultation" },
];

export function PatientSidebar({ className = "", children, user = null, logoutAction = null }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const isItemActive = (item) => {
    if (item.href === "/patient") {
      return pathname === "/patient";
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex min-h-screen bg-background w-full font-sans">
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300 ease-in-out flex-col ${
          isCollapsed ? "w-20" : "w-72"
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border bg-sidebar-accent/20">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sidebar-foreground text-lg tracking-tight">AR-JEN</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Maternity Clinic</span>
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto shadow-md shadow-primary/20">
              <Heart className="w-5 h-5 fill-current" />
            </div>
          )}

          <button
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-primary hover:bg-sidebar-accent transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* User Card */}
        {!isCollapsed && user && (
          <div className="px-5 py-4">
            <div className="p-3.5 bg-sidebar-accent/50 rounded-2xl border border-sidebar-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center border border-primary/20">
                {user.email ? user.email.charAt(0).toUpperCase() : "P"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-sidebar-foreground truncate">{user.email?.split('@')[0]}</span>
                <span className="text-[9px] font-black text-primary uppercase tracking-wider">Patient Account</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                      active
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                    } ${isCollapsed ? "justify-center px-1" : ""}`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-primary"}`} />
                    {!isCollapsed && (
                      <span className="text-xs tracking-wide">
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Logout */}
        <div className="mt-auto border-t border-sidebar-border bg-sidebar-accent/10 p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className={`w-full flex items-center rounded-xl transition-all duration-200 group text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive ${
                isCollapsed ? "justify-center px-1 py-3" : "space-x-3 px-3.5 py-3"
              }`}
            >
              <LogOut className="h-5 w-5 shrink-0 text-sidebar-foreground/50 group-hover:text-destructive transition-colors" />
              {!isCollapsed && <span className="text-xs font-bold tracking-wide">Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area with Desktop Sidebar Offset */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out min-h-screen ${
          isCollapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
