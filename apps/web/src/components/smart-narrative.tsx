"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Sparkles } from "lucide-react";
import { geminiAI, type NarrativeLevel } from "@/lib/gemini-ai";
import { cn } from "@/lib/utils";

interface SmartNarrativeProps {
  data: unknown;
  section: string;
  title?: string;
  refreshEnabled?: boolean;
  className?: string;
}

const levelLabels: Record<NarrativeLevel, string> = {
  manager: "Ejecutivo",
  analyst: "Detalle",
};

const levelColors: Record<NarrativeLevel, string> = {
  manager: "bg-sky-100 text-sky-800",
  analyst: "bg-purple-100 text-purple-800",
};

export function SmartNarrative({
  data,
  section,
  title = "Análisis IA de Retención",
  refreshEnabled,
  className,
}: SmartNarrativeProps) {
  const [level, setLevel] = useState<NarrativeLevel>("manager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string>("");
  const [hasRequested, setHasRequested] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dataSignature = useMemo(() => {
    try {
      return JSON.stringify(data);
    } catch {
      return "{}";
    }
  }, [data]);

  useEffect(() => {
    // Si cambian los datos, pedimos clic manual otra vez y limpiamos la narrativa
    setHasRequested(false);
    setNarrative("");
    setError(null);
    setLoading(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [dataSignature]);

  const handleGenerate = () => {
    if (!data) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setHasRequested(true);
    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      geminiAI
        .generateNarrative(data, level, section)
        .then((text) => setNarrative(text))
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Error al generar narrativa";
          setError(message);
        })
        .finally(() => setLoading(false));
    }, 200);
  };

  return (
    <Card
      className={cn(
        "border border-slate-200/70 shadow-sm backdrop-blur-lg",
        refreshEnabled &&
          "rounded-2xl border-brand-border/70 bg-brand-surface/60 shadow-brand/10 dark:border-brand-border/40 dark:bg-brand-surface/70",
        className
      )}
    >
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className={cn("text-lg", refreshEnabled && "font-heading text-brand-ink")}>
            {title}
          </CardTitle>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <Tabs value={level} onValueChange={(value) => setLevel(value as NarrativeLevel)}>
            <TabsList className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1 dark:bg-slate-900/60">
              {(["manager", "analyst"] as NarrativeLevel[]).map((option) => (
                <TabsTrigger
                  key={option}
                  value={option}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    "data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-800",
                    "data-[state=active]:shadow-sm",
                    !refreshEnabled && "border border-transparent"
                  )}
                >
                  {levelLabels[option]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !data}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              loading
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Sparkles className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : narrative ? (
          <div className="space-y-2 rounded-xl border border-slate-100/80 bg-white/80 p-4 text-sm leading-relaxed shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Nivel {levelLabels[level]}
            </div>
            <div
              className={cn(
                "whitespace-pre-wrap text-slate-800 dark:text-slate-100",
                levelColors[level]
              )}
            >
              <span className="font-medium text-slate-900 dark:text-white">{narrative}</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
