import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { 
  Activity, 
  MessageSquare, 
  ClipboardList, 
  ArrowRight, 
  Scale, 
  HeartPulse,
  Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export async function RecentVisitsSection({ patientId }) {
  const supabase = await createClient();

  const { data: visitLogs } = await supabase
    .from("visit_logs")
    .select("*")
    .eq("patient_id", patientId)
    .order("visit_date", { ascending: false })
    .limit(3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      {/* Consultation Quick Callout */}
      <div className="bg-gradient-to-br from-secondary/50 via-card to-secondary/30 border border-border rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-foreground">Need Advice from Midwife?</h4>
            <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
              Have non-emergency questions regarding your symptoms or medications? Start a private consultation thread.
            </p>
          </div>
        </div>
        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold h-11 text-xs shadow-sm">
          <Link href="/patient/consultation">
            Open Private Consultation Thread
          </Link>
        </Button>
      </div>

      {/* Clinical Notes Card */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-base font-black text-foreground">Clinical Observations</h3>
          </div>
          {visitLogs && visitLogs.length > 0 && (
            <Link href="/patient/history" className="text-xs font-bold text-primary hover:underline">
              Full History
            </Link>
          )}
        </div>

        <div className="p-6 space-y-5">
          {visitLogs && visitLogs.length > 0 ? (
            visitLogs.map((log) => (
              <div key={log.id} className="relative pl-5 border-l-2 border-primary/20 pb-1 space-y-2">
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    {format(new Date(log.visit_date), "MMM d, yyyy")}
                  </span>
                  {(log.bp || log.weight) && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      {log.bp && <span>BP: {log.bp}</span>}
                      {log.weight && <span>• {log.weight}</span>}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground/90 italic leading-relaxed">
                  &ldquo;{log.doctor_notes}&rdquo;
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              variant="default"
              icon={Stethoscope}
              title="No Clinical Notes Yet"
              description="Your vital signs, physical exam notes, and midwife advice will be documented here after your initial clinic visit."
              className="p-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function RecentVisitsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-full h-3" />
          </div>
        </div>
        <Skeleton className="w-full h-11 rounded-2xl" />
      </div>
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <Skeleton className="w-40 h-5" />
        <div className="space-y-4">
          <Skeleton className="w-full h-16 rounded-xl" />
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
