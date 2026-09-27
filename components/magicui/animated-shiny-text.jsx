import React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI Animated Shiny Text
 * A shimmering glare effect that pans across text.
 */
export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) {
  return (
    <span
      style={{
        "--shiny-width": `${shimmerWidth}px`,
      }}
      className={cn(
        "inline-block font-medium text-neutral-600/80 dark:text-neutral-300/80",
        // Shine animation effect
        "animate-shiny-text bg-[length:var(--shiny-width)_100%] bg-clip-text bg-no-repeat",
        "bg-gradient-to-r from-transparent via-rose-600/90 via-50% to-transparent dark:via-rose-300/90",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
