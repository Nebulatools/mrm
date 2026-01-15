"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type HorizonKey = "30" | "60" | "90";

interface TrendRow {
  month: string;
  actual: Record<HorizonKey, number>;
  predicted: Record<HorizonKey, number>;
  predicted_lower: Record<HorizonKey, number>;
  predicted_upper: Record<HorizonKey, number>;
  segments?: Array<{
    empresa: string | null;
    area: string | null;
    departamento: string | null;
    headcount: number;
    riesgo_promedio: number;
    riesgo_p75?: number;
  }>;
}

interface TrendBundle {
  horizons: number[];
  margin: number;
  monthly: TrendRow[];
  metadata?: Record<string, unknown>;
}

interface TrendResponse extends TrendBundle {
  model_id: string;
  model_name: string;
  last_trained_at?: string | null;
  segmented?: Record<string, TrendBundle>;
}

type ModelId = "rotation" | "segment_risk";

interface TrendState {
  data?: TrendResponse;
  loading: boolean;
  error?: string;
}

const MODELS: Array<{ id: ModelId; label: string }> = [
  { id: "rotation", label: "Predicción de rotación individual" },
  { id: "segment_risk", label: "Riesgo de rotación por segmento" },
];

const HORIZON_LABELS: Record<HorizonKey, string> = {
  "30": "30 días",
  "60": "60 días",
  "90": "90 días",
};

const valueFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "numeric",
});

function formatMonthLabel(value: string): string {
  try {
    // Parse as YYYY-MM-DD and create date at noon UTC to avoid timezone issues
    const [year, month] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    return format(date, "MMM", { locale: es }).toLowerCase();
  } catch {
    return value;
  }
}

export function ModelTrendsTab() {
  const INITIAL_STATE: Record<ModelId, TrendState> = {
    rotation: { loading: false },
    segment_risk: { loading: false },
  };

  const [activeModel, setActiveModel] = useState<ModelId>(MODELS[0].id);
  const [trendState, setTrendState] = useState<Record<ModelId, TrendState>>(INITIAL_STATE);

  const loadModel = async (modelId: ModelId) => {
    setTrendState((prev) => ({
      ...prev,
      [modelId]: { ...prev[modelId], loading: true, error: undefined },
    }));

    try {
      const response = await fetch(`/api/ml/models/${modelId}/trends`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Error al cargar tendencias");
      }

      setTrendState((prev) => ({
        ...prev,
        [modelId]: { data: payload as TrendResponse, loading: false },
      }));
    } catch (error) {
      setTrendState((prev) => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          loading: false,
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      }));
    }
  };

  useEffect(() => {
    const current = trendState[activeModel];
    if (!current?.data && !current?.loading && !current?.error) {
      void loadModel(activeModel);
    }
  }, [activeModel, trendState]);

  return (
    <Tabs value={activeModel} onValueChange={(value) => setActiveModel(value as ModelId)} className="space-y-6">
      <TabsList className="flex-wrap gap-2 bg-muted/40">
        {MODELS.map((model) => (
          <TabsTrigger key={model.id} value={model.id} className="whitespace-nowrap">
            {model.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {MODELS.map((model) => (
        <TabsContent key={model.id} value={model.id} className="space-y-6">
          <ModelTrendPanel
            modelId={model.id}
            modelLabel={model.label}
            state={trendState[model.id]}
            onReload={() => loadModel(model.id)}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface ModelTrendPanelProps {
  modelId: ModelId;
  modelLabel: string;
  state?: TrendState;
  onReload: () => void;
}

function ModelTrendPanel({ modelLabel, state, onReload }: ModelTrendPanelProps) {
  const data = state?.data;
  const loading = state?.loading ?? false;
  const error = state?.error;

  const segmentOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [{ id: "__ALL__", label: "Todos" }];
    const segmentedEntries = data?.segmented ? Object.keys(data.segmented) : [];
    segmentedEntries
      .sort((a, b) => a.localeCompare(b, "es"))
      .forEach((key) => {
        options.push({ id: key, label: key });
      });
    return options;
  }, [data?.segmented]);

  const [selectedSegment, setSelectedSegment] = useState<string>(segmentOptions[0]?.id ?? "__ALL__");

  useEffect(() => {
    if (!segmentOptions.some((option) => option.id === selectedSegment)) {
      setSelectedSegment(segmentOptions[0]?.id ?? "__ALL__");
    }
  }, [segmentOptions, selectedSegment]);

  const currentBundle = useMemo<TrendBundle | undefined>(() => {
    if (!data) {
      return undefined;
    }
    if (selectedSegment === "__ALL__" || !data.segmented) {
      return {
        horizons: data.horizons,
        margin: data.margin,
        monthly: data.monthly,
        metadata: data.metadata,
      };
    }
    const segmentBundle = data.segmented[selectedSegment];
    if (!segmentBundle) {
      return {
        horizons: data.horizons,
        margin: data.margin,
        monthly: data.monthly,
        metadata: data.metadata,
      };
    }
    return segmentBundle;
  }, [data, selectedSegment]);

  const availableHorizons: HorizonKey[] = useMemo(() => {
    if (!currentBundle?.horizons?.length) {
      return ["90"];
    }
    return currentBundle.horizons
      .map((value) => String(value) as HorizonKey)
      .filter((value): value is HorizonKey => value === "30" || value === "60" || value === "90");
  }, [currentBundle]);

  const [selectedHorizon, setSelectedHorizon] = useState<HorizonKey>(availableHorizons[availableHorizons.length - 1]);

  useEffect(() => {
    setSelectedHorizon(availableHorizons[availableHorizons.length - 1]);
  }, [availableHorizons.join("|")]);

  const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const chartData = useMemo(() => {
    if (!currentBundle?.monthly?.length) {
      return [];
    }

    const forecastLimitByHorizon: Record<HorizonKey, number> = {
      "30": 1,
      "60": 2,
      "90": 3,
    };

    const maxForecastMonths = forecastLimitByHorizon[selectedHorizon];
    type ChartPoint = {
      month: string;
      rawMonth: string;
      actual: number | null;
      predicted: number | null;
      upper: number | null;
      lower: number | null;
    };

    const allPoints: ChartPoint[] = [];
    let lastHistoricalValue: number | null = null;
    let lastHistoricalMonth: string | null = null;

    // First pass: process all entries and find last historical point
    currentBundle.monthly.forEach((entry) => {
      const actualValue = toNullableNumber(entry.actual?.[selectedHorizon]);
      const predictedValue = toNullableNumber(entry.predicted?.[selectedHorizon]);

      const point: ChartPoint = {
        month: formatMonthLabel(entry.month),
        rawMonth: entry.month,
        actual: actualValue,
        predicted: null, // Will fill in second pass
        upper: null,
        lower: null,
      };

      allPoints.push(point);

      if (actualValue !== null) {
        lastHistoricalValue = actualValue;
        lastHistoricalMonth = entry.month;
      }
    });

    // Second pass: add forecast data (limited by horizon)
    let forecastCount = 0;
    let connectionPointAdded = false;

    for (let i = 0; i < allPoints.length; i++) {
      const point = allPoints[i];
      const entry = currentBundle.monthly[i];
      const predictedValue = toNullableNumber(entry.predicted?.[selectedHorizon]);

      // If this is a forecast month (no actual data)
      if (point.actual === null && predictedValue !== null) {
        // Add connection point at last historical month (only once)
        if (!connectionPointAdded && lastHistoricalMonth && lastHistoricalValue !== null) {
          const connectionIdx = allPoints.findIndex(p => p.rawMonth === lastHistoricalMonth);
          if (connectionIdx >= 0) {
            allPoints[connectionIdx] = {
              ...allPoints[connectionIdx],
              predicted: lastHistoricalValue, // Connect the lines
            };
            connectionPointAdded = true;
          }
        }

        // Add forecast data (limited by maxForecastMonths)
        if (forecastCount < maxForecastMonths) {
          point.predicted = predictedValue;
          point.upper = toNullableNumber(entry.predicted_upper?.[selectedHorizon]);
          point.lower = toNullableNumber(entry.predicted_lower?.[selectedHorizon]);
          forecastCount++;
        } else {
          // Remove this point entirely if beyond forecast limit
          allPoints.splice(i, 1);
          i--; // Adjust index after removal
        }
      }
    }

    console.log('[chartData] Result:', {
      totalPoints: allPoints.length,
      historicalPoints: allPoints.filter(p => p.actual !== null).length,
      forecastPoints: allPoints.filter(p => p.predicted !== null && p.actual === null).length,
      connectionPoint: allPoints.find(p => p.actual !== null && p.predicted !== null),
      firstPoint: allPoints[0],
      lastPoint: allPoints[allPoints.length - 1],
    });

    return allPoints;
  }, [currentBundle, selectedHorizon]);

  const latestActual = useMemo(() => {
    return [...chartData].reverse().find((entry) => entry.actual !== null);
  }, [chartData]);

  const nextForecast = useMemo(() => {
    return chartData.find((entry) => entry.predicted !== null && entry.actual === null);
  }, [chartData]);

  const previousActualValue = useMemo(() => {
    if (!latestActual) {
      return undefined;
    }
    const index = chartData.findIndex((entry) => entry.rawMonth === latestActual.rawMonth);
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = chartData[i];
      if (candidate.actual !== null) {
        return candidate.actual ?? undefined;
      }
    }
    return undefined;
  }, [chartData, latestActual]);

  const previousForecastValue = useMemo(() => {
    if (!nextForecast) {
      return undefined;
    }
    const index = chartData.findIndex((entry) => entry.rawMonth === nextForecast.rawMonth);
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = chartData[i];
      if (candidate.predicted !== null && candidate.actual === null) {
        return candidate.predicted ?? undefined;
      }
    }
    return latestActual?.actual ?? undefined;
  }, [chartData, nextForecast, latestActual]);
  const metadata = (currentBundle?.metadata ?? {}) as Record<string, unknown>;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`metric-skeleton-${index}`} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="flex flex-col gap-3 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <AlertTitle>Error al cargar tendencias</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </div>
        <Button variant="outline" onClick={onReload} className="self-start">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </Alert>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>{modelLabel}</CardTitle>
          <CardDescription>
            Aún no hay datos suficientes para construir tendencias. Entrena el modelo y vuelve a intentarlo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onReload} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">{modelLabel}</CardTitle>
            <CardDescription>
              Evolución mensual. Último entrenamiento:{" "}
              {data.last_trained_at
                ? dateFormatter.format(new Date(data.last_trained_at))
                : "sin registro"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Activity className="h-3.5 w-3.5" />
              {HORIZON_LABELS[selectedHorizon]}
            </div>
            <Button variant="outline" size="sm" onClick={onReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {segmentOptions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {segmentOptions.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={option.id === selectedSegment ? "default" : "ghost"}
                  onClick={() => setSelectedSegment(option.id)}
                  className={cn("rounded-full", option.id !== selectedSegment && "bg-muted/50")}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {availableHorizons.map((horizon) => (
              <Button
                key={horizon}
                size="sm"
                variant={horizon === selectedHorizon ? "default" : "ghost"}
                onClick={() => setSelectedHorizon(horizon)}
                className={cn("rounded-full", horizon !== selectedHorizon && "bg-muted/50")}
              >
                {HORIZON_LABELS[horizon]}
              </Button>
            ))}
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 24, right: 24, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" allowDecimals={false} />
                <Tooltip
                  formatter={(value: number, name) => {
                    const labelMap: Record<string, string> = {
                      actual: "Histórico",
                      predicted: "Predicción",
                      upper: "Umbral superior",
                      lower: "Umbral inferior",
                    };
                    if (value === null || value === undefined || Number.isNaN(value)) {
                      return ["—", labelMap[name] ?? name];
                    }
                    return [`${valueFormatter.format(value)}`, labelMap[name] ?? name];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name={`Histórico (${HORIZON_LABELS[selectedHorizon]})`}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#2563eb" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name={`Predicción (${HORIZON_LABELS[selectedHorizon]})`}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="4 0"
                  dot={{ r: 3, fill: "#f97316" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  name="Umbral superior"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                  legendType="plainline"
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  name="Umbral inferior"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  dot={false}
                  legendType="plainline"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {(latestActual || nextForecast) && (
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title="Último mes - Histórico"
                value={latestActual?.actual ?? null}
                hint={previousActualValue}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                title="Próximo mes - Predicción"
                value={nextForecast?.predicted ?? null}
                hint={previousForecastValue}
                icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
              />
              <MetricCard
                title="Umbral ±"
                value={
                  nextForecast && nextForecast.lower !== null && nextForecast.upper !== null
                    ? `${valueFormatter.format(nextForecast.lower)} - ${valueFormatter.format(nextForecast.upper)}`
                    : null
                }
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {"segments_high_risk" in metadata && Array.isArray(metadata.segments_high_risk) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segmentos con mayor riesgo acumulado</CardTitle>
            <CardDescription>
              Promedio de riesgo en segmentos asignados al clúster crítico (Top 10)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(metadata.segments_high_risk as Array<Record<string, unknown>>).map((item, index) => (
              <div
                key={`${item.empresa}-${item.area}-${item.departamento}-${index}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {[item.empresa, item.area, item.departamento]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Headcount: {valueFormatter.format(Number(item.headcount ?? 0))}
                  </span>
                </div>
                <span className="text-sm font-semibold text-orange-600">
                  {valueFormatter.format(Number(item.riesgo_promedio ?? 0))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string | null;
  hint?: number | null | undefined;
  icon?: ReactNode;
}

function MetricCard({ title, value, hint, icon }: MetricCardProps) {
  const formattedValue =
    value === null
      ? "—"
      : typeof value === "number"
        ? valueFormatter.format(value)
        : value;
  const delta =
    hint !== undefined && hint !== null && typeof value === "number"
      ? value - hint
      : undefined;

  const deltaLabel =
    delta !== undefined
      ? `${delta > 0 ? "+" : ""}${valueFormatter.format(delta)} vs. mes anterior`
      : undefined;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {title}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{formattedValue}</p>
      {deltaLabel && (
        <p className="text-xs text-muted-foreground">{deltaLabel}</p>
      )}
    </div>
  );
}
