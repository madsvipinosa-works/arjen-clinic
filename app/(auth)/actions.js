"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/utils/email";
import { isSlotExpired } from "@/lib/utils";

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
    redirect("/login?error=Email and password are required");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/book");
}

/**
 * Requests a password reset link sent directly to the patient's email.
 * Uses NodeMailer Gmail engine with admin-generated recovery link.
 * 
 * @param {FormData} formData
 */
export async function requestPasswordReset(formData) {
  const email = formData.get("email")?.toString().trim();

  if (!email) {
    redirect("/forgot-password?error=Please provide a valid email address");
  }

  let resetUrl = null;

  // 1. Attempt admin generateLink for zero rate-limiting and custom NodeMailer delivery
  try {
    const adminClient = createAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      },
    });

    if (!linkError && linkData?.properties?.action_link) {
      resetUrl = linkData.properties.action_link;
    } else if (linkError && linkError.message.toLowerCase().includes("not found")) {
      // Do not reveal user existence for security, redirect to success screen
      redirect("/forgot-password?success=true");
    }
  } catch (err) {
    console.warn("[Password Reset] Admin generateLink error, falling back:", err.message);
  }

  // 2. Fallback to standard Supabase resetPasswordForEmail if admin client was unavailable
  if (!resetUrl) {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      console.error("[Password Reset Error]", resetError.message);
      if (resetError.message.toLowerCase().includes("rate limit")) {
        redirect(`/forgot-password?error=${encodeURIComponent(resetError.message)}`);
      }
    }
    redirect("/forgot-password?success=true");
  }

  // 3. Dispatch branded recovery email via free NodeMailer Gmail engine
  await sendEmail({
    to: email,
    subject: "Reset Your Password — AR-JEN Maternity Clinic",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #e11d48; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AR-JEN Maternity Clinic</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Patient Portal Account Recovery</p>
        </div>
        <div style="background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #9f1239; margin: 0 0 8px 0; font-size: 16px;">Password Reset Request</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
            We received a request to reset the password for your AR-JEN Clinic patient account associated with <strong>${email}</strong>.
          </p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
          Click the button below to choose a new password. This recovery link is valid for 1 hour:
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="background-color: #e11d48; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 9999px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
            Reset My Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If you did not request this password reset, you can safely ignore this email. Your account credentials will remain unchanged.
        </p>
      </div>
    `,
  });

  redirect("/forgot-password?success=true");
}

/**
 * Updates a user's password once authenticated through recovery link.
 * 
 * @param {FormData} formData
 */
export async function updatePassword(formData) {
  const supabase = await createClient();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirm_password")?.toString();

  if (!password || password.length < 6) {
    redirect("/reset-password?error=Password must be at least 6 characters");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=Passwords do not match");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?success=Password updated successfully! Please log in with your new password.");
}

/**
 * Registers a new user without requiring pre-booking email verification.
 * Automatically confirms the user and signs them in so they can immediately book.
 * 
 * @param {FormData} formData - The form data containing email, password, and name
 */
export async function signup(formData) {
  const supabase = await createClient();

  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const firstName = formData.get("first-name")?.toString().trim();
  const lastName = formData.get("last-name")?.toString().trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (!email || !password) {
    redirect("/register?error=Email and password are required");
  }

  if (password.length < 6) {
    redirect("/register?error=Password must be at least 6 characters");
  }

  // Pre-confirm user account so booking is not blocked by email verification gates
  let created = false;
  try {
    const adminClient = createAdminClient();
    const { error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (!adminError) {
      created = true;
    } else if (adminError.message.includes("already registered") || adminError.message.includes("already exists")) {
      redirect("/register?error=An account with this email already exists. Please log in.");
    }
  } catch (err) {
    console.warn("[Signup] Admin pre-confirm fallback to signUp:", err.message);
  }

  if (!created) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      redirect(`/register?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Automatically sign in the user to take them directly to the appointment wizard
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  revalidatePath("/", "layout");

  if (!signInError) {
    redirect("/book");
  } else {
    redirect("/login?success=Account created! Please sign in to book your appointment.");
  }
}

/**
 * Creates a new appointment and sends the official booking confirmation email.
 * Confirmation of email occurs strictly after appointment booking.
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

  if (!time) {
    redirect("/book?error=Please select an appointment time window");
  }

  // Reject bookings for dates or slots that have already passed in Philippine Standard Time
  if (isSlotExpired(time, appointment_date)) {
    redirect("/book?error=The selected appointment time slot has already passed. Please select an upcoming date and time.");
  }

  // Capacity Check
  const { data: slotRecord } = await supabase
    .from('time_slots')
    .select('max_capacity')
    .eq('label', time)
    .single();

  const { data: settings } = await supabase
    .from('clinic_settings')
    .select('max_morning_slots, max_afternoon_slots, clinic_address, clinic_contact')
    .eq('id', 1)
    .single();

  const maxSlots = slotRecord?.max_capacity 
    ?? (time === 'AM' ? (settings?.max_morning_slots || 10) : (settings?.max_afternoon_slots || 10));
  
  const { count, error: countError } = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('appointment_date', appointment_date)
    .eq('time_preference', time)
    .neq('status', 'Cancelled');
    
  if (countError) {
    redirect(`/book?error=${encodeURIComponent(countError.message)}`);
  }
  
  if (count >= maxSlots) {
    redirect(`/book?error=The ${time} window on this date is fully booked. Please choose another date or time.`);
  }

  // Handle Patient Identity
  let patientId = formData.get("patient_id");
  let patientName = formData.get("patient_name");

  if (!patientId) {
    if (patientName) {
      // Create new dependent patient
      const { data: newPatient, error: createError } = await supabase.from('patients').insert({
        account_id: user.id,
        full_name: patientName
      }).select('id').single();
      
      if (createError) redirect(`/book?error=${encodeURIComponent(createError.message)}`);
      patientId = newPatient.id;
    } else {
      // Fallback: see if they have an existing profile, or create a default one
      const { data: existingPatient } = await supabase.from('patients')
        .select('id').eq('account_id', user.id).limit(1).single();
      
      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Patient';
        const { data: defaultPatient, error: profileError } = await supabase.from('patients').insert({ 
          account_id: user.id, 
          full_name: displayName 
        }).select('id').single();
        
        if (profileError) redirect(`/book?error=${encodeURIComponent(profileError.message)}`);
        patientId = defaultPatient.id;
      }
    }
  }

  // Sprint 2: Smart Triage Auto-Approval Engine
  let initialStatus = 'Pending';
  
  // 1. Fetch patient risk profile & attendance history
  const { data: patientData } = await supabase
    .from('patients')
    .select('full_name, is_high_risk, appointments(status)')
    .eq('id', patientId)
    .single();

  if (patientData) {
    const isHighRisk = patientData.is_high_risk === true;
    const hasNoShows = patientData.appointments?.some(a => a.status === 'No-Show');
    const isRoutine = service_type?.toLowerCase().includes('prenatal') || 
                      service_type?.toLowerCase().includes('routine') || 
                      service_type?.toLowerCase().includes('consult');

    // 2. Auto-approve routine, low-risk bookings
    if (!isHighRisk && !hasNoShows && isRoutine) {
      initialStatus = 'Approved';
      console.log(`[Auto-Approval] Appointment for Patient ${patientId} instantly approved.`);
    }
  }

  // Save the appointment
  const { error } = await supabase.from('appointments').insert({ 
    patient_id: patientId, 
    service_type, 
    appointment_date,
    time_preference: time,
    notes: notes,
    status: initialStatus
  });

  if (error) {
    redirect(`/book?error=${encodeURIComponent(error.message)}`);
  }

  // 3. Strict Mandate: Email confirmation dispatched ONLY after booking of appointment
  if (user.email) {
    const isAutoApproved = initialStatus === 'Approved';
    const patientDisplayName = patientName || patientData?.full_name || user.user_metadata?.full_name || 'Patient';
    const clinicAddress = settings?.clinic_address || "Dasmariñas City, Cavite";
    const clinicContact = settings?.clinic_contact || "0912-345-6789";

    await sendEmail({
      to: user.email,
      subject: isAutoApproved 
        ? `Appointment Confirmed: ${service_type} on ${appointment_date} — AR-JEN Clinic`
        : `Appointment Request Received: ${service_type} on ${appointment_date} — AR-JEN Clinic`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #e11d48; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AR-JEN Maternity Clinic</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Dasmariñas City, Cavite · PhilHealth Accredited Lying-In</p>
          </div>

          <div style="background: ${isAutoApproved ? '#ecfdf5' : '#fefce8'}; border: 1px solid ${isAutoApproved ? '#a7f3d0' : '#fef08a'}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${isAutoApproved ? '#d1fae5' : '#fef9c3'}; color: ${isAutoApproved ? '#047857' : '#a16207'}; margin-bottom: 8px;">
              ${isAutoApproved ? '✓ Instant Smart Triage: Approved' : '⏳ Request Received: Under Review'}
            </span>
            <h3 style="color: ${isAutoApproved ? '#065f46' : '#854d0e'}; margin: 0 0 6px 0; font-size: 18px; font-weight: 700;">
              ${isAutoApproved ? 'Your Appointment is Confirmed!' : 'We Received Your Booking Request'}
            </h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
              ${isAutoApproved 
                ? 'Your appointment has been automatically approved by our clinical smart triage system. Your slot is guaranteed.' 
                : 'Your appointment request has been scheduled in our system. Our clinic midwives will review and finalize your slot shortly.'}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; width: 35%;">Patient Name</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${patientDisplayName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Service</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${service_type}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Scheduled Date</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${appointment_date}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Time Shift</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${time} Shift</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Clinic Location</td>
                <td style="padding: 10px 0; color: #0f172a;">${clinicAddress}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Clinic Hotline</td>
                <td style="padding: 10px 0; color: #0f172a;">${clinicContact}</td>
              </tr>
              ${notes ? `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b;">Patient Notes</td>
                <td style="padding: 10px 0; color: #0f172a;">${notes}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">Clinic Arrival Reminders:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 13px; line-height: 1.6;">
              <li>Please arrive <strong>15 minutes early</strong> before your time shift for initial vitals screening.</li>
              <li>Bring your <strong>Pink Mother & Child Passport</strong> (Maternal Health Record) if you have one.</li>
              <li>Bring a valid government ID or PhilHealth Member Data Record (MDR).</li>
            </ul>
          </div>

          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              AR-JEN Maternity Clinic · Caring for mothers and newborns with clinical excellence.
            </p>
          </div>
        </div>
      `,
    });
  }

  redirect(`/book?success=true&status=${initialStatus}`);
}
