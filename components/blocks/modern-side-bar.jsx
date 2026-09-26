"use client";

import React, { useState, useEffect } from "react";
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
  Activity
} from "lucide-react";

// Categorized navigation groups aligned with clinic operational workflows
const navigationSections = [
  {
    title: "Clinical Operations",
    items: [
      { id: "dashboard", name: "Dashboard", icon: Home, href: "/admin", exact: true },
      { id: "appointments", name: "Appointments & Queue", icon: ClipboardList, href: "/admin/appointments" },
      { id: "patients", name: "Patients & EMR", icon: Users, href: "/admin/patients" },
      { id: "consultations", name: "Online Consultations", icon: MessageSquare, href: "/admin/consultations" },
      { 
        id: "queue-tv", 
        name: "Lobby TV Display", 
        icon: Tv, 
        href: "/queue", 
        external: true, 
        badge: "Live Screen" 
      },
    ],
  },
  {
    title: "Clinic Management",
    items: [
      { id: "analytics", name: "Analytics & Reports", icon: BarChart3, href: "/admin/analytics" },
      { id: "schedule", name: "Clinic Schedule", icon: CalendarDays, href: "/admin/schedule" },
    ],
  },
  {
    title: "System & Compliance",
    items: [
      { id: "audit-logs", name: "DPA Audit Logs", icon: ScrollText, href: "/admin/audit-logs" },
      { id: "cms", name: "Website Content", icon: LayoutTemplate, href: "/admin/cms" },
      { id: "settings", name: "System Settings", icon: Settings, href: "/admin/settings" },
    ],
  },
];

export function Sidebar({ className = "", children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ cms: false });
  const [searchQuery, setSearchQuery] = useState("");
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

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const toggleSubMenu = (id, e) => {
    e.preventDefault();
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
    if (isCollapsed) {
      setIsCollapsed(false); // Auto expand sidebar if opening a dropdown
    }
  };

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
    if (item.subItems) {
      return item.subItems.some((sub) => pathname.startsWith(sub.href));
    }
    return false;
  };

  return (
    <div className="flex min-h-screen bg-gray-50 w-full">
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-rose-100 md:hidden hover:bg-rose-50 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-rose-600" />
        ) : (
          <Menu className="h-6 w-6 text-rose-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Core */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-rose-100 z-50 transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "w-20" : "w-72"} md:translate-x-0 ${className}`}
      >
        {/* Header with logo and collapse button */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100/80 bg-gradient-to-b from-rose-50/60 to-white/40 backdrop-blur-md">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-md shadow-rose-500/20 ring-2 ring-rose-200/50">
                <span className="text-white font-black text-lg tracking-wider">A</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-gray-900 text-base tracking-tight leading-snug">AR-JEN CLINIC</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Clinical Portal</span>
                </div>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-rose-500/20 ring-2 ring-rose-200/50">
              <span className="text-white font-black text-lg">A</span>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50/80 transition-all duration-200 active:scale-95"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Global Patient Search Bar */}
        {!isCollapsed && (
          <form onSubmit={handleSearchSubmit} className="px-4 py-3 border-b border-gray-100/80">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name..."
                className="w-full pl-8 pr-8 py-2 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 focus:bg-white transition-all duration-200 shadow-xs"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-gray-400 bg-white border border-gray-200 px-1 py-0.2 rounded shadow-2xs pointer-events-none">
                ↵
              </kbd>
            </div>
          </form>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rose-100 space-y-4">
          {navigationSections.map((section, sectionIdx) => (
            <div key={section.title} className="space-y-1">
              {/* Category Header */}
              {!isCollapsed ? (
                <div className="px-3 pt-1 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400/90">
                    {section.title}
                  </span>
                </div>
              ) : (
                sectionIdx > 0 && <div className="my-2 border-t border-rose-100/60" />
              )}

              {/* Items List */}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item);
                  const hasSubItems = !!item.subItems;
                  const isExpanded = expandedMenus[item.id];

                  if (hasSubItems) {
                    return (
                      <li key={item.id}>
                        <button
                          onClick={(e) => toggleSubMenu(item.id, e)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                            isActive || isExpanded
                              ? "bg-rose-50 text-rose-700 font-bold shadow-xs"
                              : "text-gray-600 hover:bg-rose-50/60 hover:text-gray-900"
                          } ${isCollapsed ? "justify-center px-1" : ""}`}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Icon className={`h-4 w-4 flex-shrink-0 ${
                              isActive || isExpanded ? "text-rose-600" : "text-gray-400 group-hover:text-rose-500 transition-colors"
                            }`} />
                            {!isCollapsed && (
                              <span className={`text-xs tracking-wide ${isActive || isExpanded ? "font-bold" : "font-medium"}`}>
                                {item.name}
                              </span>
                            )}
                          </div>
                          {!isCollapsed && (
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-rose-500" : ""
                            }`} />
                          )}
                        </button>
                      </li>
                    );
                  }

                  // Standard or External Navigation Link
                  return (
                    <li key={item.id} className="relative group">
                      <Link
                        href={item.href}
                        onClick={closeMobileSidebar}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.99] ${
                          isActive
                            ? "bg-gradient-to-r from-rose-500 via-rose-600 to-rose-600 text-white shadow-md shadow-rose-500/25 font-bold"
                            : "text-gray-600 hover:bg-rose-50/70 hover:text-rose-700 hover:translate-x-0.5 font-medium"
                        } ${isCollapsed ? "justify-center px-1" : ""}`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            isActive ? "text-white" : "text-gray-400 group-hover:text-rose-500"
                          }`} />

                          {!isCollapsed && (
                            <span className="text-xs tracking-wide truncate">
                              {item.name}
                            </span>
                          )}
                        </div>

                        {/* Badges & Live Screen Pulse Dot */}
                        {!isCollapsed && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {item.external && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                            )}
                            {item.badge && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border ${
                                isActive 
                                  ? "bg-white/20 text-white border-white/30" 
                                  : "bg-rose-100/70 text-rose-700 border-rose-200/80"
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {item.external && (
                              <ExternalLink className={`h-3 w-3 flex-shrink-0 ${
                                isActive ? "text-white/80" : "text-gray-400 group-hover:text-rose-500"
                              }`} />
                            )}
                          </div>
                        )}

                        {/* Tooltip for collapsed state */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-md text-white text-xs font-semibold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className="text-[10px] font-bold text-rose-300">({item.badge})</span>
                            )}
                            {item.external && (
                              <ExternalLink className="h-3 w-3 text-rose-300" />
                            )}
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/95 rotate-45" />
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

        {/* Bottom section with clinician identity and secure logout */}
        <div className="mt-auto border-t border-rose-100/80 bg-gray-50/60 p-3 space-y-2">
          {!isCollapsed && (
            <div className="px-2 py-1 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span>Security</span>
              <span className="text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> DPA 2012
              </span>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('adminSession');
              window.location.href = '/admin/login';
            }}
            className={`w-full flex items-center rounded-xl transition-all duration-200 group text-gray-500 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] ${
              isCollapsed ? "justify-center px-1 py-2.5" : "space-x-3 px-3 py-2.5"
            }`}
            title={isCollapsed ? "Secure Logout" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
            {!isCollapsed && <span className="text-xs font-semibold tracking-wide">Secure Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Administrative Screen Render Area */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out bg-white min-h-screen ${
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
