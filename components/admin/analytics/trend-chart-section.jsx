import { createClient } from "@/utils/supabase/server";
import { MonthlyTrendChart } from "./monthly-trend-chart";

export async function TrendChartSection() {
  const supabase = await createClient();

  // Compute date 5 months ago in YYYY-MM-01 format
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  const startMonthStr = d.toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_monthly_appointment_trends", {
    start_date: startMonthStr,
  });

  if (error) {
    console.error("[TrendChartSection] RPC error:", error.message);
  }

  return <MonthlyTrendChart data={data || []} />;
}
