// utils/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Validates and sanitizes cookies passed to @supabase/ssr.
 * Protects against malformed, corrupted, or un-prefixed base64 session cookies
 * that cause GoTrueClient to throw "TypeError: Cannot create property 'user' on string".
 */
export function sanitizeSupabaseCookies(cookiesList) {
  if (!Array.isArray(cookiesList)) return [];
  const result = [];
  for (const c of cookiesList) {
    if (!c?.name || !c.name.includes("-auth-token")) {
      result.push(c);
      continue;
    }
    if (typeof c.value !== "string") continue;
    const val = c.value.trim();
    if (!val || val === "undefined" || val === "null") continue;

    // Chunks (e.g. sb-...-auth-token.0, sb-...-auth-token.1) MUST be preserved intact
    // so @supabase/ssr's combineChunks can concatenate them before JSON parsing.
    if (/\.\d+$/.test(c.name)) {
      result.push(c);
      continue;
    }

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
    if (val.startsWith("{") || val.startsWith("[")) {
      try {
        JSON.parse(val);
        result.push(c);
      } catch {
        // Discard corrupted cookie
      }
      continue;
    }
  }
  return result;
}

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * It uses the native next/headers cookies() to securely read and write the auth session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return sanitizeSupabaseCookies(cookieStore.getAll());
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions, but is required to be handled otherwise.
          }
        },
      },
    }
  );
}

