"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Clock } from "lucide-react";

const STATUS_COLORS = {
  "Waiting": "#f59e0b",       // Amber
  "Vital Signs": "#6366f1",   // Indigo
  "Consultation": "#f43f5e",  // Rose
  "Discharged": "#10b981",    // Emerald
};

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-xl text-card-foreground min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: data.payload.fill }}
        />
        <span className="font-bold text-xs text-foreground">{data.name}</span>
      </div>
      <p className="text-xs text-muted-foreground pl-4.5 font-medium">
        <span className="font-black text-foreground">{data.value}</span> Patient{data.value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function TriageDistributionChart({ data = [] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = (data || []).map((item) => ({
    name: item.status_name,
    value: Number(item.patient_count || 0),
    fill: STATUS_COLORS[item.status_name] || "#94a3b8",
  }));

  const totalPatients = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const hasData = totalPatients > 0;

  if (!isMounted) {
    return (
      <Card className="rounded-3xl border-border/80 min-h-[380px] p-6 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 w-44 bg-muted animate-pulse rounded-md" />
          <div className="h-3 w-56 bg-muted/60 animate-pulse rounded-md" />
        </div>
        <div className="h-64 w-full bg-muted/20 rounded-2xl animate-pulse flex items-center justify-center my-4">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <div className="h-3 w-36 bg-muted/60 animate-pulse rounded-md" />
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-border/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Live Triage Distribution
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Current breakdown of approved patients across triage stages
            </CardDescription>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Today
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        {!hasData ? (
          <div className="h-64 w-full border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60 space-y-2">
            <Clock className="w-8 h-8 opacity-40" />
            <p className="text-sm font-bold">No active triage records today</p>
            <p className="text-xs max-w-xs">
              Approved patient appointments for today will populate this distribution as they check in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={4}
                    cornerRadius={6}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {totalPatients}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Today
                </span>
              </div>
            </div>

            {/* Custom Status Legend Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              {chartData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-muted/40 text-xs border border-border/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-[11px] font-medium text-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-black text-xs text-foreground pl-2">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
