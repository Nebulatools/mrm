"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { KPIResult } from "@/lib/kpi-calculator";
import { cn } from "@/lib/utils";

interface KPICardProps {
  kpi: KPIResult;
  icon?: React.ReactNode;
  refreshEnabled?: boolean;
  // Valores secundarios opcionales (p.ej., solo motivos clave)
  secondaryValue?: number;
  secondaryLabel?: string;
  secondaryIsPercent?: boolean;
}

export function KPICard({
  kpi,
  icon,
  refreshEnabled = false,
  secondaryValue,
  secondaryLabel,
  secondaryIsPercent,
}: KPICardProps) {
  const getTrendIcon = (variance?: number) => {
    if (!variance || Math.abs(variance) < 1) return null;
    return variance > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getTrendColor = (variance?: number) => {
    if (!variance || Math.abs(variance) < 1) return "secondary";
    return variance > 0 ? "default" : "destructive";
  };

  const formatValue = (value: number, category: string): string => {
    if (category === 'costs') {
      return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
    }
    if (kpi.name.includes('%') || kpi.name.includes('Rotación')) {
      return `${value.toFixed(1)}%`;
    }
    if (kpi.name.includes('Prom') && value < 10) {
      return value.toFixed(1);
    }
    return Math.round(value).toLocaleString('es-MX');
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-border bg-white dark:bg-gray-900",
        refreshEnabled &&
          "rounded-2xl border-brand-border/70 bg-white/90 shadow-brand backdrop-blur-sm transition-shadow dark:border-brand-border/40 dark:bg-gray-900/80"
      )}
    >
      <CardHeader className={cn("pb-2", refreshEnabled && "pb-4")}>
        <div className={cn("flex items-center justify-between", refreshEnabled && "gap-4")}>
          <div className="flex items-center gap-2">
            {icon && (
              <div className={cn("text-gray-500", refreshEnabled && "text-brand-ink/70")}>
                {icon}
              </div>
            )}
            <CardTitle
              className={cn(
                "text-sm font-medium text-gray-600 dark:text-gray-400",
                refreshEnabled && "font-heading text-xs uppercase tracking-[0.16em] text-brand-ink/70"
              )}
            >
              {kpi.name}
            </CardTitle>
          </div>
          {getTrendIcon(kpi.variance_percentage)}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("flex items-center justify-between", refreshEnabled && "mt-2")}>
          <div
            className={cn(
              "text-2xl font-bold",
              refreshEnabled && "font-heading text-3xl tracking-tight text-brand-ink"
            )}
          >
            {formatValue(kpi.value, kpi.category)}
          </div>
          {kpi.variance_percentage !== undefined && (
            <Badge
              variant={getTrendColor(kpi.variance_percentage)}
              className={cn(
                "text-xs",
                refreshEnabled &&
                  "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-semibold text-brand-ink"
              )}
            >
              {kpi.variance_percentage > 0 ? "+" : ""}
              {kpi.variance_percentage.toFixed(1)}%
            </Badge>
          )}
        </div>
        {secondaryValue !== undefined && secondaryLabel && (
          <div
            className={cn(
              "mt-1 text-xs text-gray-600 dark:text-gray-400",
              refreshEnabled && "text-sm text-brand-ink/70"
            )}
          >
            {secondaryLabel}:{" "}
            {secondaryIsPercent
              ? `${secondaryValue.toFixed(1)}%`
              : secondaryValue.toLocaleString("es-MX")}
          </div>
        )}

        {/* Target and Previous Value */}
        <div className={cn("mt-2 space-y-1", refreshEnabled && "mt-4 space-y-2 text-sm")}>
          {kpi.target && (
            <div className={cn("text-xs text-gray-500", refreshEnabled && "text-brand-ink/60")}>
              Meta: {formatValue(kpi.target, kpi.category)}
            </div>
          )}
          {kpi.previous_value !== undefined && kpi.previous_value > 0 && (
            <div className={cn("text-xs text-gray-500", refreshEnabled && "text-brand-ink/60")}>
              Anterior: {formatValue(kpi.previous_value, kpi.category)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton({ refreshEnabled = false }: { refreshEnabled?: boolean }) {
  return (
    <Card
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden border border-border bg-white/60 dark:bg-gray-900/60",
        refreshEnabled &&
          "rounded-2xl border-brand-border/60 bg-white/80 shadow-brand backdrop-blur-sm dark:border-brand-border/40 dark:bg-gray-900/70"
      )}
    >
      <CardHeader className={cn("pb-2", refreshEnabled && "pb-4")}>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "h-4 w-24 animate-pulse rounded bg-muted",
              refreshEnabled && "bg-brand-muted"
            )}
          />
          <span
            className={cn(
              "h-4 w-10 animate-pulse rounded bg-muted",
              refreshEnabled && "bg-brand-muted"
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <span
          className={cn(
            "block h-8 w-28 animate-pulse rounded bg-muted",
            refreshEnabled && "bg-brand-muted"
          )}
        />
        <span
          className={cn(
            "block h-3 w-20 animate-pulse rounded bg-muted",
            refreshEnabled && "bg-brand-muted"
          )}
        />
        <span
          className={cn(
            "block h-3 w-32 animate-pulse rounded bg-muted",
            refreshEnabled && "bg-brand-muted"
          )}
        />
      </CardContent>
    </Card>
  );
}
