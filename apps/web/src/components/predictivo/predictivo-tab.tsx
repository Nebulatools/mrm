"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plug, PlugZap, Loader2, Unplug, Brain, Plus } from "lucide-react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formModelId, setFormModelId] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Save new connection
  const handleSave = async () => {
    if (!formName || !formUrl || !formModelId) return;
    setSaving(true);
    try {
      const newConn = await db.addPredictiveConnection(formName, formUrl, formModelId);
      setConnections((prev) => [newConn, ...prev]);
      setSelectedId(newConn.id);
      setDialogOpen(false);
      setFormName("");
      setFormUrl("");
      setFormModelId("");
    } finally {
      setSaving(false);
    }
  };

  // Toggle connection active/inactive
  const handleToggle = async (conn: Connection) => {
    const updated = await db.togglePredictiveConnection(conn.id, !conn.is_active);
    setConnections((prev) => prev.map((c) => (c.id === conn.id ? updated : c)));
    if (!updated.is_active) {
      setMlDataMap((prev) => {
        const next = { ...prev };
        delete next[conn.id];
        return next;
      });
    }
  };

  // Delete connection
  const handleDelete = async (conn: Connection) => {
    await db.deletePredictiveConnection(conn.id);
    setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    setMlDataMap((prev) => {
      const next = { ...prev };
      delete next[conn.id];
      return next;
    });
    if (selectedId === conn.id) {
      const remaining = connections.filter((c) => c.id !== conn.id);
      setSelectedId(remaining[0]?.id || null);
    }
  };

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
      <>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analisis Predictivo</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Conecta fuentes de Machine Learning para ver predicciones de riesgo
              integradas en tu dashboard.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plug className="h-4 w-4" />
              Conectar fuente ML
            </Button>
          </CardContent>
        </Card>
        <ConnectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          name={formName}
          url={formUrl}
          modelId={formModelId}
          onNameChange={setFormName}
          onUrlChange={setFormUrl}
          onModelIdChange={setFormModelId}
          onSave={handleSave}
          saving={saving}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection selector bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {connections.map((conn) => (
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
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                conn.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-sm font-medium">{conn.name}</span>
            {!conn.is_active && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                Off
              </Badge>
            )}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-1.5 text-xs border-dashed"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {/* Selected connection content */}
      {selected && (
        <div className="space-y-5">
          {/* Connection header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">{selected.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  selected.is_active
                    ? "text-emerald-600 border-emerald-300"
                    : "text-muted-foreground border-muted"
                }`}
              >
                {selected.is_active ? "Conectado" : "Desconectado"}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{selected.base_url}</span>
            </div>
            <div className="flex gap-1">
              {selected.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(selected)}
                  className="gap-1.5 text-xs"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Desconectar
                </Button>
              )}
            </div>
          </div>

          {/* Inactive state */}
          {!selected.is_active && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Unplug className="h-6 w-6 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Fuente desconectada.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleToggle(selected)} className="gap-1.5">
                    <PlugZap className="h-3.5 w-3.5" />
                    Reconectar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(selected)}
                  >
                    Eliminar conexion
                  </Button>
                </div>
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
            />
          )}
        </div>
      )}

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        name={formName}
        url={formUrl}
        modelId={formModelId}
        onNameChange={setFormName}
        onUrlChange={setFormUrl}
        onModelIdChange={setFormModelId}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ─── Connection Dialog ────────────────────────────────────

function ConnectionDialog({
  open,
  onOpenChange,
  name,
  url,
  modelId,
  onNameChange,
  onUrlChange,
  onModelIdChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  url: string;
  modelId: string;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onModelIdChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar fuente ML</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nombre</label>
            <Input
              placeholder="Modelo Rotacion"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">URL Base</label>
            <Input
              placeholder="https://ml-hazel.vercel.app"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Model ID</label>
            <Input
              placeholder="9b5b075a-..."
              value={modelId}
              onChange={(e) => onModelIdChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving || !name || !url || !modelId} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
