import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * /auth/callback — Supabase PKCE OAuth callback handler.
 *
 * PRODUCTION BUG FIX (Oct 2026):
 * On Vercel, `x-forwarded-host` is sometimes set to the internal function
 * instance identifier (e.g. "sin1::56wtr-17924...") rather than the actual
 * user-facing domain. This caused 404 DEPLOYMENT_NOT_FOUND after Gmail login.
 *
 * Fix: use NEXT_PUBLIC_SITE_URL (the canonical production URL) as the
 * authoritative redirect base in production, falling back to origin only if
 * NEXT_PUBLIC_SITE_URL is not configured.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/patient';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        // Local dev: no load balancer, origin is always correct
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Production: prefer the canonical site URL to avoid Vercel's
      // internal x-forwarded-host being used as the redirect base.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
      if (siteUrl) {
        return NextResponse.redirect(`${siteUrl}${next}`);
      }

      // Fallback: x-forwarded-host is the original user-facing host
      // before the Vercel load balancer. Only use if NEXT_PUBLIC_SITE_URL
      // is not set and the host looks like a real domain (not an internal ID).
      const forwardedHost = request.headers.get('x-forwarded-host');
      if (forwardedHost && !forwardedHost.includes('::')) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || origin;
  return NextResponse.redirect(`${baseUrl}/login?error=Authentication+failed`);
}
