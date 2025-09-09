"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { KPIResult } from "@/lib/kpi-calculator";

interface KPICardProps {
  kpi: KPIResult;
  icon?: React.ReactNode;
}

export function KPICard({ kpi, icon }: KPICardProps) {
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
      return `${value.toFixed(2)}%`;
    }
    if (kpi.name.includes('Prom') && value < 10) {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString('es-MX');
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-gray-500">{icon}</div>}
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {kpi.name}
            </CardTitle>
          </div>
          {getTrendIcon(kpi.variance_percentage)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {formatValue(kpi.value, kpi.category)}
          </div>
          {kpi.variance_percentage !== undefined && (
            <Badge variant={getTrendColor(kpi.variance_percentage)} className="text-xs">
              {kpi.variance_percentage > 0 ? '+' : ''}{kpi.variance_percentage.toFixed(1)}%
            </Badge>
          )}
        </div>
        
        {/* Target and Previous Value */}
        <div className="mt-2 space-y-1">
          {kpi.target && (
            <div className="text-xs text-gray-500">
              Meta: {formatValue(kpi.target, kpi.category)}
            </div>
          )}
          {kpi.previous_value !== undefined && kpi.previous_value > 0 && (
            <div className="text-xs text-gray-500">
              Anterior: {formatValue(kpi.previous_value, kpi.category)}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}