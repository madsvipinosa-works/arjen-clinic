import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  ClipboardList, 
  MessageSquare, 
  ArrowRight,
  Activity,
  UserCheck,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PatientDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch patient record, appointments, and visit logs
  const [
    { data: patient },
    { data: appointments },
    { data: visitLogs }
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", user.id).single(),
    supabase.from("appointments")
      .select("*")
      .eq("patient_id", user.id)
      .order("appointment_date", { ascending: false })
      .limit(5),
    supabase.from("visit_logs")
      .select("*")
      .eq("patient_id", user.id)
      .order("visit_date", { ascending: false })
      .limit(3)
  ]);

  const upcomingAppointment = appointments?.find(a => 
    new Date(a.appointment_date) >= new Date() && a.status !== 'Cancelled' && a.status !== 'Rejected'
  );

  const stats = [
    { 
      label: "Total Visits", 
      value: visitLogs?.length || 0, 
      icon: UserCheck, 
      color: "text-rose-600", 
      bg: "bg-rose-50" 
    },
    { 
      label: "Appointments", 
      value: appointments?.length || 0, 
      icon: Calendar, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      label: "Health Status", 
      value: "Active", 
      icon: Activity, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50" 
    },
  ];

  const statusColors = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
    Completed: "bg-blue-100 text-blue-700",
    Cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Hello, <span className="text-rose-600">{patient?.full_name?.split(' ')[0] || "there"}!</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            Welcome back to your health portal. Here's your overview.
          </p>
        </div>
        <Link href="/book">
          <Button size="lg" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 shadow-lg shadow-rose-200 transition-all hover:scale-105">
            Book Appointment
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upcoming & Recent Appointments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Next Appointment Feature Card */}
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-8 text-white shadow-xl shadow-rose-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 transform group-hover:scale-110 transition-transform">
              <CalendarDays className="w-32 h-32 text-white/10" />
            </div>
            <div className="relative z-10">
              <p className="text-rose-100 font-bold uppercase tracking-widest text-sm mb-4">Upcoming Appointment</p>
              {upcomingAppointment ? (
                <>
                  <h2 className="text-3xl font-black mb-2">{upcomingAppointment.service_type.toUpperCase()}</h2>
                  <div className="flex flex-wrap gap-6 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-lg">{format(new Date(upcomingAppointment.appointment_date), "MMMM d, yyyy")}</span>
                    </div>
                    {upcomingAppointment.time_preference && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg">{upcomingAppointment.time_preference}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-2">
                  <p className="text-xl font-bold text-rose-50">No upcoming appointments scheduled.</p>
                  <Link href="/book" className="inline-flex items-center gap-2 mt-4 text-white font-black hover:underline">
                    Schedule one now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Appointments Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">Recent Appointments</h3>
              <Link href="/patient/appointments" className="text-rose-600 font-bold text-sm hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {appointments?.length > 0 ? appointments.map((appt) => (
                <div key={appt.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{appt.service_type}</p>
                      <p className="text-xs text-gray-400 font-medium">{format(new Date(appt.appointment_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${statusColors[appt.status] || statusColors.Pending}`}>
                    {appt.status}
                  </span>
                </div>
              )) : (
                <div className="p-12 text-center text-gray-400 font-medium">
                  No appointment history found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visit Logs & Consultation */}
        <div className="space-y-8">
          {/* Quick Consultation Callout */}
          <div className="bg-rose-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black mb-2">Need Help?</h4>
            <p className="text-rose-100 text-sm font-medium mb-6">Ask our medical staff anything through your private thread.</p>
            <Link href="/patient/consultation" className="w-full">
              <Button className="w-full bg-white text-rose-600 hover:bg-rose-50 rounded-2xl font-black h-12">
                Open Consultation
              </Button>
            </Link>
          </div>

          {/* Recent Visit Logs */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-500" />
              <h3 className="font-black text-gray-900">Medical Notes</h3>
            </div>
            <div className="p-6 space-y-6">
              {visitLogs?.length > 0 ? visitLogs.map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-rose-100 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-rose-500 border-4 border-white shadow-sm" />
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                    {format(new Date(log.visit_date), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm font-medium text-gray-600 line-clamp-2 italic">
                    "{log.doctor_notes}"
                  </p>
                </div>
              )) : (
                <p className="text-center py-6 text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-2xl">
                  Log entries will appear here after your first visit.
                </p>
              )}
            </div>
            {visitLogs?.length > 0 && (
              <div className="px-6 pb-6 mt-2">
                <Link href="/patient/history" className="block text-center text-sm font-bold text-gray-400 hover:text-rose-600 transition-colors">
                  View Full History
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
