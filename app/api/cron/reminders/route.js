import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/utils/email';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toLocaleDateString('en-CA');

    const { data: upcomingAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, time_preference, service_type, patients(id, full_name, account_id)')
      .eq('appointment_date', targetDate)
      .eq('status', 'Approved');

    if (fetchError) throw fetchError;

    if (!upcomingAppointments || upcomingAppointments.length === 0) {
      return NextResponse.json({ message: 'No upcoming appointments to remind for tomorrow.' });
    }

    let emailsSent = 0;
    for (const appt of upcomingAppointments) {
      const { data: userData } = await supabase.auth.admin.getUserById(appt.patients.account_id);
      
      if (userData?.user?.email) {
        await sendEmail({
          to: userData.user.email,
          subject: 'Reminder: Upcoming Appointment - AR-JEN Clinic',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #006a61;">Appointment Reminder</h2>
              <p>Hi ${appt.patients.full_name},</p>
              <p>This is a quick reminder for your <strong>${appt.service_type}</strong> appointment tomorrow, <strong>${targetDate}</strong>, during the <strong>${appt.time_preference}</strong> shift.</p>
              <p>Please remember to bring your records. See you soon!</p>
              <br/>
              <p><strong>AR-JEN Maternity Clinic</strong></p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      remindersSent: emailsSent 
    });

  } catch (error) {
    console.error('[Cron] Reminder Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
