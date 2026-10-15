import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/utils/email';
import { verifyCronSecret } from '@/lib/cron-guard';
import { getClinicTodayDateString, getClinicDateOffset } from '@/lib/utils';
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
    // 2. Strict Philippine Standard Time (PHT, UTC+8) dates
    const today = getClinicTodayDateString();
    const tomorrow = getClinicDateOffset(1);

    // 3. Fetch Today's Appointments with patient clinical flags
    const { data: todayAppointments, error: todayError } = await supabase
      .from('appointments')
      .select('id, service_type, status, triage_status, is_walkin, time_preference, patients(id, full_name, is_high_risk, blood_type)')
      .eq('appointment_date', today);

    if (todayError) throw todayError;

    // 4. Fetch Tomorrow's Scheduled Appointments for Chart Preparation
    const { data: tomorrowAppointments, error: tomorrowError } = await supabase
      .from('appointments')
      .select('id, service_type, time_preference, is_walkin, patients(id, full_name, is_high_risk)')
      .eq('appointment_date', tomorrow)
      .in('status', ['Approved']);

    if (tomorrowError) throw tomorrowError;

    // 5. Aggregate Rich Clinical & Operational Metrics
    const totalToday = todayAppointments?.length || 0;
    const completed = todayAppointments?.filter(a => a.status === 'Completed' || a.triage_status === 'done').length || 0;
    const noShows = todayAppointments?.filter(a => a.status === 'No-Show' || a.triage_status === 'missed').length || 0;
    const cancelled = todayAppointments?.filter(a => a.status === 'Cancelled').length || 0;
    const inProgress = todayAppointments?.filter(a => 
      ['Waiting', 'Approved'].includes(a.status) && !['done', 'missed'].includes(a.triage_status)
    ).length || 0;

    // Walk-In vs Online Ratio
    const walkIns = todayAppointments?.filter(a => a.is_walkin).length || 0;
    const onlineBookings = totalToday - walkIns;

    // High-Risk Maternal Cases Handled
    const highRiskPatients = todayAppointments?.filter(a => a.patients?.is_high_risk) || [];
    const highRiskSeenCount = highRiskPatients.length;

    // Service Type Breakdown (Today)
    const serviceCounts = {};
    (todayAppointments || []).forEach(a => {
      const type = a.service_type || 'General Consultation';
      serviceCounts[type] = (serviceCounts[type] || 0) + 1;
    });

    // Tomorrow's Forecast & Chart Preparation
    const totalTomorrow = tomorrowAppointments?.length || 0;
    const morningTomorrow = tomorrowAppointments?.filter(a => a.time_preference === 'Morning').length || 0;
    const afternoonTomorrow = tomorrowAppointments?.filter(a => a.time_preference === 'Afternoon').length || 0;
    const tomorrowHighRisk = tomorrowAppointments?.filter(a => a.patients?.is_high_risk).length || 0;

    // 6. Recipient Resolution Hierarchy
    const { data: settings } = await supabase
      .from('clinic_settings')
      .select('footer_email, clinic_name, clinic_address')
      .limit(1)
      .maybeSingle();

    const { data: adminUser } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    const { data: adminCred } = await supabase
      .from('admin_credentials')
      .select('email')
      .limit(1)
      .maybeSingle();

    const recipientEmail = settings?.footer_email || adminUser?.email || adminCred?.email || process.env.EMAIL_USER;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arjenclinic.com';
    const clinicName = settings?.clinic_name || "AR-JEN Maternity Clinic";

    let emailSent = false;

    if (recipientEmail) {
      // Build Executive HTML Digest
      const serviceRowsHtml = Object.entries(serviceCounts).map(([service, count]) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 0; color: #334155; font-size: 13px;">${service}</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-size: 13px; text-align: right;">${count}</td>
        </tr>
      `).join('');

      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EOD Operations Report — ${today}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Executive Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 24px; color: #ffffff;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; background-color: rgba(225, 29, 72, 0.2); border: 1px solid rgba(225, 29, 72, 0.4); color: #fda4af; margin-bottom: 8px;">
                      Executive Clinical Digest · End-of-Day
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      ${clinicName}
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
                      Clinical Operations Briefing for <strong>${today}</strong> (PHT)
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Key Metrics Bento Grid -->
          <tr>
            <td style="padding: 24px;">
              
              <!-- Metrics Cards -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="32%" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Total Handled</div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalToday}</div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${walkIns} Walk-In · ${onlineBookings} Web</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 0.05em;">Completed</div>
                    <div style="font-size: 24px; font-weight: 800; color: #065f46; margin-top: 4px;">${completed}</div>
                    <div style="font-size: 10px; color: #059669; margin-top: 2px;">${totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0}% Attendance</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #e11d48; letter-spacing: 0.05em;">No-Shows</div>
                    <div style="font-size: 24px; font-weight: 800; color: #9f1239; margin-top: 4px;">${noShows}</div>
                    <div style="font-size: 10px; color: #e11d48; margin-top: 2px;">Reconciled & Alerted</div>
                  </td>
                </tr>
              </table>

              <!-- High Risk Surveillance Banner -->
              <div style="background-color: ${highRiskSeenCount > 0 ? '#fff7ed' : '#f0fdf4'}; border: 1px solid ${highRiskSeenCount > 0 ? '#fed7aa' : '#bbf7d0'}; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${highRiskSeenCount > 0 ? '#c2410c' : '#15803d'}; letter-spacing: 0.05em;">
                        ${highRiskSeenCount > 0 ? '⚠️ High-Risk Maternal Alert' : '✓ Maternal Baseline Stable'}
                      </span>
                      <p style="margin: 4px 0 0 0; font-size: 13px; color: ${highRiskSeenCount > 0 ? '#9a3412' : '#166534'};">
                        ${highRiskSeenCount > 0 
                          ? `<strong>${highRiskSeenCount} high-risk mothers</strong> were managed today (Elevated BP / Gestational alerts). Check EMR charts for protocol compliance.` 
                          : 'Zero high-risk emergencies flagged during today\'s triage shifts.'}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Service Type Distribution -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
                  📊 Services Rendered Today
                </h3>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tbody>
                    ${serviceRowsHtml || '<tr><td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">No services logged for today.</td></tr>'}
                  </tbody>
                </table>
              </div>

              <!-- Tomorrow's Shift Preparation Guide -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">
                  📅 Tomorrow's Preparation Roster (${tomorrow})
                </h3>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
                  Clinic staff should pull <strong>${totalTomorrow} physical clinical charts</strong> before the morning shift:
                </p>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 4px 0;"><strong>Morning Shift:</strong></td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600;">${morningTomorrow} appointments</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;"><strong>Afternoon Shift:</strong></td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600;">${afternoonTomorrow} appointments</td>
                  </tr>
                  ${tomorrowHighRisk > 0 ? `
                    <tr>
                      <td style="padding: 4px 0; color: #c2410c;"><strong>High-Risk Cases Tomorrow:</strong></td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #c2410c;">${tomorrowHighRisk} patients</td>
                    </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Quick Action Button -->
              <div style="text-align: center; margin: 28px 0 12px 0;">
                <a href="${siteUrl}/admin" style="background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 9999px; text-decoration: none; display: inline-block;">
                  Open Admin Command Center &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Statutory & Confidentiality Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                Automated clinical operations digest generated by <strong>AR-JEN Clinic Smart Management System</strong>.<br/>
                Strictly confidential administrative report. Not for public distribution.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const result = await sendEmail({
        to: recipientEmail,
        subject: `[EOD Digest] Clinic Operations Briefing — ${today} (${completed} Served, ${noShows} Missed)`,
        html: emailHtml,
      });

      emailSent = result.success;
    }

    // 7. Record statutory DPA 2012 audit log entry
    await logAuditEvent({
      action: 'CRON_EOD_DIGEST',
      entityType: 'appointments',
      details: {
        report_date: today,
        total_appointments: totalToday,
        completed_count: completed,
        noshow_count: noShows,
        cancelled_count: cancelled,
        in_progress_count: inProgress,
        walkin_count: walkIns,
        online_count: onlineBookings,
        high_risk_seen: highRiskSeenCount,
        tomorrow_total: totalTomorrow,
        tomorrow_high_risk: tomorrowHighRisk,
        recipient_email: recipientEmail,
        email_dispatched: emailSent,
        timestamp: new Date().toISOString(),
      },
      userOverride: { id: null, email: 'system:cron:eod-report', role: 'system' },
      supabaseOverride: supabase,
    });

    return NextResponse.json({ 
      success: true, 
      reportDate: today,
      metrics: {
        today: {
          total: totalToday,
          completed,
          noShows,
          cancelled,
          inProgress,
          walkIns,
          onlineBookings,
          highRiskSeen: highRiskSeenCount,
          serviceBreakdown: serviceCounts,
        },
        tomorrow: {
          total: totalTomorrow,
          morning: morningTomorrow,
          afternoon: afternoonTomorrow,
          highRiskCases: tomorrowHighRisk,
        }
      },
      emailDispatched: emailSent,
      recipient: recipientEmail 
    });

  } catch (error) {
    console.error('[Cron:EOD-Report] Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
