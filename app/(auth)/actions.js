"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Logs out the current user.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Logs in a user using email and password.
 * 
 * @param {FormData} formData - The form data containing email and password
 */
export async function login(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    // In a real application, you might want to return an action state 
    // with validation errors rather than throwing or redirecting silently.
    redirect("/login?error=Email and password are required");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Basic error handling - redirect back to login with the actual error message
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Tell Next.js cache to update the root layout so the user sees they are logged in
  revalidatePath("/", "layout");
  
  // Navigate the user to the booking form per instructions
  redirect("/book");
}

/**
 * Registers a new user using email and password.
 * 
 * @param {FormData} formData - The form data containing email and password
 */
export async function signup(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const firstName = formData.get("first-name");
  const lastName = formData.get("last-name");
  const fullName = `${firstName} ${lastName}`.trim();

  if (!email || !password) {
    redirect("/register?error=Email and password are required");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // Redirect to login page on successful registration
  revalidatePath("/", "layout");
  redirect("/login?success=Account created! You can now log in.");
}

/**
 * Creates a new appointment.
 * 
 * @param {FormData} formData
 */
export async function createAppointment(formData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const service_type = formData.get("service_type");
  const appointment_date = formData.get("appointment_date");
  const time = formData.get("time");
  const notes = formData.get("notes");

  if (!service_type || !appointment_date) {
    redirect("/book?error=Service type and appointment date are required");
  }

  // CRITICAL FOREIGN KEY FIX: Ensure patient profile exists first
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Patient';
  const { error: profileError } = await supabase.from('patients').upsert({ 
    id: user.id, 
    full_name: displayName 
  });

  if (profileError) {
    redirect(`/book?error=${encodeURIComponent(profileError.message)}`);
  }

  // Save the appointment with augmented payloads
  const { error } = await supabase.from('appointments').insert({ 
    patient_id: user.id, 
    service_type, 
    appointment_date,
    time_preference: time,
    notes: notes
  });

  if (error) {
    redirect(`/book?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/book?success=true");
}
