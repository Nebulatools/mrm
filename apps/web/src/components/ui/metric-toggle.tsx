"use client";

import { cn } from "@/lib/utils";

interface MetricToggleProps {
  value: "percent" | "count";
  onChange: (value: "percent" | "count") => void;
  size?: "sm" | "md";
}

export function MetricToggle({ value, onChange, size = "sm" }: MetricToggleProps) {
  const buttonClass = cn(
    "px-2 py-0.5 text-xs font-medium transition-all",
    size === "sm" && "text-[10px] px-1.5 py-0.5",
    size === "md" && "text-xs px-2 py-1"
  );

  return (
    <div className="inline-flex rounded-md border border-border bg-muted/30 p-0.5">
      <button
        onClick={() => onChange("percent")}
        className={cn(
          buttonClass,
          value === "percent"
            ? "bg-background text-foreground shadow-sm rounded-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        %
      </button>
      <button
        onClick={() => onChange("count")}
        className={cn(
          buttonClass,
          value === "count"
            ? "bg-background text-foreground shadow-sm rounded-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        #
      </button>
    </div>
  );
}
