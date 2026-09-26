// app/admin/billing/page.jsx
// AR-JEN Maternity Clinic: Internal Cashiering Ledger & Billing Dashboard.
// Strictly an administrative counter ledger; NO external payment gateways.

import { createClient } from '@/utils/supabase/server';
import { BillingDashboardClient } from '@/components/admin/billing/billing-dashboard-client';

export const metadata = {
  title: 'Billing & Cashiering | AR-JEN Clinic Admin',
  description: 'Internal clinic cashiering ledger, patient statement of accounts, and official receipts.',
};

export default async function BillingPage() {
  const supabase = await createClient();

  const [
    { data: invoices },
    { data: patients },
    { data: clinicSettings }
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, patient:patients(id, full_name, contact_number, age, philhealth_number), invoice_items(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('patients')
      .select('id, full_name, contact_number, philhealth_number')
      .order('full_name', { ascending: true }),
    supabase
      .from('clinic_settings')
      .select('*')
      .eq('id', 1)
      .single(),
  ]);

  return (
    <BillingDashboardClient
      invoices={invoices || []}
      patients={patients || []}
      clinicSettings={clinicSettings || {}}
    />
  );
}
