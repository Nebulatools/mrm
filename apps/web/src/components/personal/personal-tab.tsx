"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  LabelList,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType } from "recharts/types/component/DefaultTooltipContent";
import { KPICard, KPICardSkeleton } from "@/components/shared/kpi-card";
import { AgeGenderTable } from "./tables/age-gender-table";
import { SeniorityGenderTable } from "./tables/seniority-gender-table";
import { SmartNarrative } from "@/components/shared/smart-narrative";
import { VisualizationContainer } from "@/components/shared/visualization-container";
import type { PlantillaRecord } from "@/lib/supabase";
import type { KPIResult } from "@/lib/kpi-calculator";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/shared/theme-provider";

interface HeadcountKPICard {
  icon: ReactNode;
  kpi: KPIResult;
  secondaryRows?: {
    label: string;
    value: number;
    isPercent?: boolean;
    noWrap?: boolean;
    showColon?: boolean;
  }[];
}

interface PersonalTabProps {
  plantillaFiltered: PlantillaRecord[];
  activeEmployeesCurrent: PlantillaRecord[];
  headcountKpiCards: HeadcountKPICard[];
  narrativePayload: unknown;
  refreshEnabled: boolean;
  loading: boolean;
}

/**
 * Tab de Personal - Muestra KPIs de headcount, clasificación, edad y antigüedad
 */
export function PersonalTab({
  plantillaFiltered,
  activeEmployeesCurrent,
  headcountKpiCards,
  narrativePayload,
  refreshEnabled,
  loading,
}: PersonalTabProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Chart colors
  const chartAxisColor = isDark ? "#F8FAFC" : "#334155";
  const chartSecondaryAxisColor = isDark ? "#CBD5F5" : "#64748b";
  const chartGridColor = isDark ? "rgba(148, 163, 184, 0.25)" : "#e2e8f0";
  const chartTooltipBg = isDark ? "hsl(var(--card))" : "#FFFFFF";
  const chartTooltipBorder = isDark ? "rgba(148, 163, 184, 0.35)" : "#e2e8f0";
  const chartTooltipLabelColor = isDark ? "#E2E8F0" : "#0f172a";
  const chartTooltipShadow = isDark
    ? "0 16px 45px -20px rgba(8, 14, 26, 0.65)"
    : "0 10px 35px -15px rgba(15, 23, 42, 0.35)";

  // Styling classes
  const elevatedCardClass = refreshEnabled
    ? "rounded-2xl border border-brand-border/50 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface/80"
    : undefined;
  const elevatedCardHeaderClass = refreshEnabled ? "pb-6" : undefined;
  const elevatedTitleClass = refreshEnabled
    ? "font-heading text-brand-ink dark:text-white"
    : undefined;
  const elevatedSubtleTextClass = refreshEnabled
    ? "text-brand-ink/70 dark:text-brand-ink/70"
    : undefined;

  // Helper functions
  const getAge = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento) return null;
    const d = new Date(fechaNacimiento);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age;
  };

  const monthsBetween = (startStr?: string | null, end: Date = new Date()) => {
    if (!startStr) return 0;
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return 0;
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const total =
      years * 12 + months + (end.getDate() >= start.getDate() ? 0 : -1);
    return Math.max(0, total);
  };

  // Computed data
  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    plantillaFiltered.forEach((e) => {
      const key = (e.clasificacion || "Sin Clasificación").toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [plantillaFiltered]);

  const ageScatterData = useMemo(() => {
    const map = new Map<number, number>();
    plantillaFiltered.forEach((e) => {
      const age = getAge(e.fecha_nacimiento);
      if (age !== null && age >= 0 && age <= 100) {
        map.set(age, (map.get(age) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([age, count]) => ({ age, count }));
  }, [plantillaFiltered]);

  const seniorityByArea = useMemo(() => {
    const bins = (months: number) => {
      if (months < 3) return "<3m";
      if (months < 6) return "3-6m";
      if (months < 12) return "6-12m";
      return "12m+";
    };
    const map = new Map<
      string,
      { "<3m": number; "3-6m": number; "6-12m": number; "12m+": number }
    >();
    activeEmployeesCurrent.forEach((e) => {
      const area = e.area || "Sin Área";
      const m = monthsBetween(e.fecha_antiguedad || e.fecha_ingreso);
      const b = bins(m);
      if (!map.has(area))
        map.set(area, { "<3m": 0, "3-6m": 0, "6-12m": 0, "12m+": 0 });
      map.get(area)![b as "<3m" | "3-6m" | "6-12m" | "12m+"]++;
    });
    return Array.from(map.entries()).map(([area, counts]) => ({
      area,
      ...counts,
    }));
  }, [activeEmployeesCurrent]);

  const seniorityByDept = useMemo(() => {
    const bins = (months: number) => {
      if (months < 3) return "<3m";
      if (months < 6) return "3-6m";
      if (months < 12) return "6-12m";
      return "12m+";
    };
    const map = new Map<
      string,
      { "<3m": number; "3-6m": number; "6-12m": number; "12m+": number }
    >();
    activeEmployeesCurrent.forEach((e) => {
      const dept = e.departamento || "Sin Departamento";
      const m = monthsBetween(e.fecha_antiguedad || e.fecha_ingreso);
      const b = bins(m);
      if (!map.has(dept))
        map.set(dept, { "<3m": 0, "3-6m": 0, "6-12m": 0, "12m+": 0 });
      map.get(dept)![b as "<3m" | "3-6m" | "6-12m" | "12m+"]++;
    });
    return Array.from(map.entries()).map(([departamento, counts]) => ({
      departamento,
      ...counts,
    }));
  }, [activeEmployeesCurrent]);

  // Tooltip renderer for stacked bar charts
  const renderStackedTooltip = (
    props: TooltipProps<number, NameType>,
    labelKey: "area" | "departamento"
  ) => {
    if (!props.active || !props.payload || props.payload.length === 0)
      return null;
    const data = props.payload[0].payload;
    const total =
      (data["<3m"] || 0) +
      (data["3-6m"] || 0) +
      (data["6-12m"] || 0) +
      (data["12m+"] || 0);
    return (
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${chartTooltipBorder}`,
          backgroundColor: chartTooltipBg,
          boxShadow: chartTooltipShadow,
          padding: "12px",
        }}
      >
        <p
          style={{
            fontWeight: 600,
            color: chartTooltipLabelColor,
            marginBottom: "8px",
          }}
        >
          {data[labelKey]}
        </p>
        {props.payload.map((entry, index: number) => (
          <p key={index} style={{ color: entry.color, margin: "4px 0" }}>
            {entry.name}: {(entry.value as number).toLocaleString("es-MX")}
          </p>
        ))}
        <p
          style={{
            fontWeight: 600,
            color: chartTooltipLabelColor,
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: `1px solid ${chartTooltipBorder}`,
          }}
        >
          Total: {total.toLocaleString("es-MX")}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SmartNarrative
        data={narrativePayload}
        section="headcount"
        refreshEnabled={refreshEnabled}
        className="shadow-md"
        title="Narrativa IA · Personal"
      />

      {/* 5 KPIs solicitados */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 items-stretch">
        {refreshEnabled && loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <KPICardSkeleton key={`headcount-skeleton-${index}`} refreshEnabled />
          ))
        ) : (
          headcountKpiCards.map(({ kpi, icon, secondaryRows }, index) => (
            <KPICard
              key={`headcount-kpi-${index}`}
              refreshEnabled={refreshEnabled}
              kpi={kpi}
              icon={icon}
              secondaryRows={secondaryRows}
            />
          ))
        )}
      </div>

      {/* Gráficas intermedias: Clasificación (1/3), Edad (2/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={cn(elevatedCardClass, "lg:col-span-1")}>
          <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
            <CardTitle className={cn("text-base", elevatedTitleClass)}>
              Clasificación
            </CardTitle>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                elevatedSubtleTextClass
              )}
            >
              Confianza vs Sindicalizado
            </p>
          </CardHeader>
          <CardContent>
            <VisualizationContainer
              title="Clasificación del personal"
              type="chart"
              className="h-[280px] w-full"
              filename="clasificacion-personal"
            >
              {(fullscreen) => (
                <div
                  style={{ width: "100%", height: fullscreen ? 420 : 320 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classCounts}
                      margin={{ top: 32, right: 20, bottom: 50, left: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 8"
                        stroke={chartGridColor}
                        strokeOpacity={0.65}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: chartAxisColor }}
                        interval={0}
                        tickMargin={10}
                        height={60}
                      />
                      <YAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: chartSecondaryAxisColor }}
                        allowDecimals={false}
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                      />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? "rgba(148, 163, 184, 0.16)"
                            : "rgba(148, 163, 184, 0.08)",
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: chartTooltipBorder,
                          backgroundColor: chartTooltipBg,
                          boxShadow: chartTooltipShadow,
                        }}
                        labelStyle={{
                          fontWeight: 600,
                          color: chartTooltipLabelColor,
                        }}
                        formatter={(value: number) =>
                          value.toLocaleString("es-MX")
                        }
                      />
                      <defs>
                        <linearGradient
                          id="classificationGradient"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#fdba74" />
                          <stop offset="50%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                      <Bar
                        dataKey="value"
                        fill="url(#classificationGradient)"
                        radius={[12, 12, 0, 0]}
                        maxBarSize={68}
                      >
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value: number) =>
                            value.toLocaleString("es-MX")
                          }
                          style={{
                            fill: chartTooltipLabelColor,
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                          offset={14}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>

        <Card className={cn(elevatedCardClass, "lg:col-span-2")}>
          <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
            <CardTitle className={cn("text-base", elevatedTitleClass)}>
              Distribución por Edad
            </CardTitle>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                elevatedSubtleTextClass
              )}
            >
              Gráfica de dispersión
            </p>
          </CardHeader>
          <CardContent>
            <VisualizationContainer
              title="Distribución por edad"
              type="chart"
              className="h-[280px] w-full"
              filename="distribucion-edad"
            >
              {(fullscreen) => (
                <div
                  style={{ width: "100%", height: fullscreen ? 340 : 240 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ left: 16, right: 12, top: 12, bottom: 32 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartGridColor}
                      />
                      <XAxis
                        dataKey="age"
                        name="Edad"
                        type="number"
                        domain={[18, "dataMax"]}
                        allowDecimals={false}
                        tick={{ fill: chartAxisColor, fontSize: 11 }}
                        label={{
                          value: "Edad (años)",
                          position: "bottom",
                          offset: 20,
                          style: {
                            fill: chartAxisColor,
                            fontSize: 12,
                            fontWeight: 500,
                          },
                        }}
                      />
                      <YAxis
                        dataKey="count"
                        name="# Empleados"
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: chartSecondaryAxisColor, fontSize: 11 }}
                        label={{
                          value: "# Empleados",
                          angle: -90,
                          position: "insideLeft",
                          offset: 0,
                          style: {
                            fill: chartSecondaryAxisColor,
                            fontSize: 12,
                            fontWeight: 500,
                            textAnchor: "middle",
                          },
                        }}
                      />
                      <Tooltip
                        cursor={{
                          strokeDasharray: "3 3",
                          stroke: isDark
                            ? "rgba(148, 163, 184, 0.25)"
                            : "rgba(148, 163, 184, 0.45)",
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: chartTooltipBorder,
                          backgroundColor: chartTooltipBg,
                          boxShadow: chartTooltipShadow,
                        }}
                        labelStyle={{
                          fontWeight: 600,
                          color: chartTooltipLabelColor,
                        }}
                      />
                      <Scatter data={ageScatterData} fill="#ef4444" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica: Antigüedad por Área (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <Card className={cn(elevatedCardClass)}>
          <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
            <CardTitle className={cn("text-base", elevatedTitleClass)}>
              Antigüedad por Área
            </CardTitle>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                elevatedSubtleTextClass
              )}
            >
              Barras horizontales por grupos
            </p>
          </CardHeader>
          <CardContent>
            <VisualizationContainer
              title="Antigüedad por área"
              type="chart"
              className="h-[600px] w-full"
              filename="antiguedad-por-area"
            >
              {(fullscreen) => (
                <div
                  style={{ width: "100%", height: fullscreen ? 560 : 560 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={seniorityByArea}
                      layout="vertical"
                      margin={{ left: 32, right: 16, top: 8, bottom: 8 }}
                      barCategoryGap="15%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartGridColor}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: chartAxisColor, fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="area"
                        type="category"
                        width={180}
                        tick={{ fill: chartAxisColor, fontSize: 12 }}
                        interval={0}
                      />
                      <Legend wrapperStyle={{ color: chartAxisColor }} />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? "rgba(148, 163, 184, 0.12)"
                            : "rgba(148, 163, 184, 0.06)",
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: chartTooltipBorder,
                          backgroundColor: chartTooltipBg,
                          boxShadow: chartTooltipShadow,
                        }}
                        labelStyle={{
                          fontWeight: 600,
                          color: chartTooltipLabelColor,
                        }}
                        formatter={(value: number) =>
                          value.toLocaleString("es-MX")
                        }
                        content={(props) => renderStackedTooltip(props, "area")}
                      />
                      <Bar dataKey="<3m" stackId="a" fill="#22c55e" />
                      <Bar dataKey="3-6m" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="6-12m" stackId="a" fill="#a855f7" />
                      <Bar dataKey="12m+" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica: Antigüedad por Departamento (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <Card className={cn(elevatedCardClass)}>
          <CardHeader className={cn("pb-3", elevatedCardHeaderClass)}>
            <CardTitle className={cn("text-base", elevatedTitleClass)}>
              Antigüedad por Departamento
            </CardTitle>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                elevatedSubtleTextClass
              )}
            >
              Barras horizontales por grupos
            </p>
          </CardHeader>
          <CardContent>
            <VisualizationContainer
              title="Antigüedad por departamento"
              type="chart"
              className="h-[320px] w-full"
              filename="antiguedad-por-departamento"
            >
              {(fullscreen) => (
                <div
                  style={{ width: "100%", height: fullscreen ? 360 : 300 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={seniorityByDept}
                      layout="vertical"
                      margin={{ left: 24, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartGridColor}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: chartAxisColor, fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="departamento"
                        type="category"
                        width={140}
                        tick={{ fill: chartAxisColor, fontSize: 11 }}
                        interval={0}
                      />
                      <Legend wrapperStyle={{ color: chartAxisColor }} />
                      <Tooltip
                        cursor={{
                          fill: isDark
                            ? "rgba(148, 163, 184, 0.12)"
                            : "rgba(148, 163, 184, 0.06)",
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: chartTooltipBorder,
                          backgroundColor: chartTooltipBg,
                          boxShadow: chartTooltipShadow,
                        }}
                        labelStyle={{
                          fontWeight: 600,
                          color: chartTooltipLabelColor,
                        }}
                        formatter={(value: number) =>
                          value.toLocaleString("es-MX")
                        }
                        content={(props) =>
                          renderStackedTooltip(props, "departamento")
                        }
                      />
                      <Bar dataKey="<3m" stackId="a" fill="#22c55e" />
                      <Bar dataKey="3-6m" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="6-12m" stackId="a" fill="#a855f7" />
                      <Bar dataKey="12m+" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </VisualizationContainer>
          </CardContent>
        </Card>
      </div>

      {/* New Demographic Analysis Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgeGenderTable
          plantilla={plantillaFiltered}
          refreshEnabled={refreshEnabled}
        />
        <SeniorityGenderTable
          plantilla={plantillaFiltered}
          refreshEnabled={refreshEnabled}
        />
      </div>
    </div>
  );
}
