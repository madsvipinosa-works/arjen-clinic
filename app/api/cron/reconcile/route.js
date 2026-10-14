import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, renderClinicEmailTemplate } from '@/utils/email';
import { verifyCronSecret } from '@/lib/cron-guard';
import { getClinicTodayDateString } from '@/lib/utils';
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
    // 2. Strict Philippine Standard Time (PHT, UTC+8) for today's date
    const today = getClinicTodayDateString();

    // 3. Find appointments from TODAY that were never marked as Completed or Cancelled
    const { data: missedAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, time_preference, service_type, appointment_date, patients(id, full_name, account_id, is_high_risk)')
      .eq('appointment_date', today)
      .in('status', ['Approved', 'Waiting']);

    if (fetchError) throw fetchError;

    if (!missedAppointments || missedAppointments.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No unserved appointments found to reconcile for today.',
        reconciledCount: 0,
        today 
      });
    }

    // 4. Mark them as No-Show and triage_status as missed
    const missedIds = missedAppointments.map(a => a.id);
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'No-Show',
        triage_status: 'missed'
      })
      .in('id', missedIds);

    if (updateError) throw updateError;

    // 5. Send empathetic care recovery emails
    let emailsSent = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arjenclinic.com';

    for (const appt of missedAppointments) {
      // Null-safety check
      if (!appt.patients?.account_id) continue;

      try {
        const { data: userData } = await supabase.auth.admin.getUserById(appt.patients.account_id);
        const recipientEmail = userData?.user?.email;

        if (recipientEmail) {
          const emailHtml = renderClinicEmailTemplate({
            title: "AR-JEN Maternity Clinic",
            subtitle: "Dasmariñas City, Cavite · PhilHealth Accredited Lying-In",
            badgeText: "Missed Appointment · Care Recovery",
            badgeVariant: "rose",
            headline: "We Missed You at AR-JEN Maternity Clinic Today",
            message: `Hi <strong>${appt.patients.full_name}</strong>,<br/><br/>We noticed you were unable to make it to your scheduled <strong>${appt.service_type}</strong> checkup today during the <strong>${appt.time_preference || 'scheduled'}</strong> shift.<br/><br/>Your maternal health and continuous prenatal/postpartum monitoring are our highest priorities. Regular clinical visits allow our midwives to ensure both mother and baby remain healthy. We encourage you to reschedule your visit as soon as possible.`,
            detailsRows: [
              { label: 'Patient Name', value: appt.patients.full_name },
              { label: 'Missed Service', value: appt.service_type },
              { label: 'Scheduled Date', value: today },
              { label: 'Scheduled Shift', value: `${appt.time_preference || 'Morning'} Shift` },
            ],
            urgentNotice: appt.patients.is_high_risk
              ? "Your chart has a High-Risk Maternal flag. Missing checkups poses safety risks for both mother and child. Please reschedule immediately or contact the clinic."
              : null,
            ctaText: "Reschedule My Appointment",
            ctaUrl: `${siteUrl}/book?service=${encodeURIComponent(appt.service_type || 'Prenatal Checkup')}`,
            footerNote: "EMERGENCY NOTICE: If you are experiencing fever, severe abdominal pain, vaginal bleeding, headache with blurred vision, or reduced baby movements, do not wait — proceed immediately to the clinic or nearest hospital emergency room."
          });

          const result = await sendEmail({
            to: recipientEmail,
            subject: `We Missed You: Reschedule Your Checkup — AR-JEN Clinic`,
            html: emailHtml,
          });

          if (result.success) {
            emailsSent++;
          }
        }
      } catch (recipientErr) {
        console.error(`[Cron:Reconcile] Failed to dispatch no-show email for appointment ${appt.id}:`, recipientErr);
      }
    }

    // 6. Record statutory DPA 2012 audit log entry
    await logAuditEvent({
      action: 'CRON_RECONCILE_NO_SHOWS',
      entityType: 'appointments',
      details: {
        reconciled_date: today,
        reconciled_count: missedAppointments.length,
        emails_sent: emailsSent,
        appointment_ids: missedIds,
        timestamp: new Date().toISOString(),
      },
      userOverride: { id: null, email: 'system:cron:reconcile', role: 'system' },
      supabaseOverride: supabase,
    });

    return NextResponse.json({ 
      success: true, 
      today,
      reconciledCount: missedAppointments.length,
      emailsSent 
    });

  } catch (error) {
    console.error('[Cron:Reconcile] Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
