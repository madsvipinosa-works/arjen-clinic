import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { 
  ClipboardList, 
  Activity, 
  Thermometer, 
  Scale, 
  Search,
  ChevronRight
} from "lucide-react";

export default async function PatientHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: visitLogs } = await supabase
    .from("visit_logs")
    .select("*")
    .eq("patient_id", user.id)
    .order("visit_date", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Medical History</h1>
          </div>
          <p className="text-gray-500 font-medium">Your complete record of clinic visits and clinical observations.</p>
        </div>
      </div>

      {/* Timeline of Visits */}
      <div className="relative">
        {/* Central Line */}
        <div className="absolute left-[30px] top-0 bottom-0 w-0.5 bg-rose-100 hidden md:block" />

        <div className="space-y-12">
          {visitLogs?.length > 0 ? (
            visitLogs.map((log, index) => (
              <div key={log.id} className="relative md:pl-20 group">
                {/* Timeline Dot */}
                <div className="absolute left-0 md:left-[21px] top-0 w-5 h-5 rounded-full bg-white border-4 border-rose-500 group-hover:scale-125 transition-transform z-10 shadow-sm" />
                
                <div className="bg-white rounded-[2rem] border border-rose-100 shadow-sm overflow-hidden transition-all group-hover:shadow-md group-hover:border-rose-200">
                  <div className="flex flex-col lg:flex-row">
                    {/* Log Date Side Box */}
                    <div className="lg:w-48 bg-rose-50/50 p-6 flex flex-col justify-center items-center text-center border-b lg:border-b-0 lg:border-r border-rose-100/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">
                        {format(new Date(log.visit_date), "yyyy")}
                      </p>
                      <p className="text-2xl font-black text-gray-900 leading-none">
                        {format(new Date(log.visit_date), "MMM d")}
                      </p>
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 p-6 md:p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                          <Activity className="w-5 h-5 text-rose-500" />
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Blood Pressure</p>
                            <p className="text-sm font-black text-gray-900">{log.bp}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                          <Scale className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight</p>
                            <p className="text-sm font-black text-gray-900">{log.weight}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <div className="h-0.5 w-6 bg-rose-200 rounded-full" />
                           <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Doctor's Observations</h4>
                        </div>
                        <p className="text-gray-600 leading-relaxed font-medium">
                          {log.doctor_notes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-gray-100 p-20 text-center">
              <ClipboardList className="w-16 h-16 text-gray-100 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-gray-900">No records found</h3>
              <p className="text-gray-400 font-medium max-w-sm mx-auto mt-4">
                Your medical history will be automatically updated here after your clinic visits. 
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-10 flex items-center justify-center gap-6 opacity-30">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">End of Record</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}
