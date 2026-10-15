// proxy.js
// ─────────────────────────────────────────────────────────────────────────────
// AR-JEN MATERNITY CLINIC: NEXT.JS EDGE PROXY
// Enforces authentication and clinical staff role authorization across /admin routes.
// Compliant with Philippine Data Privacy Act of 2012 (RA 10173).
// ─────────────────────────────────────────────────────────────────────────────
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { CLINICAL_ROLES } from "@/lib/rbac";

function sanitizeSupabaseCookies(cookiesList) {
  if (!Array.isArray(cookiesList)) return [];
  const result = [];
  for (const c of cookiesList) {
    if (!c?.name || !c.name.includes("-auth-token")) {
      result.push(c);
      continue;
    }
    if (typeof c.value !== "string") continue;
    const val = c.value.trim();

    // 1. If prefixed with base64-, ensure base64 payload parses to valid JSON
    if (val.startsWith("base64-")) {
      try {
        const decoded = Buffer.from(val.substring(7), "base64").toString("utf8");
        JSON.parse(decoded);
        result.push(c);
      } catch {
        // Discard corrupted cookie
      }
      continue;
    }

    // 2. If raw base64 string starting with Wy (array) or ey (object)
    if (val.startsWith("Wy") || val.startsWith("ey")) {
      try {
        const decoded = Buffer.from(val, "base64").toString("utf8");
        JSON.parse(decoded);
        result.push({ ...c, value: `base64-${val}` });
      } catch {
        // Discard corrupted cookie
      }
      continue;
    }

    // 3. If raw JSON string
    try {
      JSON.parse(val);
      result.push(c);
    } catch {
      // Discard corrupted cookie
    }
  }
  return result;
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Only intercept /admin routes (skip /admin/login, static files, and public APIs)
  if (
    !pathname.startsWith('/admin') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return sanitizeSupabaseCookies(request.cookies.getAll());
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // No valid session, redirect to admin login
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    // 2. Strict RBAC Guard: Verify user has a staff clinical role (prevent patients from browsing /admin)
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (userData?.role || user?.app_metadata?.role || user?.user_metadata?.role || "").toLowerCase();

    if (!role || !CLINICAL_ROLES.includes(role)) {
      // Authenticated user is a patient or unauthorized role
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'Access Restricted: Clinic staff credentials required');
      return NextResponse.redirect(url);
    }

  } catch (err) {
    console.error("[middleware] Auth check caught exception:", err?.message);
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};

export { proxy as middleware };

