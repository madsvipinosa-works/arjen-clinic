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
    // 2. Strict Philippine Standard Time (PHT, UTC+8) clinical recall windows:
    // Newborn Screening (NBS): Day 3 to Day 5 of life (RA 9288 / DOH AO 2020-0035)
    const nbsDates = [
      getClinicDateOffset(-3),
      getClinicDateOffset(-4),
      getClinicDateOffset(-5),
    ];

    // 6-Week Immunization & Maternal Postpartum Exam: Days 42 to 45
    const immunizationDates = [
      getClinicDateOffset(-42),
      getClinicDateOffset(-43),
      getClinicDateOffset(-44),
      getClinicDateOffset(-45),
    ];

    const allTargetDates = [...nbsDates, ...immunizationDates];

    // 3. Query postpartum records with delivery dates in these windows
    const { data: records, error: fetchError } = await supabase
      .from('postpartum_records')
      .select('id, delivery_date, nbs_filter_card_number, nbs_status, patients(id, full_name, account_id, is_high_risk)')
      .in('delivery_date', allTargetDates);

    if (fetchError) throw fetchError;

    if (!records || records.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No postpartum or newborn recalls needed today.',
        recallsProcessed: 0,
        emailsSent: 0 
      });
    }

    let emailsSent = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arjenclinic.com';
    const processedPatients = new Set();

    for (const record of records) {
      // Null-safety check
      if (!record.patients?.account_id) continue;

      // Prevent duplicate emails to the same patient in the same cron run
      const dedupeKey = `${record.patients.id}-${record.delivery_date}`;
      if (processedPatients.has(dedupeKey)) continue;

      const isNbsRecall = nbsDates.includes(record.delivery_date);
      const isImmunizationRecall = immunizationDates.includes(record.delivery_date);

      // If NBS recall, skip if NBS card already collected
      if (isNbsRecall && (record.nbs_filter_card_number || record.nbs_status === 'Collected')) {
        continue;
      }

      try {
        const { data: userData } = await supabase.auth.admin.getUserById(record.patients.account_id);
        const recipientEmail = userData?.user?.email;

        if (recipientEmail) {
          let emailHtml = '';
          let subject = '';

          if (isNbsRecall) {
            subject = `CRITICAL: Newborn Screening (NBS) Reminder — AR-JEN Maternity Clinic`;
            emailHtml = renderClinicEmailTemplate({
              title: "AR-JEN Maternity Clinic",
              subtitle: "Dasmariñas City, Cavite · PhilHealth Accredited Lying-In",
              badgeText: "Urgent: Newborn Screening (NBS) · RA 9288",
              badgeVariant: "teal",
              headline: "Critical Milestone: Newborn Screening Required (Day 3–5)",
              message: `Hi <strong>${record.patients.full_name}</strong>,<br/><br/>Warmest congratulations on the delivery of your baby on <strong>${record.delivery_date}</strong>!<br/><br/>Under the Philippine Newborn Screening Act (RA 9288), every infant must receive an Expanded Newborn Screening (ENBS) blood spot test between <strong>48 hours and 7 days of life (ideally Day 3 to 5)</strong>.<br/><br/>This simple heel-prick test screens for 28 congenital endocrine, metabolic, and amino acid disorders. Early detection saves lives and prevents permanent intellectual and physical disabilities.`,
              detailsRows: [
                { label: 'Mother Name', value: record.patients.full_name },
                { label: 'Baby Delivery Date', value: record.delivery_date },
                { label: 'Clinical Milestone', value: 'Expanded Newborn Screening (ENBS)' },
                { label: 'Window of Safety', value: 'Day 3 to Day 5 of Life (Urgent)' },
              ],
              urgentNotice: "Do not delay. Please bring your baby to AR-JEN Maternity Clinic within the next 24 to 48 hours for the heel-prick test.",
              ctaText: "Book Newborn Screening",
              ctaUrl: `${siteUrl}/book?service=${encodeURIComponent('Postpartum Care')}`,
              footerNote: "Please bring your Baby's Discharge Summary and Mother & Child Record Book. The test takes only 15 minutes."
            });
          } else if (isImmunizationRecall) {
            subject = `Reminder: Baby's 6-Week Immunization & Postpartum Visit — AR-JEN Clinic`;
            emailHtml = renderClinicEmailTemplate({
              title: "AR-JEN Maternity Clinic",
              subtitle: "Dasmariñas City, Cavite · PhilHealth Accredited Lying-In",
              badgeText: "6-Week Immunization & Postpartum Wellness",
              badgeVariant: "emerald",
              headline: "Time for Baby's 6-Week Vaccines and Your Postpartum Evaluation",
              message: `Hi <strong>${record.patients.full_name}</strong>,<br/><br/>Happy 6-week milestone! Your baby delivered on <strong>${record.delivery_date}</strong> has reached 6 weeks of life.<br/><br/>Under DOH EPI guidelines, 6 weeks is the milestone for your baby's first major primary immunization series (Penta 1, OPV 1, PCV 1, Rotavirus 1). It is also the ideal time for your routine maternal postpartum evaluation, pelvic check, and family planning consultation.`,
              detailsRows: [
                { label: 'Mother Name', value: record.patients.full_name },
                { label: 'Baby Delivery Date', value: record.delivery_date },
                { label: 'Clinical Milestone', value: '6-Week Primary Vaccines & Maternal Exam' },
              ],
              ctaText: "Schedule 6-Week Checkup",
              ctaUrl: `${siteUrl}/book?service=${encodeURIComponent('Postpartum Care')}`,
              footerNote: "Please bring your baby's Under-Five Child Health Record (Bakuna Card) and Mother & Child Book."
            });
          }

          if (emailHtml) {
            const result = await sendEmail({
              to: recipientEmail,
              subject,
              html: emailHtml,
            });

            if (result.success) {
              emailsSent++;
              processedPatients.add(dedupeKey);
            }
          }
        }
      } catch (recipientErr) {
        console.error(`[Cron:Recalls] Failed to dispatch recall for record ${record.id}:`, recipientErr);
      }
    }

    // 4. Record statutory DPA 2012 audit log entry
    await logAuditEvent({
      action: 'CRON_POSTPARTUM_RECALLS',
      entityType: 'postpartum_records',
      details: {
        total_eligible: records.length,
        emails_sent: emailsSent,
        target_dates: allTargetDates,
        timestamp: new Date().toISOString(),
      },
      userOverride: { id: null, email: 'system:cron:recalls', role: 'system' },
      supabaseOverride: supabase,
    });

    return NextResponse.json({ 
      success: true, 
      recallsProcessed: records.length,
      emailsSent 
    });

  } catch (error) {
    console.error('[Cron:Recalls] Execution Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
