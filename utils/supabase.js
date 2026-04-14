// utils/supabase.js
// This file creates a single, reusable Supabase client for the entire app.
// Think of it like a "database connection" object we import wherever we need it.

import { createClient } from '@supabase/supabase-js';

// These values come from .env.local (never commit that file to git!).
// NEXT_PUBLIC_ prefix means Next.js will expose them to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createClient() returns an object we can use to query our database.
// We export it so any file can do: import supabase from '@/utils/supabase'
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
