import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/**
 * Reusable Actionable Empty State Component
 *
 * @param {Object} props
 * @param {import("lucide-react").LucideIcon} [props.icon=Sparkles]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 * @param {string} [props.className]
 * @param {"default" | "card" | "dashed"} [props.variant="card"]
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
  variant = "card",
}) {
  const variantStyles = {
    card: "bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-sm text-center",
    dashed: "bg-card/50 border-2 border-dashed border-border rounded-3xl p-8 sm:p-12 text-center",
    default: "p-6 sm:p-8 text-center",
  };

  return (
    <div
      className={cn(
        variantStyles[variant] || variantStyles.card,
        "flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500",
        className
      )}
    >
      <div className="w-16 h-16 rounded-3xl bg-secondary/40 border border-secondary flex items-center justify-center text-primary shadow-xs">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
