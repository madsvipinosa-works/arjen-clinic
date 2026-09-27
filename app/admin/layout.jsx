'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from "@/components/ui/whatsapp-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  // If on login page, show children directly (login form)
  if (pathname === '/admin/login') {
    return children;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="p-6 md:p-8 bg-slate-50/50 w-full min-h-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
