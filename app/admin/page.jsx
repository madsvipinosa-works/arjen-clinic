// app/admin/page.jsx
import { createClient } from "@/utils/supabase/server";
import { updateAppointmentStatus } from "../actions";
import Link from "next/link";
import {
  Users, CalendarDays, Clock, CheckCircle2, ArrowRight, Activity,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Stat queries
  const [
    { count: patientsCount },
    { count: appointmentsCount },
    { data: recentAppts },
    { data: statusRows },
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("id, service_type, appointment_date, time_preference, status, patients(full_name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("appointments").select("status"),
  ]);

  const statusCounts = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
  statusRows?.forEach((a) => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });

  const SERVICE_LABELS = {
    prenatal: "Prenatal",
    delivery: "Delivery",
    family:   "Family Planning",
    general:  "General Consult",
  };

  const statusBadge = {
    Pending:   "bg-amber-50 text-amber-700 border border-amber-200",
    Approved:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Completed: "bg-blue-50 text-blue-700 border border-blue-200",
    Rejected:  "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's a live overview of the clinic.</p>
      </div>

      {/* ── Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Patients",     value: patientsCount || 0,        icon: Users,         color: "text-violet-600",  bg: "bg-violet-50",  href: "/admin/patients" },
          { label: "Total Appointments", value: appointmentsCount || 0,    icon: CalendarDays,  color: "text-blue-600",    bg: "bg-blue-50",    href: "/admin/appointments" },
          { label: "Pending Approvals",  value: statusCounts.Pending,      icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50",   href: "/admin/appointments?status=Pending" },
          { label: "Completed Today",    value: statusCounts.Completed,    icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50", href: "/admin/appointments?status=Completed" },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md p-5 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 font-medium mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Status breakdown strip ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["Pending", "Approved", "Completed", "Rejected"].map((s) => (
          <Link
            key={s}
            href={`/admin/appointments?status=${s}`}
            className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between hover:border-rose-200 transition-all group"
          >
            <span className="text-sm text-gray-500 font-medium">{s}</span>
            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${statusBadge[s]}`}>
              {statusCounts[s]}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Recent Appointments ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Recent Appointments</h2>
              <p className="text-xs text-gray-400">Latest 6 requests</p>
            </div>
          </div>
          <Link
            href="/admin/appointments"
            className="flex items-center gap-1.5 text-sm text-rose-600 font-semibold hover:underline"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-gray-50">
          {!recentAppts?.length ? (
            <div className="py-16 text-center text-gray-400 text-sm">No appointments yet.</div>
          ) : (
            recentAppts.map((appt) => {
              const name = appt.patients?.full_name || "Unknown";
              const badge = statusBadge[appt.status] || statusBadge.Pending;
              return (
                <div
                  key={appt.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                      {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-400">
                        {SERVICE_LABELS[appt.service_type] || appt.service_type} · {appt.appointment_date}
                        {appt.time_preference && ` · ${appt.time_preference}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${badge}`}>
                    {appt.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
