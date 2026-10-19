import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { PatientDirectoryClient } from '@/components/admin/patients/patient-directory-client';
import { requireStaffSession } from '@/lib/rbac-server';
import { canAccessClinicalRecords } from '@/lib/rbac';

export const metadata = {
  title: 'Patient Directory | AR-JEN Clinic EMR',
  description: 'Manage prenatal records, real-time gestational age (AOG), and obstetric safety classifications.',
};

export default async function PatientsPage({ searchParams }) {
  // Defense-in-depth: Enforce clinical records permission (Finding 4)
  await requireStaffSession(canAccessClinicalRecords);

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
      <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-400">Loading directory...</div>}>
        <PatientDirectoryClient
          initialPatients={patients || []}
          totalDbCount={count || 0}
        />
      </Suspense>
    </div>
  );
}
