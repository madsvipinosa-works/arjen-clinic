'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from "@/components/blocks/modern-side-bar";

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  // If on login page, show children directly (login form)
  if (pathname === '/admin/login') {
    return children;
  }

  return (
    <Sidebar>
      <div className="p-6 md:p-8 bg-white/50 w-full min-h-full">
        {children}
      </div>
    </Sidebar>
  );
}

