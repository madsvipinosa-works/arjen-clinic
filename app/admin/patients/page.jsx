// app/admin/patients/page.jsx
// This page lists all patients in a shadcn <Table>.
// For now it uses placeholder data; we will swap this for a real Supabase query later.

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

// ─── Placeholder patient data ─────────────────────────────────────────────────
// Each object represents one row we would normally fetch from the database.
const PLACEHOLDER_PATIENTS = [
  {
    id: '1',
    name: 'Maria Santos',
    age: 28,
    lmp: '2024-09-10',
    aog: '20 weeks',
    status: 'Active',
  },
  {
    id: '2',
    name: 'Ana Reyes',
    age: 31,
    lmp: '2024-10-01',
    aog: '16 weeks',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Joy Dela Cruz',
    age: 24,
    lmp: '2024-06-15',
    aog: '36 weeks',
    status: 'For Delivery',
  },
  {
    id: '4',
    name: 'Lorna Garcia',
    age: 35,
    lmp: '2024-08-20',
    aog: '24 weeks',
    status: 'High Risk',
  },
];

// ─── Page component ───────────────────────────────────────────────────────────
export default function PatientsPage() {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage prenatal records and visit history.
          </p>
        </div>
        {/* TODO: wire up to an "Add Patient" modal/form */}
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          + Add Patient
        </Button>
      </div>

      {/* Patients table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <Table>
          <TableCaption className="pb-4">
            Showing {PLACEHOLDER_PATIENTS.length} registered patients.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Last Menstrual Period</TableHead>
              <TableHead>Age of Gestation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLACEHOLDER_PATIENTS.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.age}</TableCell>
                <TableCell>{patient.lmp}</TableCell>
                <TableCell>{patient.aog}</TableCell>

                {/* Status badge — colour changes based on status text */}
                <TableCell>
                  <StatusBadge status={patient.status} />
                </TableCell>

                <TableCell className="text-right">
                  {/* Link to the individual patient detail page */}
                  <Link href={`/admin/patients/${patient.id}`}>
                    <Button variant="outline" size="sm">
                      View Record
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Helper component: status colour badge ────────────────────────────────────
// Renders a small pill whose colour reflects the patient's current status.
function StatusBadge({ status }) {
  // Map each status string to Tailwind colour classes
  const colours = {
    'Active':       'bg-emerald-100 text-emerald-700',
    'For Delivery': 'bg-blue-100   text-blue-700',
    'High Risk':    'bg-red-100    text-red-700',
  };

  const colourClass = colours[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colourClass}`}>
      {status}
    </span>
  );
}
