import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { MetricCardsSection } from "@/components/admin/analytics/metric-cards-section";
import { TrendChartSection } from "@/components/admin/analytics/trend-chart-section";
import { TriageChartSection } from "@/components/admin/analytics/triage-chart-section";
import { MetricCardsSkeleton, ChartSkeleton } from "@/components/admin/analytics/skeletons";
import { BarChart3, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { getClinicTodayDateString } from "@/lib/utils";

export const metadata = {
  title: "Analytics & Reports | AR-JEN Clinic Admin",
  description: "Live operational metrics, appointment volume trends, and triage distribution for AR-JEN Clinic.",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // ── Strict RBAC Auth Guard ────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  // Check role in users profile table or app_metadata
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = userData?.role || user.app_metadata?.role;
  if (userRole !== "admin" && userRole !== "staff") {
    redirect("/admin/login");
  }

  const todayStr = getClinicTodayDateString();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 rounded-3xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider border border-primary/20">
              <BarChart3 className="w-3.5 h-3.5" /> Clinic Intelligence
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Admin Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mt-2">
            Executive Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time operations, maternal health trends, and clinical capacity insights.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="px-4 py-2 rounded-2xl bg-muted/50 border border-border text-xs font-bold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PHT (Asia/Manila): {todayStr}</span>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Streaming Section ───────────────────────────────────── */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCardsSection />
      </Suspense>

      {/* ── High-Performance Charts Streaming Section ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton title="Appointment Booking Trends" />}>
          <TrendChartSection />
        </Suspense>

        <Suspense fallback={<ChartSkeleton title="Live Triage Distribution" />}>
          <TriageChartSection />
        </Suspense>
      </div>
    </div>
  );
}
