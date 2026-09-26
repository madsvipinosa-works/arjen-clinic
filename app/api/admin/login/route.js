import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Map frontend's "username" (e.g. admin@ar-jen or admin) to the correct email format
    let loginEmail = (username || '').trim();
    const normalized = loginEmail.toLowerCase();
    if (['admin@ar-jen', 'admin', 'admin@arjen', 'admin@ar-jen.com', 'admin@arjen.com'].includes(normalized)) {
      loginEmail = 'admin@ar-jen.com';
    }

    const trimmedPassword = (password || '').trim();

    // 1. Authenticate with Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: trimmedPassword,
    });

    // Fallback: If user enters admin123 or Admin123, try the alternative casing
    if (authError && (trimmedPassword.toLowerCase() === 'admin123')) {
      const fallbackPassword = trimmedPassword === 'admin123' ? 'Admin123' : 'admin123';
      const retry = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: fallbackPassword,
      });
      if (!retry.error && retry.data?.user) {
        authData = retry.data;
        authError = null;
      }
    }

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: `Auth Error: ${authError?.message || 'No User found'}` },
        { status: 401 }
      );
    }

    // 2. Verify Admin Role in public.users
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { 
          error: `Role Verification Failed`, 
          details: userError?.message || 'User lacks admin role or users table not synced.'
        },
        { status: 403 }
      );
    }

    // Return success
    return NextResponse.json({
      admin: {
        username: loginEmail,
        email: loginEmail,
        id: authData.user.id
      },
      message: "Login successful"
    });

  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: `Server crash: ${error.message}` },
      { status: 500 }
    );
  }
}
