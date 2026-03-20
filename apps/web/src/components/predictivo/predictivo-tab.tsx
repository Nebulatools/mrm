"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Unplug, Brain } from "lucide-react";
import { db } from "@/lib/supabase";
import {
  InsightsPanel,
  type PredictiveModel,
  type PredictiveTrainingJob,
  type PredictivePrediction,
} from "./insights-panel";

interface Connection {
  id: string;
  name: string;
  base_url: string;
  model_id: string;
  risk_label: string;
  is_active: boolean;
}

interface MLData {
  model: PredictiveModel | null;
  trainingJob: PredictiveTrainingJob | null;
  predictions: PredictivePrediction[];
  loading: boolean;
  error: string | null;
}

async function proxyFetch(baseUrl: string, path: string) {
  const params = new URLSearchParams({ base_url: baseUrl, path });
  const res = await fetch(`/api/predictive-proxy?${params}`);
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

export function PredictivoTab() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ML data per connection
  const [mlDataMap, setMlDataMap] = useState<Record<string, MLData>>({});

  const selected = connections.find((c) => c.id === selectedId) || null;
  const selectedData = selectedId ? mlDataMap[selectedId] : null;

  // Load connections on mount
  useEffect(() => {
    db.getPredictiveConnections().then((conns) => {
      setConnections(conns);
      if (conns.length > 0) {
        const active = conns.find((c: Connection) => c.is_active) || conns[0];
        setSelectedId(active.id);
      }
      setLoading(false);
    });
  }, []);

  // Fetch ML data for a connection
  const fetchMLData = useCallback(async (conn: Connection) => {
    if (!conn.is_active) return;

    setMlDataMap((prev) => ({
      ...prev,
      [conn.id]: { model: null, trainingJob: null, predictions: [], loading: true, error: null },
    }));

    try {
      const [modelData, predsData] = await Promise.all([
        proxyFetch(conn.base_url, `/api/models/${conn.model_id}`),
        proxyFetch(conn.base_url, `/api/predictions?model_id=${conn.model_id}`),
      ]);

      const predsList = Array.isArray(predsData) ? predsData : predsData.predictions || [];

      let trainingJob: PredictiveTrainingJob | null = null;
      if (modelData.training_jobs?.length) {
        trainingJob =
          modelData.training_jobs.find((j: PredictiveTrainingJob) => j.status === "completed") ||
          modelData.training_jobs[0];
      } else if (modelData.id) {
        try {
          const jobsData = await proxyFetch(conn.base_url, `/api/training-jobs?model_id=${conn.model_id}`);
          const jobs = Array.isArray(jobsData) ? jobsData : jobsData.training_jobs || [];
          trainingJob = jobs.find((j: PredictiveTrainingJob) => j.status === "completed") || jobs[0] || null;
        } catch {
          trainingJob = { id: "unknown", status: "completed" };
        }
      }

      setMlDataMap((prev) => ({
        ...prev,
        [conn.id]: { model: modelData, trainingJob, predictions: predsList, loading: false, error: null },
      }));
    } catch (e) {
      setMlDataMap((prev) => ({
        ...prev,
        [conn.id]: {
          model: null,
          trainingJob: null,
          predictions: [],
          loading: false,
          error: e instanceof Error ? e.message : "Error al conectar",
        },
      }));
    }
  }, []);

  // Fetch data when selected changes
  useEffect(() => {
    if (selected?.is_active && !mlDataMap[selected.id]) {
      fetchMLData(selected);
    }
  }, [selected, fetchMLData, mlDataMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No connections → empty state
  if (connections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Brain className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Analisis Predictivo</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No hay fuentes conectadas. Configura una conexion desde el panel de administracion.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection selector bar */}
      {connections.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {connections.filter((c) => c.is_active).map((conn) => (
            <button
              key={conn.id}
              onClick={() => setSelectedId(conn.id)}
              className={`
                group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all
                ${conn.id === selectedId
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 hover:border-primary/30"
                }
              `}
            >
              <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
              <span className="text-sm font-medium">{conn.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected connection content */}
      {selected && (
        <div className="space-y-5">
          {/* Inactive state */}
          {!selected.is_active && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Unplug className="h-6 w-6 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Fuente desconectada. Activa la conexion desde el panel de administracion.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {selected.is_active && selectedData?.loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando insights...</span>
            </div>
          )}

          {/* Error */}
          {selected.is_active && selectedData?.error && !selectedData.loading && (
            <Card className="border-destructive/50">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-destructive mb-3">{selectedData.error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchMLData(selected)}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {selected.is_active && selectedData && !selectedData.loading && !selectedData.error && selectedData.model && (
            <InsightsPanel
              predictions={selectedData.predictions}
              trainingJob={selectedData.trainingJob}
              model={selectedData.model}
              riskLabel={selected.risk_label || 'irse'}
            />
          )}
        </div>
      )}

    </div>
  );
}
