import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const email = 'admin@ar-jen.com';
    const password = 'admin123';

    // 1. Sign up the new admin user explicitly
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError && authError.message !== 'User already registered') {
      console.error("SignUp error:", authError.message);
    }

    // Try to get user ID
    let userId = authData?.user?.id;
    if (!userId) {
      // If user already existed, sign in to get the ID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError && signInData?.user) {
        userId = signInData.user.id;
      } else {
        return NextResponse.json({ 
          error: "Could not create or retrieve the admin user.", 
          details: signInError?.message || authError?.message 
        }, { status: 400 });
      }
    }

    // 2. Set role to admin in the public.users table
    // (This row should have been created by the trigger if this was a new signup)
    const { error: dbError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (dbError) {
      // In case trigger failed or was missing, try an upsert (though id is a primary key linking to auth.users)
      await supabase.from('users').upsert({ id: userId, email, role: 'admin' });
    }

    return NextResponse.json({
      message: "Secure Admin user successfully verified and activated as 'admin'.",
      username: 'admin@ar-jen',
      email,
      role: 'admin'
    });

  } catch (error) {
    console.error("Setup secure error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
