// app/admin/patients/page.jsx
import Link from 'next/link';
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/server';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';

const PAGE_SIZE = 20;

export default async function PatientsPage({ searchParams }) {
  const params = await searchParams;
  const query  = params?.search || '';
  const page   = Math.max(1, parseInt(params?.page || '1', 10));
  const from   = (page - 1) * PAGE_SIZE;
  const to     = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Build query — filter by name if search term provided
  let dbQuery = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    dbQuery = dbQuery.ilike('full_name', `%${query}%`);
  }

  const { data: patients, count } = await dbQuery;

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Build URL helpers
  const buildUrl = (p, q) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/admin/patients${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage prenatal records and visit history.
            {count !== null && (
              <span className="ml-2 text-gray-400">({count} total)</span>
            )}
          </p>
        </div>
        <Link href="/admin/patients/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            + Add Patient
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <form method="GET" action="/admin/patients" className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="search"
            defaultValue={query}
            placeholder="Search patients by name..."
            className="pl-9 h-10 focus-visible:ring-rose-500"
          />
          {/* Hidden page reset when searching */}
          <input type="hidden" name="page" value="1" />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableCaption className="text-gray-400 pb-4">
            {query
              ? `Found ${patients?.length || 0} patients matching "${query}".`
              : `Showing ${from + 1}–${Math.min(to + 1, count || 0)} of ${count || 0} patients.`}
          </TableCaption>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Patient Name</TableHead>
              <TableHead className="font-semibold">Age</TableHead>
              <TableHead className="font-semibold">Blood Type</TableHead>
              <TableHead className="font-semibold">Contact Number</TableHead>
              <TableHead className="font-semibold">Registered</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients && patients.length > 0 ? patients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-medium text-gray-900">
                  <div>
                    {patient.full_name || 'Unknown'}
                    {patient.lmp && (
                      <span className="ml-2 text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                        Prenatal
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{patient.age || 'N/A'}</TableCell>
                <TableCell className="text-gray-600">
                  {patient.blood_type
                    ? <span className="font-bold text-xs bg-gray-100 px-2 py-0.5 rounded">{patient.blood_type}</span>
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-gray-600">{patient.contact_number || 'N/A'}</TableCell>
                <TableCell className="text-gray-600">
                  {new Date(patient.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/patients/${patient.id}`}>
                    <Button variant="outline" size="sm"
                      className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-gray-200 text-gray-600 transition-colors">
                      View Record
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">
                    {query ? `No patients found matching "${query}".` : 'No patients registered yet.'}
                  </p>
                  {query && (
                    <Link href="/admin/patients" className="text-rose-500 text-sm font-bold hover:underline mt-2 inline-block">
                      Clear search
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500 font-medium">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link href={hasPrev ? buildUrl(page - 1, query) : '#'}>
              <Button variant="outline" size="sm" disabled={!hasPrev} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
            </Link>
            <Link href={hasNext ? buildUrl(page + 1, query) : '#'}>
              <Button variant="outline" size="sm" disabled={!hasNext} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
