"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Activity,
  BarChart3,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/shared/theme-provider";
import {
  useMLPredictions,
  type PredictionRow,
} from "@/hooks/use-ml-predictions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface MLPredictionsTabProps {
  refreshEnabled?: boolean;
}

const RISK_CONFIG = {
  ALTO: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: ShieldAlert },
  MEDIO: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
  BAJO: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: ShieldCheck },
  MINIMO: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: ShieldCheck },
} as const;

export function MLPredictionsTab({ refreshEnabled }: MLPredictionsTabProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const {
    rotationEmployees,
    rotationSegments,
    rotationRiskCounts,
    absenteeismEmployees,
    absenteeismRiskCounts,
    forecast,
    predictionDate,
    loading,
    error,
  } = useMLPredictions();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="mt-2 h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-6">
          <p className="text-amber-800 dark:text-amber-200">
            No se pudieron cargar las predicciones. Verifica que existan predicciones en{" "}
            <code>ml_predictions_log</code>.
          </p>
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const hasRotation = rotationEmployees.length > 0;
  const hasAbsenteeism = absenteeismEmployees.length > 0;
  const hasForecast = forecast.length > 0;

  if (!hasRotation && !hasAbsenteeism && !hasForecast) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Sin predicciones disponibles</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entrena los modelos de ML y genera predicciones para ver los resultados aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {predictionDate && (
        <p className="text-xs text-muted-foreground">
          Última predicción: {predictionDate}
        </p>
      )}

      <Tabs defaultValue="rotation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rotation" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            Rotación
          </TabsTrigger>
          <TabsTrigger value="absenteeism" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5" />
            Ausentismo
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="causes" className="gap-1.5 text-xs sm:text-sm">
            <Brain className="h-3.5 w-3.5" />
            Causas
          </TabsTrigger>
        </TabsList>

        {/* --- ROTATION TAB --- */}
        <TabsContent value="rotation" className="space-y-6 mt-4">
          <RotationSection
            employees={rotationEmployees}
            segments={rotationSegments}
            riskCounts={rotationRiskCounts}
            isDark={isDark}
            refreshEnabled={refreshEnabled}
          />
        </TabsContent>

        {/* --- ABSENTEEISM TAB --- */}
        <TabsContent value="absenteeism" className="space-y-6 mt-4">
          <AbsenteeismSection
            employees={absenteeismEmployees}
            riskCounts={absenteeismRiskCounts}
            isDark={isDark}
            refreshEnabled={refreshEnabled}
          />
        </TabsContent>

        {/* --- FORECAST TAB --- */}
        <TabsContent value="forecast" className="space-y-6 mt-4">
          <ForecastSection
            forecast={forecast}
            isDark={isDark}
            refreshEnabled={refreshEnabled}
          />
        </TabsContent>

        {/* --- CAUSES TAB --- */}
        <TabsContent value="causes" className="space-y-6 mt-4">
          <CausesSection isDark={isDark} refreshEnabled={refreshEnabled} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   ROTATION SECTION
   ============================================================ */
function RotationSection({
  employees,
  segments,
  riskCounts,
  isDark,
  refreshEnabled,
}: {
  employees: PredictionRow[];
  segments: { segment_type: string; segment_value: string; predicted_count: number; horizon: number }[];
  riskCounts: Record<string, number>;
  isDark: boolean;
  refreshEnabled?: boolean;
}) {
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [horizonFilter, setHorizonFilter] = useState<string>("28");

  const filteredEmployees = useMemo(() => {
    let result = employees.filter((e) => e.horizon === Number(horizonFilter));
    if (riskFilter !== "all") {
      result = result.filter((e) => e.risk_level === riskFilter);
    }
    return result.sort((a, b) => (b.predicted_probability ?? 0) - (a.predicted_probability ?? 0));
  }, [employees, horizonFilter, riskFilter]);

  const segmentChartData = useMemo(() => {
    return segments
      .filter((s) => s.segment_type === "area" && s.horizon === 28)
      .sort((a, b) => b.predicted_count - a.predicted_count)
      .slice(0, 10)
      .map((s) => ({
        name: s.segment_value.length > 20 ? s.segment_value.slice(0, 20) + "..." : s.segment_value,
        bajas_predichas: Number(s.predicted_count.toFixed(1)),
      }));
  }, [segments]);

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RiskKPICard label="Riesgo ALTO" count={riskCounts.ALTO} level="ALTO" refreshEnabled={refreshEnabled} />
        <RiskKPICard label="Riesgo MEDIO" count={riskCounts.MEDIO} level="MEDIO" refreshEnabled={refreshEnabled} />
        <RiskKPICard label="Riesgo BAJO" count={riskCounts.BAJO} level="BAJO" refreshEnabled={refreshEnabled} />
        <RiskKPICard label="Riesgo MINIMO" count={riskCounts.MINIMO} level="MINIMO" refreshEnabled={refreshEnabled} />
      </div>

      {/* Employee Table */}
      <EmployeeRiskTable
        title="Empleados en riesgo de rotación"
        employees={filteredEmployees}
        horizonFilter={horizonFilter}
        riskFilter={riskFilter}
        onHorizonChange={setHorizonFilter}
        onRiskChange={setRiskFilter}
        showHorizonFilter
        refreshEnabled={refreshEnabled}
      />

      {/* Segments chart */}
      {segmentChartData.length > 0 && (
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Bajas predichas por área (28d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentChartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="bajas_predichas" fill={isDark ? "#f97316" : "#ea580c"} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ============================================================
   ABSENTEEISM SECTION
   ============================================================ */
function AbsenteeismSection({
  employees,
  riskCounts,
  isDark,
  refreshEnabled,
}: {
  employees: PredictionRow[];
  riskCounts: Record<string, number>;
  isDark: boolean;
  refreshEnabled?: boolean;
}) {
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filteredEmployees = useMemo(() => {
    let result = employees.filter((e) => e.horizon === 28);
    if (riskFilter !== "all") {
      result = result.filter((e) => e.risk_level === riskFilter);
    }
    return result.sort((a, b) => (b.predicted_probability ?? 0) - (a.predicted_probability ?? 0));
  }, [employees, riskFilter]);

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Sin predicciones de ausentismo</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entrena el modelo <code>absenteeism_risk</code> y genera predicciones.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Distribution chart
  const distributionData = [
    { level: "ALTO", count: riskCounts.ALTO, fill: "#ef4444" },
    { level: "MEDIO", count: riskCounts.MEDIO, fill: "#f59e0b" },
    { level: "BAJO", count: riskCounts.BAJO, fill: "#3b82f6" },
    { level: "MINIMO", count: riskCounts.MINIMO, fill: "#22c55e" },
  ];

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RiskKPICard label="Riesgo ALTO" count={riskCounts.ALTO} level="ALTO" refreshEnabled={refreshEnabled} />
        <RiskKPICard label="Riesgo MEDIO" count={riskCounts.MEDIO} level="MEDIO" refreshEnabled={refreshEnabled} />
        <RiskKPICard label="Riesgo BAJO" count={riskCounts.BAJO} level="BAJO" refreshEnabled={refreshEnabled} />
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total evaluados
            </p>
            <p className="mt-1 text-3xl font-bold">{filteredEmployees.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">empleados operativos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribution chart */}
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribución de riesgo de ausentismo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                {/* Each bar colored by risk level */}
                <Bar dataKey="count" name="Empleados" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <EmployeeRiskTable
          title="Empleados en riesgo de ausentismo"
          employees={filteredEmployees}
          horizonFilter="28"
          riskFilter={riskFilter}
          onRiskChange={setRiskFilter}
          refreshEnabled={refreshEnabled}
        />
      </div>
    </>
  );
}

/* ============================================================
   FORECAST SECTION
   ============================================================ */
function ForecastSection({
  forecast,
  isDark,
  refreshEnabled,
}: {
  forecast: { code: string; horizon: number; predicted_count: number }[];
  isDark: boolean;
  refreshEnabled?: boolean;
}) {
  const forecastChartData = useMemo(() => {
    const byCode = new Map<string, { code: string; "7d"?: number; "14d"?: number; "28d"?: number }>();
    for (const f of forecast) {
      if (!byCode.has(f.code)) byCode.set(f.code, { code: f.code });
      const entry = byCode.get(f.code)!;
      if (f.horizon === 7) entry["7d"] = Number(f.predicted_count.toFixed(1));
      if (f.horizon === 14) entry["14d"] = Number(f.predicted_count.toFixed(1));
      if (f.horizon === 28) entry["28d"] = Number(f.predicted_count.toFixed(1));
    }
    return Array.from(byCode.values()).sort((a, b) => (b["28d"] ?? 0) - (a["28d"] ?? 0));
  }, [forecast]);

  const totalForecast28d = useMemo(() => {
    return forecast.filter((f) => f.horizon === 28).reduce((sum, f) => sum + f.predicted_count, 0);
  }, [forecast]);

  const totalForecast7d = useMemo(() => {
    return forecast.filter((f) => f.horizon === 7).reduce((sum, f) => sum + f.predicted_count, 0);
  }, [forecast]);

  if (forecast.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Sin forecast de ausencias</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Entrena el modelo <code>absence_forecast</code> y genera predicciones.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ausencias próx. 7d
            </p>
            <p className="mt-1 text-3xl font-bold">{totalForecast7d.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ausencias próx. 28d
            </p>
            <p className="mt-1 text-3xl font-bold">{totalForecast28d.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Códigos monitoreados
            </p>
            <p className="mt-1 text-3xl font-bold">{forecastChartData.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast chart */}
      <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Forecast de ausencias por código de incidencia</CardTitle>
          <CardDescription>Proyección SARIMAX a 7, 14 y 28 días</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={forecastChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="code" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="7d" fill="#3b82f6" name="7 días" radius={[4, 4, 0, 0]} />
              <Bar dataKey="14d" fill="#f59e0b" name="14 días" radius={[4, 4, 0, 0]} />
              <Bar dataKey="28d" fill="#ef4444" name="28 días" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Detalle por código</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">7 días</TableHead>
                <TableHead className="text-right">14 días</TableHead>
                <TableHead className="text-right">28 días</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecastChartData.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell className="text-right">{row["7d"] ?? "—"}</TableCell>
                  <TableCell className="text-right">{row["14d"] ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{row["28d"] ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/* ============================================================
   CAUSES (SHAP) SECTION
   ============================================================ */
interface SHAPFeature {
  feature: string;
  importance: number;
}

interface AttritionAnalysis {
  model_id: string;
  model_name: string;
  last_trained_at: string | null;
  metrics: Record<string, unknown>;
  artifacts: {
    classification_report?: Record<string, unknown>;
    shap_top_features?: SHAPFeature[];
    per_class_shap?: Record<string, SHAPFeature[]>;
  };
}

function CausesSection({ isDark, refreshEnabled }: { isDark: boolean; refreshEnabled?: boolean }) {
  const [analysis, setAnalysis] = useState<AttritionAnalysis | null>(null);
  const [causesLoading, setCausesLoading] = useState(true);
  const [causesError, setCausesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalysis() {
      try {
        setCausesLoading(true);
        // Try fetching from local ML service or the stored metrics
        const resp = await fetch("/api/ml/models/attrition_causes/analysis");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancelled) {
          setAnalysis(data);
          setCausesError(null);
        }
      } catch {
        // Fallback: try reading from stored metrics via ML service directly
        try {
          const resp2 = await fetch("http://localhost:8001/models/attrition_causes/analysis");
          if (!resp2.ok) throw new Error(`HTTP ${resp2.status}`);
          const data2 = await resp2.json();
          if (!cancelled) {
            setAnalysis(data2);
            setCausesError(null);
          }
        } catch {
          if (!cancelled) {
            setCausesError("No se pudo cargar el análisis SHAP. Verifica que el modelo esté entrenado.");
          }
        }
      } finally {
        if (!cancelled) setCausesLoading(false);
      }
    }
    fetchAnalysis();
    return () => { cancelled = true; };
  }, []);

  if (causesLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="mt-4 h-64 rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (causesError || !analysis) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-6">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-center text-lg font-medium">Análisis SHAP no disponible</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {causesError || "Entrena el modelo attrition_causes para ver las causas raíz de bajas."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const shapFeatures = analysis.artifacts?.shap_top_features ?? [];
  const perClassShap = analysis.artifacts?.per_class_shap ?? {};
  const classReport = analysis.artifacts?.classification_report ?? {};
  const metrics = analysis.metrics ?? {};
  const classes = Object.keys(perClassShap);

  // Chart data for top features
  const shapChartData = shapFeatures.slice(0, 12).map((f) => ({
    feature: f.feature.length > 25 ? f.feature.slice(0, 25) + "..." : f.feature,
    importance: Number(f.importance.toFixed(4)),
  }));

  return (
    <>
      {/* Metrics summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Weighted F1
            </p>
            <p className="mt-1 text-3xl font-bold">
              {typeof metrics.weighted_f1 === 'number' ? (metrics.weighted_f1 as number).toFixed(2) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Clases de motivo
            </p>
            <p className="mt-1 text-3xl font-bold">{classes.length || "—"}</p>
          </CardContent>
        </Card>
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Muestras entrenamiento
            </p>
            <p className="mt-1 text-3xl font-bold">
              {typeof metrics.train_size === 'number' ? metrics.train_size : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SHAP Feature Importance Chart */}
      {shapChartData.length > 0 && (
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Factores que más influyen en las bajas</CardTitle>
            <CardDescription>Importancia SHAP — qué variables predicen mejor el motivo de baja</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={shapChartData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="importance" fill={isDark ? "#8b5cf6" : "#7c3aed"} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-class top features */}
      {classes.length > 0 && (
        <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Factores principales por motivo de baja</CardTitle>
            <CardDescription>Top 5 features SHAP para cada tipo de terminación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((cls) => (
                <div key={cls} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">{cls}</p>
                  <div className="space-y-1">
                    {(perClassShap[cls] ?? []).slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate text-muted-foreground">{f.feature}</span>
                        <span className="ml-2 font-mono font-medium">{f.importance.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */

function EmployeeRiskTable({
  title,
  employees,
  horizonFilter,
  riskFilter,
  onHorizonChange,
  onRiskChange,
  showHorizonFilter,
  refreshEnabled,
}: {
  title: string;
  employees: PredictionRow[];
  horizonFilter: string;
  riskFilter: string;
  onHorizonChange?: (value: string) => void;
  onRiskChange?: (value: string) => void;
  showHorizonFilter?: boolean;
  refreshEnabled?: boolean;
}) {
  return (
    <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {showHorizonFilter && onHorizonChange && (
            <Select value={horizonFilter} onValueChange={onHorizonChange}>
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">14 días</SelectItem>
                <SelectItem value="28">28 días</SelectItem>
              </SelectContent>
            </Select>
          )}
          {onRiskChange && (
            <Select value={riskFilter} onValueChange={onRiskChange}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ALTO">Alto</SelectItem>
                <SelectItem value="MEDIO">Medio</SelectItem>
                <SelectItem value="BAJO">Bajo</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead># Empleado</TableHead>
                <TableHead>Probabilidad</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Género</TableHead>
                <TableHead>Generación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin predicciones para este filtro
                  </TableCell>
                </TableRow>
              ) : (
                employees.slice(0, 100).map((emp) => (
                  <TableRow key={`${emp.model_name}-${emp.numero_empleado}-${emp.horizon}`}>
                    <TableCell className="font-mono">{emp.numero_empleado}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {((emp.predicted_probability ?? 0) * 100).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={emp.risk_level ?? "MINIMO"} />
                    </TableCell>
                    <TableCell>{emp.genero ?? "—"}</TableCell>
                    <TableCell>{emp.generacion ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {employees.length > 100 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Mostrando 100 de {employees.length} empleados
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RiskKPICard({
  label,
  count,
  level,
  refreshEnabled,
}: {
  label: string;
  count: number;
  level: keyof typeof RISK_CONFIG;
  refreshEnabled?: boolean;
}) {
  const config = RISK_CONFIG[level];
  const Icon = config.icon;

  return (
    <Card className={cn(refreshEnabled && "border-brand-border/40 bg-white/90 dark:bg-brand-surface/90")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-1 text-3xl font-bold">{count}</p>
        <Badge variant="secondary" className={cn("mt-2 text-xs", config.color)}>
          {level}
        </Badge>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ level }: { level: string }) {
  const config = RISK_CONFIG[level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.MINIMO;
  return (
    <Badge variant="secondary" className={cn("text-xs", config.color)}>
      {level}
    </Badge>
  );
}
