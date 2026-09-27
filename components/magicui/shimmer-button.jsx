import React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI Shimmer Button
 * A button with a perimeter shimmer border animation.
 */
export const ShimmerButton = React.forwardRef(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.08em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={{
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        }}
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-rose-400/30 px-5 py-2.5 whitespace-nowrap text-white [background:var(--bg)] shadow-md shadow-rose-900/10 font-bold text-sm",
          "transform-gpu transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98] active:translate-y-px",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-30 blur-[2px]",
            "@container absolute inset-0 overflow-visible"
          )}
        >
          {/* spark */}
          <div className="animate-shimmer-slide absolute inset-0 aspect-[1] h-full rounded-none">
            {/* spark before */}
            <div className="animate-spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
          </div>
        </div>

        {/* Highlight inner glow */}
        <div
          className={cn(
            "absolute inset-0 size-full pointer-events-none",
            "rounded-[calc(var(--radius)-1px)] shadow-[inset_0_-2px_6px_rgba(255,255,255,0.25)]",
            "transform-gpu transition-all duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-4px_10px_rgba(255,255,255,0.4)]"
          )}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>

        {/* backdrop */}
        <div
          className={cn(
            "absolute inset-[var(--cut)] -z-20 [border-radius:calc(var(--radius)-var(--cut))] [background:var(--bg)]"
          )}
        />
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
