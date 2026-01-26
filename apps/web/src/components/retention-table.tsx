"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VisualizationContainer } from "@/components/shared/visualization-container";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type KPIResult } from "@/lib/kpi-calculator";

interface RetentionTableProps {
  kpis: KPIResult[];
  previousPeriodKpis?: KPIResult[];
}

interface TableRow {
  metric: string;
  current: number;
  previous: number;
  variance: number;
  target?: number;
  unit?: string;
}

export function RetentionTable({ kpis, previousPeriodKpis }: RetentionTableProps) {
  // Filtrar solo los KPIs de retención
  const retentionKpis = kpis.filter(kpi => kpi.category === 'retention');
  
  // Crear las filas de la tabla con datos mejorados
  const tableRows: TableRow[] = retentionKpis.map(kpi => {
    const previousKpi = previousPeriodKpis?.find(p => p.name === kpi.name);
    const currentValue = kpi.value;
    // Usar el valor del previous_value del KPI (ya calculado en kpi-calculator)
    const previousValue = kpi.previous_value !== undefined ? kpi.previous_value : previousKpi?.value || 0;
    const variance = kpi.variance_percentage || 0;
    
    return {
      metric: kpi.name,
      current: currentValue,
      previous: previousValue,
      variance: variance,
      target: kpi.target,
      unit: kpi.name.includes('Rotación') ? '%' : ''
    };
  });

  const getTrendIcon = (variance: number) => {
    if (Math.abs(variance) < 1) return <Minus className="h-4 w-4 text-gray-400" />;
    return variance > 0 ? 
      <TrendingUp className="h-4 w-4 text-red-600" /> : 
      <TrendingDown className="h-4 w-4 text-green-600" />;
  };

  const getTrendColor = (variance: number) => {
    if (Math.abs(variance) < 1) return "secondary";
    // Para retención, incrementos son generalmente negativos
    return variance > 0 ? "destructive" : "default";
  };

  const formatValue = (value: number, unit?: string) => {
    if (unit === '%') {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Tabla Comparativa de Rotación
          <Badge variant="outline" className="text-xs">
            Mes Actual vs Anterior
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VisualizationContainer
          title="Tabla comparativa de rotación"
          type="table"
          className="w-full"
          filename="tabla-rotacion-comparativa"
        >
          {(isFullscreen) => (
          <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                  Métrica
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                  Mes Actual
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                  Mes Anterior
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                  Variación
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">
                  Meta
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr 
                  key={row.metric} 
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/30' : 'bg-white dark:bg-transparent'
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    {row.metric}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatValue(row.current, row.unit)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-gray-600 dark:text-gray-400">
                      {formatValue(row.previous, row.unit)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(row.variance)}
                      <Badge variant={getTrendColor(row.variance)} className="text-xs">
                        {Math.abs(row.variance).toFixed(1)}%
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.target && (
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        {formatValue(row.target, row.unit)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </VisualizationContainer>

        {/* Nota explicativa */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Nota:</strong> En métricas de retención, las tendencias hacia abajo (↓) generalmente son positivas, 
            indicando menor rotación y mejor retención del personal.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
