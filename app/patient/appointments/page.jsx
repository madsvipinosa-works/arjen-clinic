import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { 
  CalendarDays, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAppointment } from "../../actions";

export default async function PatientAppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", user.id)
    .order("appointment_date", { ascending: false });

  const statusConfig = {
    Pending:   { icon: HelpCircle, color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-100" },
    Approved:  { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    Rejected:  { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
    Completed: { icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    Cancelled: { icon: XCircle, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Appointments</h1>
        <p className="text-gray-500 mt-2 font-medium">Track your requests and clinic schedule.</p>
      </div>

      <div className="space-y-4">
        {appointments?.length > 0 ? (
          appointments.map((appt) => {
            const config = statusConfig[appt.status] || statusConfig.Pending;
            const canCancel = appt.status === 'Pending' || appt.status === 'Approved';
            
            return (
              <div key={appt.id} className={`bg-white rounded-3xl border ${config.border} p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md`}>
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center`}>
                    <config.icon className={`w-7 h-7 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{appt.service_type}</h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <p className="text-sm font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(appt.appointment_date), "MMMM d, yyyy")}
                      </p>
                      {appt.time_preference && (
                        <p className="text-sm font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                          <Clock className="w-3.5 h-3.5" />
                          {appt.time_preference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                  <div className="flex flex-col md:items-end">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${config.bg} ${config.color}`}>
                      {appt.status}
                    </span>
                  </div>
                  {canCancel && appt.status !== 'Cancelled' && (
                    <form action={cancelAppointment}>
                      <input type="hidden" name="id" value={appt.id} />
                      <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs uppercase tracking-widest px-4 h-10 rounded-xl">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDays className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-900">No appointments yet</h3>
            <p className="text-gray-400 font-medium max-w-xs mx-auto mt-2">
              You haven't scheduled any visits yet. Tap the button below to start your first booking.
            </p>
            <Button asChild className="mt-8 bg-rose-500 hover:bg-rose-600 rounded-full px-8">
              <a href="/book">Book Now</a>
            </Button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
        <div>
          <h4 className="font-black text-blue-900 uppercase tracking-widest text-xs mb-1">Clinic Policy</h4>
          <p className="text-sm text-blue-700 font-medium leading-relaxed">
            Please arrive 15 minutes before your scheduled time. If you need to reschedule or cancel, try to do so at least 24 hours in advance. For urgent concerns, use the Consultation portal.
          </p>
        </div>
      </div>
    </div>
  );
}
