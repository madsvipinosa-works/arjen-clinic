"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  ClipboardList,
  Search,
  LayoutTemplate,
  BarChart3,
  ScrollText,
  MessageSquare,
  Tv,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  HeartPulse,
  Baby,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// Categorized clinical navigation groups (Strictly in-scope clinical workflow)
const navigationSections = [
  {
    title: "Clinical Operations",
    badge: "Core EMR",
    items: [
      { id: "dashboard", name: "Dashboard & Triage", icon: Home, href: "/admin", exact: true },
      { id: "appointments", name: "Appointments & Queue", icon: ClipboardList, href: "/admin/appointments" },
      { id: "patients", name: "Patient Directory", icon: Users, href: "/admin/patients" },
      { id: "consultations", name: "Online Consultations", icon: MessageSquare, href: "/admin/consultations" },
    ],
  },
  {
    title: "Clinic Management",
    badge: "Operations",
    items: [
      { id: "schedule", name: "Clinic Schedule", icon: CalendarDays, href: "/admin/schedule" },
      { id: "cms", name: "Website Content", icon: LayoutTemplate, href: "/admin/cms" },
    ],
  },
  {
    title: "System & Compliance",
    badge: "Security",
    items: [
      { id: "analytics", name: "Clinical Analytics", icon: BarChart3, href: "/admin/analytics" },
      { id: "audit-logs", name: "DPA Audit Logs", icon: ShieldAlert, href: "/admin/audit-logs", badge: "RA 10173" },
      { id: "settings", name: "System Settings", icon: Settings, href: "/admin/settings" },
    ],
  },
];

export function Sidebar({ className = "", children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ cms: false });
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      setIsOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Global ⌘K / Ctrl+K keyboard shortcut to focus patient search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isCollapsed) setIsCollapsed(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/patients?search=${encodeURIComponent(searchQuery.trim())}`);
      closeMobileSidebar();
    }
  };

  // Determine if a parent item is active based on path
  const isItemActive = (item) => {
    if (item.external) return false;
    if (item.exact || item.href === "/admin") {
      return pathname === "/admin";
    }
    if (item.href && pathname.startsWith(item.href)) return true;
    return false;
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 w-full font-sans antialiased text-slate-900">
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md shadow-md border border-rose-200/80 md:hidden hover:bg-rose-50 transition-all duration-200 active:scale-95"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-rose-600" />
        ) : (
          <Menu className="h-5 w-5 text-rose-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* ── Modern Floating Glassmorphic Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out flex flex-col select-none",
          "bg-white/90 backdrop-blur-xl border-r border-slate-200/80 shadow-[4px_0_24px_-4px_rgba(244,63,94,0.06)]",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-72",
          "md:translate-x-0",
          className
        )}
      >
        {/* Top Header: Brand Crest & Collapse Button */}
        <div className="p-4 border-b border-slate-200/70 bg-gradient-to-b from-rose-50/50 via-white/80 to-white/95">
          <div className="flex items-center justify-between gap-2">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 min-w-0">
                {/* Brand Squircle Logo */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-200/60 shrink-0">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm tracking-tight leading-none truncate">
                      AR-JEN CLINIC
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700">
                      EMR
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    Maternity &amp; Lying-in Care
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 flex items-center justify-center mx-auto text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-200/60 shrink-0">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Desktop collapse button */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Live Clinical Status Pill */}
          {!isCollapsed && (
            <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Live Clinical Portal
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-400">
                24/7 Triage Ready
              </span>
            </div>
          )}
        </div>

        {/* Global Patient Search Bar with ⌘K Spotlight */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-2 border-b border-slate-200/60">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick search patient..."
                  className="w-full pl-8 pr-11 py-2 bg-slate-100/70 border border-slate-200/70 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 focus:bg-white transition-all duration-200 shadow-2xs"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1 py-0.2 rounded shadow-2xs pointer-events-none">
                  ⌘K
                </kbd>
              </div>
            </form>
          </div>
        )}

        {/* ── Navigation Sections (Elevated Dock Style) ── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-5 scrollbar-thin scrollbar-thumb-rose-100">
          {navigationSections.map((section, sectionIdx) => (
            <div key={section.title} className="space-y-1">
              {/* Category Header */}
              {!isCollapsed ? (
                <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {section.title}
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">
                    {section.badge}
                  </span>
                </div>
              ) : (
                sectionIdx > 0 && <div className="my-2 border-t border-slate-200/60" />
              )}

              {/* Items List */}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item);

                  return (
                    <li key={item.id} className="relative group">
                      <Link
                        href={item.href}
                        onClick={closeMobileSidebar}
                        className={cn(
                          "relative w-full flex items-center justify-between px-2.5 py-2 rounded-2xl transition-all duration-200 active:scale-[0.98]",
                          isActive
                            ? "bg-white text-rose-950 font-bold border border-rose-200/80 shadow-xs shadow-rose-500/5"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-semibold",
                          isCollapsed && "justify-center px-1"
                        )}
                      >
                        {/* Active Left Indicator Bar */}
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-rose-600" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Elevated Icon Container */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0",
                              isActive
                                ? "bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-xs shadow-rose-600/30 ring-2 ring-rose-200/50"
                                : "bg-slate-100/80 text-slate-500 group-hover:bg-rose-50 group-hover:text-rose-600"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                          </div>

                          {!isCollapsed && (
                            <span className="text-xs tracking-tight truncate">
                              {item.name}
                            </span>
                          )}
                        </div>

                        {/* Badges / Active Right Dot */}
                        {!isCollapsed && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {isActive ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 ring-2 ring-rose-200/80" />
                            ) : item.badge ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border bg-rose-50 text-rose-700 border-rose-200/80">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                        )}

                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className="text-[10px] font-bold text-rose-300">
                                ({item.badge})
                              </span>
                            )}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900/95 rotate-45" />
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Waiting Lobby TV Display Bento Launcher ── */}
        {!isCollapsed ? (
          <div className="px-3 pt-1 pb-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/[0.04] via-white to-rose-500/[0.08] border border-rose-200/80 shadow-xs relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-rose-400/15 rounded-full blur-xl pointer-events-none group-hover:bg-rose-400/25 transition-colors" />

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-rose-600" />
                  Lobby TV Display
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-tight mb-3">
                Live Patient Queue &amp; Health Reminders Screen
              </p>

              <a
                href="/queue"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-xs shadow-sm shadow-rose-500/25 transition-all duration-200 active:scale-95 group/btn"
              >
                <span>Launch TV Screen</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/90 group-hover/btn:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2 flex justify-center">
            <a
              href="/queue"
              target="_blank"
              rel="noopener noreferrer"
              title="Launch Waiting Lobby TV Display (/queue)"
              className="relative p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/80 transition-all duration-200 group flex items-center justify-center shadow-2xs"
            >
              <Tv className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </a>
          </div>
        )}

        {/* ── Staff Profile Footer & Quick Logout ── */}
        <div className="mt-auto border-t border-slate-200/70 bg-white/95 p-3">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 border border-rose-200 flex items-center justify-center text-white font-black text-xs shadow-2xs">
                    RM
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">Clinical Staff</p>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block truncate">
                    Registered Midwife
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem('adminSession');
                  window.location.href = '/admin/login';
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 border border-rose-200 flex items-center justify-center text-white font-black text-xs">
                  RM
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('adminSession');
                  window.location.href = '/admin/login';
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Administrative Screen Render Area */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out bg-transparent min-h-screen",
          isCollapsed ? "md:ml-20" : "md:ml-72"
        )}
      >
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
