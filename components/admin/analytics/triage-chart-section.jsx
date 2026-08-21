import { createClient } from "@/utils/supabase/server";
import { TriageDistributionChart } from "./triage-distribution-chart";
import { getClinicTodayDateString } from "@/lib/utils";

export async function TriageChartSection() {
  const supabase = await createClient();
  const todayStr = getClinicTodayDateString();

  const { data, error } = await supabase.rpc("get_today_triage_distribution", {
    target_date: todayStr,
  });

  if (error) {
    console.error("[TriageChartSection] RPC error:", error.message);
  }

  return <TriageDistributionChart data={data || []} />;
}
