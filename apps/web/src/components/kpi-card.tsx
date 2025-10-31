"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const normalizedName = kpi.name.toLowerCase();
  const variancePercentage = typeof kpi.variance_percentage === 'number' ? kpi.variance_percentage : null;
  const rawDifference = kpi.previous_value !== undefined ? kpi.value - kpi.previous_value : null;
  const showAbsoluteVariance =
    /baja/.test(normalizedName) ||
    normalizedName.includes('activos');
  const changeValue = showAbsoluteVariance ? rawDifference : variancePercentage;
  const significantVariance = changeValue !== null && Math.abs(changeValue) >= (showAbsoluteVariance ? 1 : 0.1);
  const trendDirection =
    !significantVariance || changeValue === null || changeValue === 0
      ? 'flat'
      : changeValue > 0
        ? 'up'
        : 'down';
  const isIncidenciasOPermisos = /incidenc|permiso/.test(normalizedName);
  const resolveColorState = () => {
    if (!significantVariance || changeValue === null || changeValue === 0) {
      return 'neutral' as const;
    }
    const positive = changeValue > 0;
    if (positive) {
      return (isIncidenciasOPermisos ? 'negative' : 'positive') as const;
    }
    return (isIncidenciasOPermisos ? 'positive' : 'negative') as const;
  };
  const changeColorState = resolveColorState();
  const trendColor =
    changeColorState === 'positive'
      ? 'text-green-600 dark:text-green-400'
      : changeColorState === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-400 dark:text-gray-500';
  const trendBadgeClass =
    changeColorState === 'positive'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : changeColorState === 'negative'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  const TrendIconComponent = trendDirection === 'flat'
    ? null
    : trendDirection === 'up'
      ? TrendingUp
      : TrendingDown;
  const formatAbsoluteVariance = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = value.toLocaleString('es-MX', {
      minimumFractionDigits: absValue < 1 ? 1 : 0,
      maximumFractionDigits: absValue < 1 ? 1 : 0
    });
    return value > 0 ? `+${formatted}` : formatted;
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
                "text-sm font-semibold text-gray-700 dark:text-gray-200",
                refreshEnabled && "font-heading text-xs uppercase tracking-[0.16em] text-brand-ink"
              )}
            >
              {kpi.name}
            </CardTitle>
          </div>
          {TrendIconComponent && (
            <TrendIconComponent className={cn("h-4 w-4", trendColor)} />
          )}
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
          {changeValue !== null && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                trendBadgeClass,
                refreshEnabled && "border border-transparent"
              )}
            >
              {showAbsoluteVariance
                ? formatAbsoluteVariance(changeValue)
                : `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(1)}%`}
            </span>
          )}
        </div>
        {secondaryValue !== undefined && secondaryLabel && (
          <div
            className={cn(
              "mt-1 text-xs text-gray-600 dark:text-gray-400",
              refreshEnabled && "text-sm text-brand-ink/70"
            )}
          >
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {secondaryLabel}:
            </span>{' '}
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
