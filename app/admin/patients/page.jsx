// app/admin/patients/page.jsx
import { createClient } from '@/utils/supabase/server';
import { PatientDirectoryClient } from '@/components/admin/patients/patient-directory-client';

export const metadata = {
  title: 'Patient Directory | AR-JEN Clinic EMR',
  description: 'Manage prenatal records, real-time gestational age (AOG), and obstetric safety classifications.',
};

export default async function PatientsPage({ searchParams }) {
  const params = await searchParams;
  const query = params?.search || '';
  const filter = params?.filter || 'all';

  const supabase = await createClient();

  // Query patients with their maternal episodes and postpartum records
  let dbQuery = supabase
    .from('patients')
    .select('*, maternal_episodes(*), postpartum_records(id, delivery_date, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (query) {
    dbQuery = dbQuery.ilike('full_name', `%${query}%`);
  }

  const { data: patients, count } = await dbQuery;

  return (
    <div className="w-full">
      <PatientDirectoryClient
        initialPatients={patients || []}
        totalDbCount={count || 0}
      />
    </div>
  );
}
