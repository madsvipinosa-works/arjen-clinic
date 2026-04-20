'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

export function AdminAuthGuard({ children }) {
  const router = useRouter();

  useEffect(() => {
    // Check for admin session
    const session = localStorage.getItem('adminSession');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(session);
      // Check if session is still valid (24 hours)
      if (Date.now() - parsedSession.loginTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('adminSession');
        router.push('/admin/login');
        return;
      }
    } catch (error) {
      localStorage.removeItem('adminSession');
      router.push('/admin/login');
      return;
    }
  }, [router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-medium">Verifying admin access...</span>
        </div>
      </div>
    </div>
  );
}
