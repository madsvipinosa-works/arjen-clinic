// app/admin/patients/page.jsx
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
import { createClient } from "@/utils/supabase/server";

export default async function PatientsPage() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage prenatal records and visit history.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          + Add Patient
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableCaption className="text-gray-400 pb-4">
            Showing {patients?.length || 0} registered patients.
          </TableCaption>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Patient Name</TableHead>
              <TableHead className="font-semibold">Age</TableHead>
              <TableHead className="font-semibold">Contact Number</TableHead>
              <TableHead className="font-semibold">Registered</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients?.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium text-gray-900">{patient.full_name || 'Patient'}</TableCell>
                <TableCell className="text-gray-600">{patient.age || 'N/A'}</TableCell>
                <TableCell className="text-gray-600">{patient.contact_number || 'N/A'}</TableCell>
                <TableCell className="text-gray-600">{new Date(patient.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/patients/${patient.id}`}>
                    <Button variant="outline" size="sm" className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-gray-200 text-gray-600 transition-colors">
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
