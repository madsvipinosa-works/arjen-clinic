// app/admin/philhealth/page.jsx
// AR-JEN Maternity Clinic: PhilHealth MCP & NCP Claims Tracker.
// Strictly an administrative claim tracker and 60-day deadline compliance monitor.

import { createClient } from '@/utils/supabase/server';
import { PhilHealthDashboardClient } from '@/components/admin/philhealth/philhealth-dashboard-client';

export const metadata = {
  title: 'PhilHealth Claims Tracker | AR-JEN Clinic Admin',
  description: 'Track Maternal Care Package (MCP) and Newborn Care Package (NCP) claims and 60-day filing deadlines.',
};

export default async function PhilHealthPage() {
  const supabase = await createClient();

  const [
    { data: claims },
    { data: patients },
    { data: invoices }
  ] = await Promise.all([
    supabase
      .from('philhealth_claims')
      .select('*, patient:patients(id, full_name, contact_number, philhealth_number)')
      .order('created_at', { ascending: false }),
    supabase
      .from('patients')
      .select('id, full_name, contact_number, philhealth_number')
      .order('full_name', { ascending: true }),
    supabase
      .from('invoices')
      .select('id, invoice_number, amount_due')
      .order('created_at', { ascending: false })
  ]);

  return (
    <PhilHealthDashboardClient
      claims={claims || []}
      patients={patients || []}
      invoices={invoices || []}
    />
  );
}
