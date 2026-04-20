import { createBrowserClient } from '@supabase/ssr'

// Create a single supabase client for the app
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Auth helpers
export async function getCurrentUser() {
  const { data: { user } } = await createClient().auth.getUser()
  return user
}

export async function signOut() {
  await createClient().auth.signOut()
}
