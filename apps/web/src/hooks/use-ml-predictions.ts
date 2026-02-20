import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabase';

export interface PredictionRow {
  id: number;
  model_name: string;
  algorithm_name: string;
  prediction_date: string;
  horizon: number;
  numero_empleado: number | null;
  predicted_probability: number | null;
  risk_level: string | null;
  segment_type: string | null;
  segment_value: string | null;
  predicted_count: number | null;
  genero: string | null;
  generacion: string | null;
  top_features: string | null;
  was_correct: boolean | null;
  actual_value: number | null;
}

export interface SegmentPrediction {
  segment_type: string;
  segment_value: string;
  predicted_count: number;
  horizon: number;
}

export interface ForecastRow {
  code: string;
  horizon: number;
  predicted_count: number;
}

export function useMLPredictions() {
  const [allPredictions, setAllPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPredictions() {
      try {
        setLoading(true);
        const raw = await db.getMLPredictions({ latestOnly: true, limit: 7000 });
        if (!cancelled) {
          const data = (raw as PredictionRow[]).map((r) => ({
            ...r,
            horizon: typeof r.horizon === 'string' ? Number(r.horizon) : r.horizon,
          }));
          setAllPredictions(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error cargando predicciones');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPredictions();
    return () => { cancelled = true; };
  }, []);

  // --- Rotation model ---
  const rotationEmployees = useMemo(() => {
    return allPredictions.filter(
      (p) => p.model_name === 'rotation' && p.numero_empleado !== null && p.risk_level !== null
    );
  }, [allPredictions]);

  const rotationSegments = useMemo<SegmentPrediction[]>(() => {
    return allPredictions
      .filter(
        (p) =>
          p.model_name === 'rotation' &&
          p.segment_type !== null &&
          p.segment_type !== 'total' &&
          p.predicted_count !== null
      )
      .map((p) => ({
        segment_type: p.segment_type!,
        segment_value: p.segment_value!,
        predicted_count: p.predicted_count!,
        horizon: p.horizon,
      }));
  }, [allPredictions]);

  const rotationRiskCounts = useMemo(() => {
    const counts = { ALTO: 0, MEDIO: 0, BAJO: 0, MINIMO: 0 };
    const h28 = rotationEmployees.filter((e) => e.horizon === 28);
    for (const emp of h28) {
      const level = emp.risk_level as keyof typeof counts;
      if (level in counts) counts[level]++;
    }
    return counts;
  }, [rotationEmployees]);

  // --- Absenteeism risk model ---
  const absenteeismEmployees = useMemo(() => {
    return allPredictions.filter(
      (p) => p.model_name === 'absenteeism_risk' && p.numero_empleado !== null && p.risk_level !== null
    );
  }, [allPredictions]);

  const absenteeismRiskCounts = useMemo(() => {
    const counts = { ALTO: 0, MEDIO: 0, BAJO: 0, MINIMO: 0 };
    const h28 = absenteeismEmployees.filter((e) => e.horizon === 28);
    for (const emp of h28) {
      const level = emp.risk_level as keyof typeof counts;
      if (level in counts) counts[level]++;
    }
    return counts;
  }, [absenteeismEmployees]);

  // --- Absence forecast model ---
  const forecast = useMemo<ForecastRow[]>(() => {
    return allPredictions
      .filter((p) => p.model_name === 'absence_forecast' && p.predicted_count !== null)
      .map((p) => ({
        code: p.segment_value || 'unknown',
        horizon: p.horizon,
        predicted_count: p.predicted_count!,
      }));
  }, [allPredictions]);

  // --- Backwards-compatible aliases ---
  const employees = rotationEmployees;
  const segments = rotationSegments;
  const riskCounts = rotationRiskCounts;

  const predictionDate = useMemo(() => {
    if (allPredictions.length === 0) return null;
    return allPredictions[0].prediction_date;
  }, [allPredictions]);

  return {
    // Rotation
    employees,
    segments,
    riskCounts,
    rotationEmployees,
    rotationSegments,
    rotationRiskCounts,
    // Absenteeism
    absenteeismEmployees,
    absenteeismRiskCounts,
    // Forecast
    forecast,
    // Meta
    predictionDate,
    loading,
    error,
  };
}
