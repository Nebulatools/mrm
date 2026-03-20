"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Briefcase,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
  ShieldAlert,
  TrendingDown,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────

export interface PredictiveModel {
  id: string;
  name: string;
  date_range_start?: string;
  date_range_end?: string;
}

export interface PredictiveTrainingJob {
  id: string;
  status: string;
}

export interface PredictivePrediction {
  id: string;
  results: Row[];
  created_at: string;
}

interface InsightsPanelProps {
  predictions: PredictivePrediction[];
  trainingJob: PredictiveTrainingJob | null | undefined;
  model: PredictiveModel;
  riskLabel?: string; // "irse" | "faltar" — defines the context of the prediction
}

// Maps risk_label to contextual text used throughout the panel
function getRiskText(riskLabel: string) {
  if (riskLabel === 'faltar') {
    return {
      action: 'faltar',             // "probabilidad alta de faltar"
      noun: 'ausentismo',           // "riesgo de ausentismo"
      event: 'ausencia',            // "probabilidad de ausencia"
    };
  }
  return {
    action: 'irse',                 // "probabilidad alta de irse"
    noun: 'rotacion',               // "riesgo de rotacion"
    event: 'baja',                  // "probabilidad de baja"
  };
}

type Row = Record<string, unknown>;

interface GroupStat {
  label: string;
  total: number;
  risk: number;
  rate: number;
}

function num(v: unknown): number {
  return Number(v) || 0;
}
function str(v: unknown): string {
  return String(v ?? "");
}
function cleanLabel(s: string): string {
  const fixed = s.replace(/\?/g, "E");
  return fixed
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\bDe\b/g, "de")
    .replace(/\bDel\b/g, "del");
}
function pct(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}
function isAtRisk(r: Row): boolean {
  return str(r.prediction) === "1";
}

// ─── Data computations ────────────────────────────────────

function riskByField(results: Row[], field: string): GroupStat[] {
  const groups: Record<string, { total: number; risk: number }> = {};
  results.forEach((r) => {
    const val = cleanLabel(str(r[field]) || "Sin dato");
    if (!groups[val]) groups[val] = { total: 0, risk: 0 };
    groups[val].total++;
    if (isAtRisk(r)) groups[val].risk++;
  });
  return Object.entries(groups)
    .map(([label, { total, risk }]) => ({
      label,
      total,
      risk,
      rate: pct(risk, total),
    }))
    .sort((a, b) => b.rate - a.rate);
}

function riskByTenure(results: Row[]): GroupStat[] {
  const buckets = [
    { label: "< 1 mes", min: 0, max: 30 },
    { label: "1-3 meses", min: 30, max: 90 },
    { label: "3-6 meses", min: 90, max: 180 },
    { label: "6-12 meses", min: 180, max: 365 },
    { label: "> 1 ano", min: 365, max: Infinity },
  ];
  return buckets
    .map((b) => {
      const inGroup = results.filter((r) => {
        const v = num(r.antiguedad_dias);
        return v >= b.min && v < b.max;
      });
      const risk = inGroup.filter(isAtRisk).length;
      return { label: b.label, total: inGroup.length, risk, rate: pct(risk, inGroup.length) };
    })
    .filter((g) => g.total > 0);
}

interface Finding {
  text: string;
  type: "danger" | "warning" | "info";
  icon: "alert" | "trend" | "zap" | "shield";
}

function generateFindings(results: Row[], riskRate: number): Finding[] {
  const findings: Finding[] = [];
  const atRisk = results.filter(isAtRisk);

  const newHires = atRisk.filter((r) => num(r.antiguedad_dias) < 90);
  const newHirePct = pct(newHires.length, atRisk.length);
  if (newHirePct > 40 && atRisk.length > 3) {
    findings.push({
      text: `${Math.round(newHirePct)}% de los empleados en riesgo tienen menos de 3 meses de antiguedad`,
      type: "danger",
      icon: "alert",
    });
  }

  const areaStats = riskByField(results, "area");
  if (areaStats.length > 1 && areaStats[0].rate > riskRate * 1.3 && areaStats[0].total >= 5) {
    findings.push({
      text: `${areaStats[0].label} concentra el mayor riesgo: ${Math.round(areaStats[0].rate)}% (${areaStats[0].risk} de ${areaStats[0].total})`,
      type: "warning",
      icon: "zap",
    });
  }

  const withSusp = atRisk.filter((r) => num(r.tiene_suspensiones_acum) === 1);
  const totalWithSusp = results.filter((r) => num(r.tiene_suspensiones_acum) === 1);
  if (totalWithSusp.length > 0 && withSusp.length > 0) {
    const suspRiskRate = pct(withSusp.length, totalWithSusp.length);
    if (suspRiskRate > riskRate * 1.5) {
      findings.push({
        text: `Empleados con suspensiones tienen ${Math.round(suspRiskRate)}% de riesgo vs ${Math.round(riskRate)}% general`,
        type: "danger",
        icon: "shield",
      });
    }
  }

  const worsening = atRisk.filter((r) => num(r.incidencias_acelerando) === 1);
  if (worsening.length > 0 && atRisk.length > 3) {
    findings.push({
      text: `${worsening.length} empleados en riesgo muestran tendencia de incidencias en aumento`,
      type: "warning",
      icon: "trend",
    });
  }

  const young = atRisk.filter((r) => num(r.edad) > 0 && num(r.edad) <= 25);
  const youngPct = pct(young.length, atRisk.length);
  if (youngPct > 40 && young.length > 3) {
    findings.push({
      text: `${Math.round(youngPct)}% de los empleados en riesgo son menores de 25 anos`,
      type: "info",
      icon: "alert",
    });
  }

  const regionStats = riskByField(results, "region");
  if (regionStats.length > 1 && regionStats[0].rate > riskRate * 1.3 && regionStats[0].total >= 5) {
    findings.push({
      text: `Region ${regionStats[0].label} tiene ${Math.round(regionStats[0].rate)}% de riesgo — la mas alta`,
      type: "info",
      icon: "zap",
    });
  }

  if (findings.length === 0) {
    findings.push({
      text: `${atRisk.length} de ${results.length} empleados marcados en riesgo (${Math.round(riskRate)}%)`,
      type: "info",
      icon: "alert",
    });
  }

  return findings.slice(0, 4);
}

function getEmployeeReasons(r: Row, riskRate: number, areaStats: GroupStat[]): string[] {
  const reasons: string[] = [];
  const dias = num(r.antiguedad_dias);
  if (dias < 30) reasons.push("Primer mes");
  else if (dias < 90) reasons.push("< 3 meses");
  else if (dias < 180) reasons.push("< 6 meses");

  const empArea = str(r.area);
  const areaStat = areaStats.find((a) => a.label === empArea);
  if (areaStat && areaStat.rate > riskRate * 1.2) reasons.push("Area critica");
  if (num(r.tiene_suspensiones_acum) === 1 || num(r.suspensiones_rolling_3m) > 0)
    reasons.push("Suspensiones");
  if (num(r.incidencias_acelerando) === 1) reasons.push("Tendencia negativa");
  if (num(r.incidencias_ultimas_2_semanas) > 0) reasons.push("Incidencias recientes");
  if (num(r.ratio_incidencias_antiguedad) > 0.5) reasons.push("Alta tasa incidencias");
  const edad = num(r.edad);
  if (edad > 0 && edad <= 22) reasons.push("Muy joven");

  if (reasons.length === 0) reasons.push("Perfil de riesgo");
  return reasons.slice(0, 3);
}

// ─── SVG Ring Gauge ───────────────────────────────────────

function RiskGauge({ value, size = 88 }: { value: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color =
    value > 40 ? "hsl(0, 72%, 51%)" : value > 25 ? "hsl(25, 95%, 53%)" : "hsl(45, 93%, 47%)";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-muted/40"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-lg font-bold"
        style={{ fontSize: size * 0.24 }}
      >
        {Math.round(value)}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 14}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground"
        style={{ fontSize: size * 0.11 }}
      >
        riesgo
      </text>
    </svg>
  );
}

// ─── Mini horizontal bar ──────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max((value / max) * 100, 3)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

// ─── Drill-down bars ──────────────────────────────────────

function DrillBars({ data, avgRate }: { data: GroupStat[]; avgRate: number }) {
  const items = data.slice(0, 12);
  const maxRate = Math.max(...items.map((d) => d.rate), 1);

  return (
    <div className="space-y-2">
      {items.map((d) => {
        const isAbove = d.rate > avgRate;
        const barColor = isAbove ? "hsl(0, 72%, 55%)" : "hsl(217, 70%, 58%)";
        return (
          <div key={d.label} className="group">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium truncate max-w-[200px]" title={d.label}>
                {d.label}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground ml-2 shrink-0">
                <span className={`font-semibold ${isAbove ? "text-red-600" : "text-foreground"}`}>
                  {Math.round(d.rate)}%
                </span>
                <span className="text-[10px] ml-1 opacity-60">
                  {d.risk}/{d.total}
                </span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max((d.rate / maxRate) * 100, 2)}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-dashed">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0, 72%, 55%)" }} />
          <span className="text-[10px] text-muted-foreground">
            Sobre promedio ({Math.round(avgRate)}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(217, 70%, 58%)" }} />
          <span className="text-[10px] text-muted-foreground">Bajo promedio</span>
        </div>
      </div>
    </div>
  );
}

// ─── Finding icon mapper ──────────────────────────────────

function FindingIcon({ icon }: { icon: Finding["icon"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (icon) {
    case "alert":
      return <AlertCircle className={cls} />;
    case "trend":
      return <TrendingDown className={cls} />;
    case "zap":
      return <Zap className={cls} />;
    case "shield":
      return <ShieldAlert className={cls} />;
  }
}

// ─── Main Component ───────────────────────────────────────

type DrillView = "area" | "puesto" | "region" | "antiguedad" | null;

export function InsightsPanel({ predictions, trainingJob, model, riskLabel = 'irse' }: InsightsPanelProps) {
  const riskText = getRiskText(riskLabel);
  const [drillView, setDrillView] = useState<DrillView>(null);

  if (!predictions.length || !trainingJob) return null;

  const latestPred = predictions[0];
  const results = latestPred?.results || [];
  if (results.length === 0) return null;

  const totalEmployees = results.length;
  const atRisk = results.filter(isAtRisk);
  const riskRate = pct(atRisk.length, totalEmployees);
  const safeCount = totalEmployees - atRisk.length;

  const dateStart = model.date_range_start;
  const dateEnd = model.date_range_end;
  const formatDateStr = (d: string) => {
    try {
      // Parse string directly to avoid timezone bug (UTC midnight → día anterior en MX)
      const [year, month] = d.split("-").map(Number);
      const fecha = new Date(year, month - 1, 15, 12, 0, 0); // mediodía local
      return fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    } catch {
      return d;
    }
  };

  const areaStats = riskByField(results, "area");
  const puestoStats = riskByField(results, "puesto");
  const regionStats = riskByField(results, "region");
  const tenureStats = riskByTenure(results);
  const findings = generateFindings(results, riskRate);

  const hasArea = results[0] && "area" in results[0];
  const hasPuesto = results[0] && "puesto" in results[0];
  const hasRegion = results[0] && "region" in results[0];
  const hasTenure = results[0] && "antiguedad_dias" in results[0];

  const topRisk = [...atRisk]
    .sort((a, b) => num(b.probability_positive) - num(a.probability_positive))
    .slice(0, 10);

  const drillConfig: Record<string, { title: string; subtitle: string; data: GroupStat[] }> = {
    area: { title: "Riesgo por Area", subtitle: `Tasa de riesgo de ${riskText.noun} en cada area operativa`, data: areaStats },
    puesto: { title: "Riesgo por Puesto", subtitle: `Puestos con mayor probabilidad de ${riskText.event}`, data: puestoStats },
    region: { title: "Riesgo por Region", subtitle: "Distribucion geografica del riesgo", data: regionStats },
    antiguedad: { title: "Riesgo por Antiguedad", subtitle: `Tiempo en la empresa vs probabilidad de ${riskText.action}`, data: tenureStats },
  };

  const activeDrill = drillView ? drillConfig[drillView] : null;

  const categories: Array<{
    key: DrillView;
    label: string;
    icon: React.ReactNode;
    stats: GroupStat[];
    visible: boolean;
  }> = [
    { key: "area", label: "Area", icon: <Building2 className="h-4 w-4" />, stats: areaStats, visible: !!hasArea && areaStats.length > 0 },
    { key: "puesto", label: "Puesto", icon: <Briefcase className="h-4 w-4" />, stats: puestoStats, visible: !!hasPuesto && puestoStats.length > 0 },
    { key: "region", label: "Region", icon: <MapPin className="h-4 w-4" />, stats: regionStats, visible: !!hasRegion && regionStats.length > 0 },
    { key: "antiguedad", label: "Antiguedad", icon: <Clock className="h-4 w-4" />, stats: tenureStats, visible: !!hasTenure && tenureStats.length > 0 },
  ];

  return (
    <div className="space-y-5">
      {/* 1. HERO — Executive Summary */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background:
                riskRate > 35
                  ? "linear-gradient(90deg, hsl(0,72%,51%), hsl(25,95%,53%))"
                  : riskRate > 20
                  ? "linear-gradient(90deg, hsl(25,95%,53%), hsl(45,93%,47%))"
                  : "linear-gradient(90deg, hsl(142,71%,45%), hsl(217,91%,60%))",
            }}
          />
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-6">
              <RiskGauge value={riskRate} size={96} />
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Analizados
                  </p>
                  <p className="text-3xl font-bold tracking-tight">{totalEmployees}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">empleados activos</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    En riesgo
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                    {atRisk.length}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    probabilidad alta de {riskText.action}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Estables
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {safeCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">bajo riesgo</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2.5 w-full rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${riskRate}%`, backgroundColor: "hsl(0, 72%, 55%)" }}
                />
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${100 - riskRate}%`, backgroundColor: "hsl(152, 55%, 60%)" }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(riskRate)}% en riesgo
                </span>
                {dateStart && dateEnd && (
                  <span className="text-[10px] text-muted-foreground">
                    Datos: {formatDateStr(dateStart)} — {formatDateStr(dateEnd)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* 2. HALLAZGOS CLAVE */}
      {findings.length > 0 && (
        <Card>
          <div className="px-6 pt-5 pb-1">
            <h3 className="text-sm font-semibold">Hallazgos clave</h3>
          </div>
          <CardContent className="pt-2">
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
                  <p className="text-[13px] leading-relaxed">{f.text}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 3. DONDE SE CONCENTRA EL RIESGO */}
      <Card>
        {activeDrill ? (
          <>
            <div className="px-6 pt-5 pb-3">
              <button
                onClick={() => setDrillView(null)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver
              </button>
              <h3 className="text-sm font-semibold">{activeDrill.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activeDrill.subtitle}</p>
            </div>
            <CardContent className="pt-0">
              <DrillBars data={activeDrill.data} avgRate={riskRate} />
            </CardContent>
          </>
        ) : (
          <>
            <div className="px-6 pt-5 pb-1">
              <h3 className="text-sm font-semibold">Donde se concentra el riesgo</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Selecciona una dimension para ver el desglose completo
              </p>
            </div>
            <CardContent className="pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories
                  .filter((c) => c.visible)
                  .map((cat) => {
                    const top3 = cat.stats.slice(0, 3);
                    const maxRate = Math.max(...top3.map((s) => s.rate), 1);
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setDrillView(cat.key)}
                        className="group relative rounded-xl border border-border/60 p-4 text-left hover:border-primary/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                            {cat.icon}
                            <span className="text-xs font-medium">{cat.label}</span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                        </div>
                        <div className="space-y-2">
                          {top3.map((s) => (
                            <div key={s.label}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span
                                  className="text-[11px] text-muted-foreground truncate max-w-[100px]"
                                  title={s.label}
                                >
                                  {s.label}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold tabular-nums ${
                                    s.rate > riskRate ? "text-red-600 dark:text-red-400" : "text-foreground"
                                  }`}
                                >
                                  {Math.round(s.rate)}%
                                </span>
                              </div>
                              <MiniBar
                                value={s.rate}
                                max={maxRate}
                                color={s.rate > riskRate ? "hsl(0, 72%, 55%)" : "hsl(217, 70%, 62%)"}
                              />
                            </div>
                          ))}
                        </div>
                        {cat.stats.length > 3 && (
                          <p className="text-[10px] text-muted-foreground/60 mt-2">
                            +{cat.stats.length - 3} mas
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* 4. EMPLEADOS CON MAYOR RIESGO */}
      {topRisk.length > 0 && (
        <Card>
          <div className="px-6 pt-5 pb-1">
            <h3 className="text-sm font-semibold">Empleados con mayor riesgo</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Top {topRisk.length} por probabilidad de {riskText.event} — con factores de riesgo detectados
            </p>
          </div>
          <CardContent className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2 pl-3 w-8" />
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                      Empleado
                    </th>
                    {hasArea && (
                      <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                        Area
                      </th>
                    )}
                    {hasPuesto && (
                      <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                        Puesto
                      </th>
                    )}
                    {hasRegion && (
                      <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                        Region
                      </th>
                    )}
                    {hasTenure && (
                      <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                        Antiguedad
                      </th>
                    )}
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                      Riesgo
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider pb-2">
                      Factores
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((r, i) => {
                    const empId = str(r.numero_empleado) || str(r.id) || str(r.nombre) || `${i + 1}`;
                    const prob = num(r.probability_positive);
                    const dias = num(r.antiguedad_dias);
                    const edad = num(r.edad);
                    const reasons = getEmployeeReasons(r, riskRate, areaStats);

                    let tenureLabel = "";
                    if (dias > 0) {
                      if (dias < 30) tenureLabel = `${Math.round(dias)} dias`;
                      else if (dias < 365) tenureLabel = `${Math.round(dias / 30)} meses`;
                      else tenureLabel = `${(dias / 365).toFixed(1)} anos`;
                    }

                    const probPct = prob * 100;
                    const riskColor =
                      probPct > 70
                        ? "hsl(0, 72%, 51%)"
                        : probPct > 50
                        ? "hsl(25, 95%, 53%)"
                        : "hsl(45, 93%, 47%)";

                    return (
                      <tr
                        key={i}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2.5 pl-3 pr-1">
                          <div
                            className="w-1 h-7 rounded-full"
                            style={{ backgroundColor: riskColor }}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="text-sm font-semibold">#{empId}</span>
                          {edad > 0 && (
                            <span className="text-[10px] text-muted-foreground ml-1.5">
                              {edad} anos
                            </span>
                          )}
                        </td>
                        {hasArea && (
                          <td className="py-2.5 pr-3">
                            <span className="text-xs truncate block max-w-[120px]" title={str(r.area)}>
                              {cleanLabel(str(r.area))}
                            </span>
                          </td>
                        )}
                        {hasPuesto && (
                          <td className="py-2.5 pr-3">
                            <span className="text-xs truncate block max-w-[160px]" title={str(r.puesto)}>
                              {cleanLabel(str(r.puesto))}
                            </span>
                          </td>
                        )}
                        {hasRegion && (
                          <td className="py-2.5 pr-3">
                            <span className="text-xs">{cleanLabel(str(r.region))}</span>
                          </td>
                        )}
                        {hasTenure && (
                          <td className="py-2.5 pr-3">
                            <span className="text-xs text-muted-foreground">{tenureLabel}</span>
                          </td>
                        )}
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${probPct}%`, backgroundColor: riskColor }}
                              />
                            </div>
                            <span
                              className="text-xs font-bold tabular-nums shrink-0"
                              style={{ color: riskColor }}
                            >
                              {probPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {reasons.map((reason, ri) => (
                              <Badge
                                key={ri}
                                variant="secondary"
                                className="text-[10px] font-normal px-2 py-0.5"
                              >
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
