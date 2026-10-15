import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, renderClinicEmailTemplate } from '@/utils/email';
import { verifyCronSecret } from '@/lib/cron-guard';
import { getClinicDateOffset } from '@/lib/utils';
import { logAuditEvent } from '@/lib/audit-logger';

export async function GET(request) {
  // 1. Timing-safe security verification
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 2. Strict Philippine Standard Time (PHT, UTC+8) date offset: tomorrow's date
    const targetDate = getClinicDateOffset(1);

    // Fetch clinic address and contact settings for email footer
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('clinic_address, clinic_contact, emergency_notice')
      .limit(1)
      .maybeSingle();

    const clinicAddress = settings?.clinic_address || "Dasmariñas City, Cavite";

    // 3. Query approved appointments for tomorrow that haven't received a reminder yet
    let upcomingAppointments = [];
    const { data: apptsWithTracking, error: trackingError } = await supabase
      .from('appointments')
      .select('id, time_preference, service_type, appointment_date, reminder_sent_at, patients(id, full_name, account_id, is_high_risk)')
      .eq('appointment_date', targetDate)
      .eq('status', 'Approved')
      .is('reminder_sent_at', null);

    if (!trackingError) {
      upcomingAppointments = apptsWithTracking || [];
    } else {
      // Fallback query if reminder_sent_at column is not yet migrated
      console.warn('[Cron:Reminders] reminder_sent_at column unmigrated, using fallback query:', trackingError.message);
      const { data: fallbackAppts, error: fallbackError } = await supabase
        .from('appointments')
        .select('id, time_preference, service_type, appointment_date, patients(id, full_name, account_id, is_high_risk)')
        .eq('appointment_date', targetDate)
        .eq('status', 'Approved');

      if (fallbackError) throw fallbackError;
      upcomingAppointments = fallbackAppts || [];
    }

    if (!upcomingAppointments || upcomingAppointments.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No upcoming appointments scheduled for tomorrow.',
        targetDate,
        remindersSent: 0 
      });
    }

    let emailsSent = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arjenclinic.com';

    for (const appt of upcomingAppointments) {
      // Null-safety check: skip if patient relation is missing or account_id is null
      if (!appt.patients?.account_id) continue;

      try {
        const { data: userData } = await supabase.auth.admin.getUserById(appt.patients.account_id);
        const recipientEmail = userData?.user?.email;

        if (recipientEmail) {
          const emailHtml = renderClinicEmailTemplate({
            title: "AR-JEN Maternity Clinic",
            subtitle: "Dasmariñas City, Cavite · PhilHealth Accredited Lying-In",
            badgeText: "Appointment Reminder · 24h Advance",
            badgeVariant: "emerald",
            headline: `Upcoming ${appt.service_type} Appointment Tomorrow`,
            message: `Hi <strong>${appt.patients.full_name}</strong>,<br/><br/>This is a reminder that your clinical checkup at AR-JEN Maternity Clinic is scheduled for tomorrow during the <strong>${appt.time_preference || 'Morning'}</strong> shift. Please review your appointment details below:`,
            detailsRows: [
              { label: 'Patient Name', value: appt.patients.full_name },
              { label: 'Service', value: appt.service_type },
              { label: 'Appointment Date', value: targetDate },
              { label: 'Time Preference', value: `${appt.time_preference || 'Morning'} Shift` },
              { label: 'Clinic Address', value: clinicAddress },
            ],
            urgentNotice: appt.patients.is_high_risk 
              ? "Your chart is flagged for High-Risk Maternal Monitoring. Please do not miss this consultation to ensure mother and baby wellness."
              : null,
            ctaText: "View My Appointment",
            ctaUrl: `${siteUrl}/patient/appointments`,
            footerNote: "Please bring your Mother & Child Book (pink card), PhilHealth Member Data Record (MDR), and a valid ID. If you feel unwell or have questions, contact the clinic immediately."
          });

          const result = await sendEmail({
            to: recipientEmail,
            subject: `Reminder: ${appt.service_type} Appointment Tomorrow (${targetDate}) — AR-JEN Clinic`,
            html: emailHtml,
          });

          if (result.success) {
            emailsSent++;
            try {
              await supabase
                .from('appointments')
                .update({ reminder_sent_at: new Date().toISOString() })
                .eq('id', appt.id);
            } catch (stampErr) {
              console.warn(`[Cron:Reminders] Failed to stamp reminder_sent_at for ${appt.id}:`, stampErr.message);
            }
          }
        }
      } catch (recipientErr) {
        console.error(`[Cron:Reminders] Failed to dispatch reminder for appointment ${appt.id}:`, recipientErr);
      }
    }

    // 4. Record statutory DPA 2012 audit log entry
    await logAuditEvent({
      action: 'CRON_REMINDERS_DISPATCHED',
      entityType: 'appointments',
      details: {
        target_date: targetDate,
        total_eligible: upcomingAppointments.length,
        reminders_sent: emailsSent,
        timestamp: new Date().toISOString(),
      },
      userOverride: { id: null, email: 'system:cron:reminders', role: 'system' },
      supabaseOverride: supabase,
    });

    return NextResponse.json({ 
      success: true, 
      targetDate,
      totalEligible: upcomingAppointments.length,
      remindersSent: emailsSent 
    });

  } catch (error) {
    console.error('[Cron:Reminders] Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
