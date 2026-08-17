"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
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
  Activity
} from "lucide-react";

// The unified navigational array map
const navigationItems = [
  { id: "dashboard", name: "Dashboard", icon: Home, href: "/admin" },
  { id: "appointments", name: "Appointments", icon: ClipboardList, href: "/admin/appointments" },
  { id: "schedule", name: "Clinic Schedule", icon: CalendarDays, href: "/admin/schedule" },
  { id: "patients", name: "Patients", icon: User, href: "/admin/patients" },
  { id: "cms", name: "Website Content", icon: LayoutTemplate, href: "/admin/cms" },
  { id: "settings", name: "System Settings", icon: Settings, href: "/admin/settings" },
];

export function Sidebar({ className = "", children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ cms: false });
  const pathname = usePathname();

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
      setIsCollapsed(false); // Auto expand sidebar if trying to open a dropdown
    }
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };

  // Determine if a parent item is active based on children
  const isItemActive = (item) => {
    if (item.href && item.href === "/admin") {
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
        className={`fixed top-0 left-0 h-full bg-white border-r border-rose-100 z-50 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "w-20" : "w-72"} md:translate-x-0 ${className}`}
      >
        {/* Header with logo and collapse button */}
        <div className="flex items-center justify-between p-5 border-b border-rose-100 bg-rose-50/40">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-200">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 text-lg tracking-tight">AR-JEN</span>
                <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Admin Portal</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center mx-auto shadow-md shadow-rose-200">
              <span className="text-white font-bold text-lg">A</span>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-5 py-4">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
              <input
                type="text"
                placeholder="Search database..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>
        )}

        {/* Navigation Wrapper */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rose-100">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              const hasSubItems = !!item.subItems;
              const isExpanded = expandedMenus[item.id];

              return (
                <li key={item.id}>
                  {hasSubItems ? (
                    // Parent Item Dropdown
                    <div>
                      <button
                        onClick={(e) => toggleSubMenu(item.id, e)}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${isActive || isExpanded
                            ? "bg-rose-50 text-rose-700"
                            : "text-gray-600 hover:bg-rose-50/50 hover:text-gray-900"
                          } ${isCollapsed ? "justify-center px-1" : ""}`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Icon className={`h-5 w-5 flex-shrink-0 ${isActive || isExpanded ? "text-rose-600" : "text-gray-400 group-hover:text-rose-500 transition-colors"}`} />
                          {!isCollapsed && (
                            <span className={`text-sm tracking-wide ${isActive || isExpanded ? "font-semibold" : "font-medium"}`}>
                              {item.name}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-rose-500" : ""}`} />
                        )}
                      </button>

                      {/* Sub-items Render */}
                      {isExpanded && !isCollapsed && (
                        <ul className="mt-1 ml-4 pl-4 border-l-2 border-rose-100 space-y-1">
                          {item.subItems.map(sub => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <li key={sub.id}>
                                <Link
                                  href={sub.href}
                                  onClick={closeMobileSidebar}
                                  className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${isSubActive
                                      ? "text-rose-700 bg-rose-50 font-bold"
                                      : "text-gray-500 font-medium hover:text-rose-600 hover:bg-rose-50/50"
                                    }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isSubActive ? "bg-rose-500" : "bg-transparent"}`} />
                                  {sub.name}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    // Standard routing Item
                    <Link
                      href={item.href}
                      onClick={closeMobileSidebar}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                          ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                          : "text-gray-600 hover:bg-rose-50 hover:text-gray-900"
                        } ${isCollapsed ? "justify-center px-1" : ""}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-rose-500"}`} />

                      {!isCollapsed && (
                        <span className={`text-sm tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>
                          {item.name}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                          {item.name}
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section with profile and logout */}
        <div className="mt-auto border-t border-rose-100 bg-gray-50/50 pt-2 pb-4">
          <div className="p-3">
            <button
              onClick={() => {
                localStorage.removeItem('adminSession');
                window.location.href = '/admin/login';
              }}
              className={`w-full flex items-center rounded-xl transition-all duration-200 group text-gray-500 hover:bg-red-50 hover:text-red-600 ${isCollapsed ? "justify-center px-1 py-3" : "space-x-3 px-3 py-3"}`}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
              {!isCollapsed && <span className="text-sm font-medium tracking-wide">Secure Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Screen Render Area */}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out bg-white min-h-screen ${isCollapsed ? "md:ml-20" : "md:ml-72"
          }`}
      >
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
