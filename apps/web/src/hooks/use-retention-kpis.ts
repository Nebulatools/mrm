"use client";

import { useMemo } from "react";
import { applyFiltersWithScope, type RetentionFilterOptions } from "@/lib/filters";
import type { PlantillaRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";
import {
  calculateActivosPromedio,
  calculateBajasTempranas,
  calcularRotacionConDesglose,
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose,
  calculateVariancePercentage,
} from "@/lib/utils/kpi-helpers";

export interface RetentionKPIs {
  // Activos promedio
  activosPromedio: number;
  activosPromedioAnterior: number;
  activosPromedioVariacion: number;

  // Bajas
  bajasTempranas: number;
  bajasVoluntarias: number;
  bajasVoluntariasAnterior: number;
  bajasVoluntariasVariacion: number;
  bajasInvoluntarias: number;
  bajasInvoluntariasAnterior: number;
  bajasInvoluntariasVariacion: number;

  // Rotación mensual
  rotacionMensual: number;
  rotacionMensualAnterior: number;
  rotacionMensualVariacion: number;
  rotacionMensualSameMonthPrevYear: number;
  rotacionMensualClaves: number;
  rotacionMensualClavesAnterior: number;
  rotacionMensualClavesVariacion: number;
  rotacionMensualVoluntaria: number;
  rotacionMensualVoluntariaAnterior: number;
  rotacionMensualVoluntariaVariacion: number;

  // Rotación acumulada (12 meses)
  rotacionAcumulada: number;
  rotacionAcumuladaAnterior: number;
  rotacionAcumuladaVariacion: number;
  rotacionAcumuladaClaves: number;
  rotacionAcumuladaClavesAnterior: number;
  rotacionAcumuladaClavesVariacion: number;
  rotacionAcumuladaVoluntaria: number;
  rotacionAcumuladaVoluntariaAnterior: number;
  rotacionAcumuladaVoluntariaVariacion: number;

  // Rotación año actual (YTD)
  rotacionAnioActual: number;
  rotacionAnioActualAnterior: number;
  rotacionAnioActualVariacion: number;
  rotacionAnioActualClaves: number;
  rotacionAnioActualClavesAnterior: number;
  rotacionAnioActualClavesVariacion: number;
  rotacionAnioActualVoluntaria: number;
  rotacionAnioActualVoluntariaAnterior: number;
  rotacionAnioActualVoluntariaVariacion: number;
}

interface UseRetentionKPIsOptions {
  plantilla: PlantillaRecord[];
  plantillaFilteredYearScope: PlantillaRecord[];
  retentionFilters: RetentionFilterOptions;
  selectedPeriod: Date;
  bajasData?: MotivoBajaRecord[];
  bajasDataLoading?: boolean;
}

const EMPTY_KPIS: RetentionKPIs = {
  activosPromedio: 0,
  activosPromedioAnterior: 0,
  activosPromedioVariacion: 0,
  bajasTempranas: 0,
  bajasVoluntarias: 0,
  bajasVoluntariasAnterior: 0,
  bajasVoluntariasVariacion: 0,
  bajasInvoluntarias: 0,
  bajasInvoluntariasAnterior: 0,
  bajasInvoluntariasVariacion: 0,
  rotacionMensual: 0,
  rotacionMensualAnterior: 0,
  rotacionMensualVariacion: 0,
  rotacionMensualSameMonthPrevYear: 0,
  rotacionMensualClaves: 0,
  rotacionMensualClavesAnterior: 0,
  rotacionMensualClavesVariacion: 0,
  rotacionMensualVoluntaria: 0,
  rotacionMensualVoluntariaAnterior: 0,
  rotacionMensualVoluntariaVariacion: 0,
  rotacionAcumulada: 0,
  rotacionAcumuladaAnterior: 0,
  rotacionAcumuladaVariacion: 0,
  rotacionAcumuladaClaves: 0,
  rotacionAcumuladaClavesAnterior: 0,
  rotacionAcumuladaClavesVariacion: 0,
  rotacionAcumuladaVoluntaria: 0,
  rotacionAcumuladaVoluntariaAnterior: 0,
  rotacionAcumuladaVoluntariaVariacion: 0,
  rotacionAnioActual: 0,
  rotacionAnioActualAnterior: 0,
  rotacionAnioActualVariacion: 0,
  rotacionAnioActualClaves: 0,
  rotacionAnioActualClavesAnterior: 0,
  rotacionAnioActualClavesVariacion: 0,
  rotacionAnioActualVoluntaria: 0,
  rotacionAnioActualVoluntariaAnterior: 0,
  rotacionAnioActualVoluntariaVariacion: 0,
};

/**
 * Hook para calcular KPIs de retención con desglose voluntaria/involuntaria
 * Usa funciones helper centralizadas para eliminar duplicación
 */
export function useRetentionKPIs({
  plantilla,
  plantillaFilteredYearScope,
  retentionFilters,
  selectedPeriod,
  bajasData,
  bajasDataLoading,
}: UseRetentionKPIsOptions): RetentionKPIs {
  return useMemo(() => {
    // Solo calcular si tenemos datos de plantilla cargados
    if (!plantilla || plantilla.length === 0) {
      return EMPTY_KPIS;
    }

    // Esperar a que bajasData termine de cargar para evitar flash con datos incorrectos
    if (bajasDataLoading) {
      return EMPTY_KPIS;
    }

    // plantilla ya viene filtrada por estructura (dept/area/puesto/etc.)
    // Para cálculos del mes actual usamos datos filtrados por año
    const longTermPlantilla =
      plantillaFilteredYearScope.length > 0
        ? plantillaFilteredYearScope
        : plantilla;

    // Para comparativos año anterior: misma plantilla filtrada por estructura
    // pero SIN filtro de año para permitir comparativos históricos
    const plantillaForComparison = applyFiltersWithScope(
      plantilla,
      {
        ...retentionFilters,
        years: [],
        includeInactive: true,
      },
      "general"
    );

    const currentMonth = selectedPeriod.getMonth();
    const currentYear = selectedPeriod.getFullYear();
    const inicioMes = new Date(currentYear, currentMonth, 1);
    const finMes = new Date(currentYear, currentMonth + 1, 0);
    const previousReference = new Date(currentYear, currentMonth - 1, 1);
    const previousYearReference = new Date(currentYear - 1, currentMonth, 1);
    const inicioMesAnterior = new Date(
      previousReference.getFullYear(),
      previousReference.getMonth(),
      1
    );
    const finMesAnterior = new Date(
      previousReference.getFullYear(),
      previousReference.getMonth() + 1,
      0
    );

    // Activos promedio del mes (y comparación)
    const activosPromedioActual = calculateActivosPromedio(
      longTermPlantilla,
      inicioMes,
      finMes
    );
    const activosPromedioPrevio = calculateActivosPromedio(
      longTermPlantilla,
      inicioMesAnterior,
      finMesAnterior
    );

    // Bajas tempranas históricas (se mantiene para reportes auxiliares)
    const bajasTempranas = calculateBajasTempranas(longTermPlantilla);

    // Rotación mensual con desglose voluntaria/involuntaria
    const rotacionMensualActual = calcularRotacionConDesglose(
      longTermPlantilla,
      inicioMes,
      finMes,
      bajasData
    );
    const rotacionMensualPrevio = calcularRotacionConDesglose(
      longTermPlantilla,
      inicioMesAnterior,
      finMesAnterior,
      bajasData
    );

    // Rotación del mismo mes año anterior (para comparación year-over-year)
    const inicioMesSameMonthPrevYear = new Date(currentYear - 1, currentMonth, 1);
    const finMesSameMonthPrevYear = new Date(currentYear - 1, currentMonth + 1, 0);
    const rotacionMensualSameMonthPrevYear = calcularRotacionConDesglose(
      plantillaForComparison, // Usar plantilla sin filtro de año
      inicioMesSameMonthPrevYear,
      finMesSameMonthPrevYear,
      bajasData
    );

    // Rotación acumulada y YTD con sus comparativos
    const rotacionAcumuladaActual = calcularRotacionAcumulada12mConDesglose(
      plantillaForComparison,
      selectedPeriod,
      bajasData
    );
    const rotacionAcumuladaPrevio = calcularRotacionAcumulada12mConDesglose(
      plantillaForComparison,
      previousYearReference,
      bajasData
    );
    const rotacionYTDActual = calcularRotacionYTDConDesglose(
      plantillaForComparison,
      selectedPeriod,
      bajasData
    );
    const rotacionYTDPrevio = calcularRotacionYTDConDesglose(
      plantillaForComparison,
      previousYearReference,
      bajasData
    );

    // Formatear valores de rotación mensual
    const rotMensualInv = Number(rotacionMensualActual.involuntaria.toFixed(2));
    const rotMensualVol = Number(rotacionMensualActual.voluntaria.toFixed(2));
    const rotMensualTotal = Number(rotacionMensualActual.total.toFixed(2));
    const rotMensualInvPrev = Number(rotacionMensualPrevio.involuntaria.toFixed(2));
    const rotMensualVolPrev = Number(rotacionMensualPrevio.voluntaria.toFixed(2));
    const rotMensualTotalPrev = Number(rotacionMensualPrevio.total.toFixed(2));
    const rotMensualTotalSameMonthPrevYear = Number(
      rotacionMensualSameMonthPrevYear.total.toFixed(2)
    );

    // Formatear valores de rotación acumulada
    const rotAcumuladaInv = Number(rotacionAcumuladaActual.involuntaria.toFixed(2));
    const rotAcumuladaVol = Number(rotacionAcumuladaActual.voluntaria.toFixed(2));
    const rotAcumuladaTotal = Number(rotacionAcumuladaActual.total.toFixed(2));
    const rotAcumuladaInvPrev = Number(rotacionAcumuladaPrevio.involuntaria.toFixed(2));
    const rotAcumuladaVolPrev = Number(rotacionAcumuladaPrevio.voluntaria.toFixed(2));
    const rotAcumuladaTotalPrev = Number(rotacionAcumuladaPrevio.total.toFixed(2));

    // Formatear valores de rotación YTD
    const rotYTDInv = Number(rotacionYTDActual.involuntaria.toFixed(2));
    const rotYTDVol = Number(rotacionYTDActual.voluntaria.toFixed(2));
    const rotYTDTotal = Number(rotacionYTDActual.total.toFixed(2));
    const rotYTDInvPrev = Number(rotacionYTDPrevio.involuntaria.toFixed(2));
    const rotYTDVolPrev = Number(rotacionYTDPrevio.voluntaria.toFixed(2));
    const rotYTDTotalPrev = Number(rotacionYTDPrevio.total.toFixed(2));

    // Bajas del mes
    const bajasVoluntariasMes = rotacionMensualActual.bajasVoluntarias;
    const bajasVoluntariasMesPrev = rotacionMensualPrevio.bajasVoluntarias;
    const bajasInvoluntariasMes = rotacionMensualActual.bajasInvoluntarias;
    const bajasInvoluntariasMesPrev = rotacionMensualPrevio.bajasInvoluntarias;

    return {
      activosPromedio: Math.round(activosPromedioActual),
      activosPromedioAnterior: Math.round(activosPromedioPrevio),
      activosPromedioVariacion: calculateVariancePercentage(
        activosPromedioActual,
        activosPromedioPrevio
      ),
      bajasTempranas,
      bajasVoluntarias: bajasVoluntariasMes,
      bajasVoluntariasAnterior: bajasVoluntariasMesPrev,
      bajasVoluntariasVariacion: calculateVariancePercentage(
        bajasVoluntariasMes,
        bajasVoluntariasMesPrev
      ),
      bajasInvoluntarias: bajasInvoluntariasMes,
      bajasInvoluntariasAnterior: bajasInvoluntariasMesPrev,
      bajasInvoluntariasVariacion: calculateVariancePercentage(
        bajasInvoluntariasMes,
        bajasInvoluntariasMesPrev
      ),
      rotacionMensual: rotMensualTotal,
      rotacionMensualAnterior: rotMensualTotalPrev,
      rotacionMensualSameMonthPrevYear: rotMensualTotalSameMonthPrevYear,
      rotacionMensualVariacion: calculateVariancePercentage(
        rotMensualTotal,
        rotMensualTotalPrev
      ),
      rotacionMensualClaves: rotMensualInv,
      rotacionMensualClavesAnterior: rotMensualInvPrev,
      rotacionMensualClavesVariacion: calculateVariancePercentage(
        rotMensualInv,
        rotMensualInvPrev
      ),
      rotacionMensualVoluntaria: rotMensualVol,
      rotacionMensualVoluntariaAnterior: rotMensualVolPrev,
      rotacionMensualVoluntariaVariacion: calculateVariancePercentage(
        rotMensualVol,
        rotMensualVolPrev
      ),
      rotacionAcumulada: rotAcumuladaTotal,
      rotacionAcumuladaAnterior: rotAcumuladaTotalPrev,
      rotacionAcumuladaVariacion: calculateVariancePercentage(
        rotAcumuladaTotal,
        rotAcumuladaTotalPrev
      ),
      rotacionAcumuladaClaves: rotAcumuladaInv,
      rotacionAcumuladaClavesAnterior: rotAcumuladaInvPrev,
      rotacionAcumuladaClavesVariacion: calculateVariancePercentage(
        rotAcumuladaInv,
        rotAcumuladaInvPrev
      ),
      rotacionAcumuladaVoluntaria: rotAcumuladaVol,
      rotacionAcumuladaVoluntariaAnterior: rotAcumuladaVolPrev,
      rotacionAcumuladaVoluntariaVariacion: calculateVariancePercentage(
        rotAcumuladaVol,
        rotAcumuladaVolPrev
      ),
      rotacionAnioActual: rotYTDTotal,
      rotacionAnioActualAnterior: rotYTDTotalPrev,
      rotacionAnioActualVariacion: calculateVariancePercentage(
        rotYTDTotal,
        rotYTDTotalPrev
      ),
      rotacionAnioActualClaves: rotYTDInv,
      rotacionAnioActualClavesAnterior: rotYTDInvPrev,
      rotacionAnioActualClavesVariacion: calculateVariancePercentage(
        rotYTDInv,
        rotYTDInvPrev
      ),
      rotacionAnioActualVoluntaria: rotYTDVol,
      rotacionAnioActualVoluntariaAnterior: rotYTDVolPrev,
      rotacionAnioActualVoluntariaVariacion: calculateVariancePercentage(
        rotYTDVol,
        rotYTDVolPrev
      ),
    };
  }, [plantilla, plantillaFilteredYearScope, retentionFilters, selectedPeriod, bajasData, bajasDataLoading]);
}
