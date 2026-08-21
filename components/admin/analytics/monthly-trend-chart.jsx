"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3.5 shadow-xl text-card-foreground min-w-[160px]">
      <p className="font-bold text-xs text-foreground mb-2 pb-1.5 border-b border-border/60 flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] font-normal text-muted-foreground">Monthly Activity</span>
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-xs gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-black text-foreground">
              {entry.value?.toLocaleString?.() ?? entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyTrendChart({ data = [] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Format data labels for Recharts
  const chartData = (data || []).map((item) => ({
    name: item.month_label,
    Total: Number(item.total_count || 0),
    Completed: Number(item.completed_count || 0),
    Cancelled: Number(item.cancelled_count || 0),
  }));

  const hasData = chartData.length > 0 && chartData.some((d) => d.Total > 0);

  if (!isMounted) {
    return (
      <Card className="rounded-3xl border-border/80 min-h-[380px] p-6 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-64 bg-muted/60 animate-pulse rounded-md" />
        </div>
        <div className="h-64 w-full bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center my-4">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <div className="h-3 w-40 bg-muted/60 animate-pulse rounded-md" />
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-border/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Appointment Booking Trends
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Monthly appointment volume, completed checkups, and cancellations
            </CardDescription>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
            <Calendar className="w-3 h-3" /> Trailing 6 Months
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-4">
        {!hasData ? (
          <div className="h-64 w-full border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60 space-y-2">
            <Calendar className="w-8 h-8 opacity-40" />
            <p className="text-sm font-bold">No appointment records logged yet</p>
            <p className="text-xs max-w-xs">
              As patients book check-ups and visits, monthly volume graphs will automatically display here.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground font-medium"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  className="text-muted-foreground font-medium"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 16, fontSize: 12, fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#totalGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="Completed"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#completedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
