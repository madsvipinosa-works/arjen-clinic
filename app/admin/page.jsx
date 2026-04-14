// app/admin/page.jsx
// The main dashboard landing page shown at /admin
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus } from "../actions";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch total patients
  const { count: patientsCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  // 2. Fetch total appointments
  const { count: appointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true });

  // 3. Fetch all appointments including the patient's name
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, patients(full_name)')
    .order('appointment_date', { ascending: false });

  // Compute some quick stats from the loaded data
  const pendingCount = appointments?.filter(a => a.status === 'Pending').length || 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">
        Welcome back! Here is a live overview of the clinic.
      </p>

      {/* Real-time Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-500 font-normal">Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{patientsCount || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-500 font-normal">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{appointmentsCount || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-500 font-normal">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-gray-500 font-normal">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-rose-500 mt-2">Live</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments && appointments.length > 0 ? (
                appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium text-gray-900">
                      {apt.patients?.full_name || 'Unknown Patient'}
                    </TableCell>
                    <TableCell className="capitalize">{apt.service_type.replace('_', ' ')}</TableCell>
                    <TableCell>{new Date(apt.appointment_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        apt.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {apt.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {apt.status === 'Pending' && (
                        <form action={updateAppointmentStatus}>
                          <input type="hidden" name="appointment_id" value={apt.id} />
                          <input type="hidden" name="status" value="Approved" />
                          <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8">
                            Approve
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
