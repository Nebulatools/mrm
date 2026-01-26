"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { kpiCalculator, type KPIResult, type TimeFilter } from "@/lib/kpi-calculator";
import { db, type PlantillaRecord, type IncidenciaCSVRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";
import { createBrowserClient } from "@/lib/supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetentionFilterOptions } from "@/lib/filters";

export interface DashboardData {
  kpis: KPIResult[];
  plantilla: PlantillaRecord[];
  lastUpdated: Date;
  loading: boolean;
}

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'annual' | 'last12months' | 'alltime';

interface UseDashboardDataOptions {
  timePeriod: TimePeriod;
  selectedPeriod: Date;
  retentionFilters: RetentionFilterOptions;
}

interface UseDashboardDataReturn {
  data: DashboardData;
  bajasData: MotivoBajaRecord[];
  incidenciasData: IncidenciaCSVRecord[];
  supabase: SupabaseClient;
  loadDashboardData: (filter?: TimeFilter, forceRefresh?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar datos del dashboard
 * Centraliza la lógica de carga de empleados, bajas e incidencias
 */
export function useDashboardData({
  timePeriod,
  selectedPeriod,
  retentionFilters,
}: UseDashboardDataOptions): UseDashboardDataReturn {
  // Create authenticated Supabase client for RLS filtering (memoized to avoid ref changes)
  const supabase = useMemo(() => createBrowserClient(), []);

  const [data, setData] = useState<DashboardData>({
    kpis: [],
    plantilla: [],
    lastUpdated: new Date(),
    loading: true,
  });

  const [bajasData, setBajasData] = useState<MotivoBajaRecord[]>([]);
  const [incidenciasData, setIncidenciasData] = useState<IncidenciaCSVRecord[]>([]);

  const loadDashboardData = useCallback(
    async (
      filter: TimeFilter = { period: timePeriod, date: selectedPeriod },
      forceRefresh = false
    ) => {
      console.log("🔥 loadDashboardData CALLED! Filter:", filter);

      // Apply retention filters if they are selected
      let effectiveFilter = { ...filter };
      if (retentionFilters.years.length > 0 || retentionFilters.months.length > 0) {
        console.log("🎯 Applying retention filters:", retentionFilters);
        effectiveFilter = { period: "alltime", date: new Date() }; // Use all data when custom filters applied
      }

      try {
        console.log("🚀 Starting loadDashboardData with effective filter:", effectiveFilter);
        setData((prev) => ({ ...prev, loading: true }));

        // Clear cache if user manually refreshes
        if (forceRefresh) {
          console.log("🔄 Force refresh - clearing cache");
          kpiCalculator.clearCache();
        }

        console.log("📊 Loading KPIs for filter:", effectiveFilter);
        const kpis = await kpiCalculator.calculateAllKPIs(effectiveFilter, supabase);
        console.log("📈 KPIs received:", kpis?.length, "items");

        // Load empleados_sftp data for dismissal analysis
        console.log("👥 Loading empleados_sftp data...");
        const empleadosData = await db.getEmpleadosSFTP(supabase);
        console.log("✅ Loaded", empleadosData.length, "employees from empleados_sftp");

        setData({
          kpis: kpis.length > 0 ? kpis : [],
          plantilla: empleadosData || [],
          lastUpdated: new Date(),
          loading: false,
        });

        console.log("✅ Dashboard data loaded successfully");
      } catch (error) {
        console.error("❌ Error in loadDashboardData:", error);
        setData((prev) => ({ ...prev, plantilla: [], loading: false }));
      }
    },
    [timePeriod, selectedPeriod, supabase, retentionFilters]
  );

  // Load KPIs on mount and when period changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(
          `/api/kpis?period=${timePeriod}&date=${selectedPeriod.toISOString()}`
        );
        const result = await response.json();

        if (result.success) {
          setData({
            kpis: result.data.kpis || [],
            plantilla: result.data.plantilla || [],
            lastUpdated: new Date(result.data.lastUpdated),
            loading: false,
          });
        } else {
          throw new Error(result.error || "API failed");
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    loadData();
  }, [timePeriod, selectedPeriod]);

  // Load bajas and incidencias for comparative summary
  useEffect(() => {
    const loadBajasIncidencias = async () => {
      try {
        const [bajas, incidencias] = await Promise.all([
          db.getMotivosBaja(undefined, undefined, supabase),
          db.getIncidenciasCSV(undefined, undefined, supabase),
        ]);
        setBajasData(bajas);
        setIncidenciasData(incidencias);
      } catch (error) {
        console.error("Error loading bajas/incidencias:", error);
      }
    };

    loadBajasIncidencias();
  }, [supabase]);

  const refresh = useCallback(async () => {
    await loadDashboardData({ period: timePeriod, date: selectedPeriod }, true);
  }, [loadDashboardData, timePeriod, selectedPeriod]);

  return {
    data,
    bajasData,
    incidenciasData,
    supabase,
    loadDashboardData,
    refresh,
  };
}
