import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if admin credentials table exists, if not create it
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.admin_credentials (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          username text NOT NULL UNIQUE,
          password_hash text NOT NULL,
          email text,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Disable RLS for admin credentials
        ALTER TABLE public.admin_credentials DISABLE ROW LEVEL SECURITY;
      `
    });

    // Insert or update admin credentials
    const { data, error } = await supabase
      .from("admin_credentials")
      .upsert({
        username: username,
        email: email,
        password_hash: password, // For now, store as plain text (in production, use bcrypt)
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'username'
      });

    if (error) {
      console.error("Admin setup error:", error);
      return NextResponse.json(
        { error: "Failed to create admin account" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      admin: {
        username: username,
        email: email
      }
    });

  } catch (error) {
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
