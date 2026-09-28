import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/utils/email';

export async function GET(request) {
  // Security Check: Ensure only Vercel Cron or authorized agents can trigger this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Note: We use the Supabase Service Role Key to bypass RLS for background jobs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const today = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time

    // 1. Find appointments from TODAY that were never marked as Completed or Cancelled
    const { data: missedAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, time_preference, service_type, patients(id, full_name, account_id)')
      .eq('appointment_date', today)
      .in('status', ['Approved', 'Waiting']);

    if (fetchError) throw fetchError;

    if (!missedAppointments || missedAppointments.length === 0) {
      return NextResponse.json({ message: 'No missed appointments found for today.' });
    }

    // 2. Mark them as No-Show
    const missedIds = missedAppointments.map(a => a.id);
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'No-Show' })
      .in('id', missedIds);

    if (updateError) throw updateError;

    // 3. Send No-Show Emails
    let emailsSent = 0;
    for (const appt of missedAppointments) {
      // We need the user's email from auth.users, but we don't have direct access in the standard query.
      // Fetch user email using account_id
      const { data: userData } = await supabase.auth.admin.getUserById(appt.patients.account_id);
      
      if (userData?.user?.email) {
        await sendEmail({
          to: userData.user.email,
          subject: 'Missed Appointment - AR-JEN Clinic',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #ba1a1a;">Missed Appointment Notice</h2>
              <p>Hi ${appt.patients.full_name},</p>
              <p>We noticed you weren't able to make it to your <strong>${appt.service_type}</strong> appointment today during the ${appt.time_preference} shift.</p>
              <p>Your maternal and prenatal health is very important to us. Please log into the AR-JEN Clinic portal to reschedule your checkup as soon as possible.</p>
              <br/>
              <p>Stay safe,</p>
              <p><strong>AR-JEN Maternity Clinic</strong></p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      reconciledCount: missedAppointments.length,
      emailsSent 
    });

  } catch (error) {
    console.error('[Cron] Reconcile Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
