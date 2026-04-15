"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CalendarCheck,
  ClipboardList
} from "lucide-react";

const navigationItems = [
  { id: "dashboard",    name: "My Dashboard",     icon: Home,           href: "/patient" },
  { id: "consultation", name: "Consultation",     icon: MessageSquare,  href: "/patient/consultation" },
  { id: "appointments", name: "My Appointments",   icon: CalendarCheck,  href: "/patient/appointments" },
  { id: "history",      name: "Medical History",  icon: ClipboardList,  href: "/patient/history" },
];

export function PatientSidebar({ className = "", children, user = null, logoutAction = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

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
  
  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const isItemActive = (item) => {
    if (item.href === "/patient") {
      return pathname === "/patient";
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex min-h-screen bg-rose-50/20 w-full font-sans">
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-white shadow-md border border-rose-100 md:hidden hover:bg-rose-50 transition-all duration-200"
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rose-100 bg-rose-50/40">
          {!isCollapsed ? (
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-md shadow-rose-200">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 text-lg tracking-tight">AR-JEN</span>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Patient Portal</span>
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center mx-auto shadow-md shadow-rose-200">
              <span className="text-white font-bold text-lg">A</span>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* User Card */}
        {!isCollapsed && user && (
          <div className="px-5 py-6">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500 font-bold border border-rose-200">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-gray-900 truncate">{user.email.split('@')[0]}</span>
                <span className="text-[10px] font-semibold text-rose-400 uppercase">Patient</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={closeMobileSidebar}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                      active
                        ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                        : "text-gray-600 hover:bg-rose-50 hover:text-gray-900"
                    } ${isCollapsed ? "justify-center px-1" : ""}`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-white" : "text-gray-400 group-hover:text-rose-500"}`} />
                    {!isCollapsed && (
                      <span className={`text-sm tracking-wide ${active ? "font-bold" : "font-medium"}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-rose-100 bg-gray-50/50 p-4">
          <form action={logoutAction}>
            <button
              className={`w-full flex items-center rounded-xl transition-all duration-200 group text-gray-500 hover:bg-red-50 hover:text-red-600 ${
                isCollapsed ? "justify-center px-1 py-3" : "space-x-3 px-3 py-3"
              }`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
              {!isCollapsed && <span className="text-sm font-bold tracking-wide">Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
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
