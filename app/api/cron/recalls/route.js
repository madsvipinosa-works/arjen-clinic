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
    const today = new Date();
    
    // Calculate Target Dates
    // For 3-Day Recall (Newborn Screening)
    const target3DaysAgo = new Date(today);
    target3DaysAgo.setDate(target3DaysAgo.getDate() - 3);
    const date3DaysAgo = target3DaysAgo.toLocaleDateString('en-CA');

    // For 42-Day Recall (6-week Immunization & FP)
    const target42DaysAgo = new Date(today);
    target42DaysAgo.setDate(target42DaysAgo.getDate() - 42);
    const date42DaysAgo = target42DaysAgo.toLocaleDateString('en-CA');

    // Fetch patients who delivered exactly 3 days ago or 42 days ago
    // We assume 'postpartum_records' or 'patients' has a delivery_date.
    // For this implementation, we will query postpartum_records.
    const { data: recalls, error } = await supabase
      .from('postpartum_records')
      .select('delivery_date, patients(id, full_name, account_id)')
      .in('delivery_date', [date3DaysAgo, date42DaysAgo]);

    if (error) throw error;

    if (!recalls || recalls.length === 0) {
      return NextResponse.json({ message: 'No postpartum recalls needed today.' });
    }

    let emailsSent = 0;
    
    for (const record of recalls) {
      const { data: userData } = await supabase.auth.admin.getUserById(record.patients.account_id);
      
      if (userData?.user?.email) {
        const isNewbornScreening = record.delivery_date === date3DaysAgo;
        
        const subject = isNewbornScreening 
          ? 'URGENT: Newborn Screening Reminder - AR-JEN Clinic' 
          : 'Reminder: 6-Week Infant Immunization - AR-JEN Clinic';
          
        const content = isNewbornScreening
          ? `<p>It has been 3 days since your delivery! Please bring your baby to the clinic within the next 48 hours for the <strong>Newborn Screening (NBS)</strong>. This is critical for detecting metabolic conditions early.</p>`
          : `<p>Happy 6 weeks! It's time for your baby's first major immunizations and your routine postpartum checkup (and family planning consultation). Please book an appointment today.</p>`;

        await sendEmail({
          to: userData.user.email,
          subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #0d9488;">Maternal & Newborn Care Recall</h2>
              <p>Hi ${record.patients.full_name},</p>
              ${content}
              <p>Your maternal and neonatal health is our top priority. You can easily book your visit via our online portal.</p>
              <br/>
              <p>Warm regards,</p>
              <p><strong>AR-JEN Maternity Clinic</strong></p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      recallsProcessed: recalls.length,
      emailsSent 
    });

  } catch (error) {
    console.error('[Cron] Recall Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
