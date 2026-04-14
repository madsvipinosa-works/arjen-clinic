// app/admin/layout.jsx
// This is the shared layout for all /admin/* pages.
// The sidebar is shown on the left; the page content renders in <main>.

import Link from 'next/link';

// Navigation items for the sidebar
const navItems = [
  { label: 'Dashboard',  href: '/admin' },
  { label: 'Patients',   href: '/admin/patients' },
  { label: 'Visit Logs', href: '/admin/visit-logs' },
  { label: 'Settings',   href: '/admin/settings' },
];

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Clinic brand / logo */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-emerald-700 leading-tight">
            AR-JEN Clinic
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Portal</p>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-600
                         hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer / logged-in user hint */}
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">AR-JEN Clinic System v1.0</p>
        </div>
      </aside>

      {/* ─── Main content area ───────────────────────────────── */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
