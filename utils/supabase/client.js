import { createBrowserClient } from '@supabase/ssr'

// Create a single supabase client for the app with safe cookie parsing
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return [];
          const rawCookies = document.cookie ? document.cookie.split('; ') : [];
          return rawCookies.map((c) => {
            const [name, ...rest] = c.split('=');
            let value = rest.join('=');
            if (name && name.includes('-auth-token')) {
              const val = value.trim();
              if (
                !val.startsWith('base64-') &&
                (val.startsWith('Wy') || val.startsWith('ey'))
              ) {
                value = `base64-${val}`;
              }
            }
            return { name, value };
          });
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieStr = `${name}=${value}; path=${options?.path || '/'}`;
            if (options?.maxAge) cookieStr += `; max-age=${options.maxAge}`;
            if (options?.sameSite) cookieStr += `; samesite=${options.sameSite}`;
            document.cookie = cookieStr;
          });
        },
      },
    }
  );
}

// Auth helpers
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await createClient().auth.getUser();
    if (error) return null;
    return user;
  } catch (err) {
    console.warn('[getCurrentUser] Auth error:', err?.message);
    return null;
  }
}

export async function signOut() {
  try {
    await createClient().auth.signOut();
  } catch (err) {
    console.warn('[signOut] Sign out error:', err?.message);
  }
}

