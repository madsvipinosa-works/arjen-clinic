import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus } from "../../actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, CalendarDays, Search } from "lucide-react";

// Map statuses to colors
const statusStyles = {
  Pending:  { class: "bg-amber-50 text-amber-700 border-amber-200",  icon: Clock },
  Approved: { class: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  Rejected: { class: "bg-red-50 text-red-700 border-red-200",  icon: XCircle },
  Completed:{ class: "bg-blue-50 text-blue-700 border-blue-200",  icon: CheckCircle2 },
};

export default async function AppointmentsPage({ searchParams }) {
  const params = await searchParams;
  const activeFilter = params?.status || "Pending";

  const supabase = await createClient();

  // Fetch appointments joined with patient names, filtered by status tab
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      service_type,
      appointment_date,
      time_preference,
      notes,
      status,
      created_at,
      patients (
        full_name,
        contact_number
      )
    `)
    .eq("status", activeFilter)
    .order("appointment_date", { ascending: true });

  // Count per status for badges
  const { data: counts } = await supabase
    .from("appointments")
    .select("status");

  const statusCounts = { Pending: 0, Approved: 0, Rejected: 0, Completed: 0 };
  counts?.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });

  const tabs = ["Pending", "Approved", "Completed", "Rejected"];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage, approve, and track all patient appointment requests.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <CalendarDays className="w-4 h-4 text-rose-500" />
          <span>{new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => {
          const isActive = activeFilter === tab;
          const style = statusStyles[tab];
          return (
            <a
              key={tab}
              href={`/admin/appointments?status=${tab}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border transition-all duration-200 ${
                isActive
                  ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600"
              }`}
            >
              {tab}
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                {statusCounts[tab]}
              </span>
            </a>
          );
        })}
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg capitalize">{activeFilter} Appointments</h2>
          <span className="text-sm text-gray-500">{appointments?.length || 0} record{appointments?.length !== 1 ? "s" : ""}</span>
        </div>

        {appointments?.length === 0 ? (
          <div className="py-20 text-center">
            <CalendarDays className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">No {activeFilter.toLowerCase()} appointments found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments?.map(appt => {
              const style = statusStyles[appt.status] || statusStyles.Pending;
              const StatusIcon = style.icon;
              const patientName = appt.patients?.full_name || "Unknown Patient";
              const contactNum = appt.patients?.contact_number || "–";

              return (
                <div key={appt.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-rose-50/20 transition-colors group">
                  {/* Left: Patient Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-sm flex-shrink-0">
                      {patientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{patientName}</p>
                      <p className="text-sm text-gray-500">{contactNum}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium capitalize">
                          {appt.service_type?.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-semibold">
                          {appt.appointment_date}
                        </span>
                        {appt.time_preference && (
                          <span className="text-xs px-2 py-1 bg-rose-50 text-rose-600 rounded-lg font-medium capitalize">
                            {appt.time_preference}
                          </span>
                        )}
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-gray-400 mt-1.5 italic max-w-sm truncate">
                          &quot;{appt.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border ${style.class}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {appt.status}
                    </span>

                    {/* Action Buttons — only show for Pending */}
                    {appt.status === "Pending" && (
                      <div className="flex gap-2">
                        <form action={updateAppointmentStatus}>
                          <input type="hidden" name="appointment_id" value={appt.id} />
                          <input type="hidden" name="status" value="Approved" />
                          <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 font-semibold shadow-sm">
                            Approve
                          </Button>
                        </form>
                        <form action={updateAppointmentStatus}>
                          <input type="hidden" name="appointment_id" value={appt.id} />
                          <input type="hidden" name="status" value="Rejected" />
                          <Button type="submit" size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl h-9 px-4 font-semibold">
                            Reject
                          </Button>
                        </form>
                      </div>
                    )}

                    {/* Mark as Complete — only for Approved */}
                    {appt.status === "Approved" && (
                      <form action={updateAppointmentStatus}>
                        <input type="hidden" name="appointment_id" value={appt.id} />
                        <input type="hidden" name="status" value="Completed" />
                        <Button type="submit" size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-9 px-4 font-semibold shadow-sm">
                          Mark Complete
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
