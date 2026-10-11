// app/admin/patients/new/page.jsx
import { BreadcrumbTrail } from '@/components/admin/shared/breadcrumb-trail';
import { NewPatientForm } from '@/components/admin/patients/new-patient-form';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Register New Patient | AR-JEN Clinic EMR',
  description: 'Digital maternal intake, gestational age initialization, and risk stratification.',
};

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Trail */}
      <div className="flex items-center justify-between">
        <BreadcrumbTrail
          items={[
            { label: 'Patient Directory', href: '/admin/patients' },
            { label: 'Register New Patient', isCurrent: true },
          ]}
        />
        <Link
          href="/admin/patients"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200 text-white shrink-0">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Register New Patient
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Record comprehensive demographic, contact, and obstetric intake metrics.
          </p>
        </div>
      </div>

      <NewPatientForm />
    </div>
  );
}
