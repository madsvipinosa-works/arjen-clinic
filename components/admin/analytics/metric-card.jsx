import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  colorScheme = "primary", // "primary" | "secondary" | "emerald" | "amber" | "indigo" | "rose"
  className,
}) {
  const schemeStyles = {
    primary: {
      iconBg: "bg-primary/10 text-primary border-primary/20",
      accent: "text-primary",
    },
    emerald: {
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    amber: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      accent: "text-amber-600 dark:text-amber-400",
    },
    indigo: {
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    rose: {
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      accent: "text-rose-600 dark:text-rose-400",
    },
  }[colorScheme] || {
    iconBg: "bg-primary/10 text-primary border-primary/20",
    accent: "text-primary",
  };

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-xs hover:shadow-md transition-all rounded-3xl bg-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-foreground tracking-tight">
                {typeof value === "number" ? value.toLocaleString() : value}
              </h3>
            </div>
          </div>
          {Icon && (
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs shrink-0", schemeStyles.iconBg)}>
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-medium">
            {subtitle && <span>{subtitle}</span>}
            {trend && (
              <span className={cn("font-bold", trend.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {trend} {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
