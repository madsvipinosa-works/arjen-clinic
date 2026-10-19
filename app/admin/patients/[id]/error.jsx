'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * error.jsx — Next.js App Router Error Boundary for /admin/patients/[id]
 *
 * Catches unhandled RSC render errors (e.g. TypeErrors during revalidation)
 * and surfaces a clean Magic UI recovery card instead of the white-screen
 * Next.js 500 crash page. Includes a reset() button to retry the render
 * and a directory link for graceful navigation fallback.
 *
 * Per Next.js docs, error boundaries must be Client Components.
 */
export default function PatientDetailError({ error, reset }) {
  useEffect(() => {
    // Log to console so Vercel function logs capture the stack trace
    console.error('[PatientDetailPage] Render error caught by boundary:', error);
  }, [error]);

  return (
    <div className="w-full max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-lg">
        {/* Glassmorphism Error Card */}
        <div className="bg-white/90 backdrop-blur-md border border-red-200/80 shadow-xl shadow-red-500/5 rounded-3xl p-8 text-center space-y-6">
          
          {/* Icon */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/25">
              <AlertTriangle className="w-8 h-8" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Clinical Record Unavailable
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              A server error occurred while loading this patient chart. This is usually transient — please try reloading the record.
            </p>
          </div>

          {/* Error detail (now visible for production diagnostics) */}
          {(error?.message || error?.digest) && (
            <div className="bg-red-50/90 border border-red-200/80 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                  Diagnostic Error Signature
                </p>
                {error?.digest && (
                  <span className="font-mono text-[10px] text-red-500 bg-red-100/70 px-2 py-0.5 rounded-md">
                    Digest: {error.digest}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-red-700 break-all leading-relaxed">
                {error?.message || 'Server-side rendering exception caught.'}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              className="gap-2 rounded-2xl font-bold h-11 px-6 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading Record
            </Button>

            <Button
              asChild
              variant="outline"
              className="gap-2 rounded-2xl font-bold h-11 px-6 border-gray-200 hover:bg-gray-50 text-gray-700 active:scale-[0.98] transition-all duration-200"
            >
              <Link href="/admin/patients">
                <ArrowLeft className="w-4 h-4" />
                Back to Patient Directory
              </Link>
            </Button>
          </div>

          {/* Compliance notice */}
          <p className="text-[10px] text-gray-400 font-medium">
            If this error persists, contact the clinic administrator. Patient data integrity is maintained — no records were lost.
          </p>
        </div>
      </div>
    </div>
  );
}
