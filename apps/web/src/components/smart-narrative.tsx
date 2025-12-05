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
  manager: "Gerencial",
  executive: "Ejecutivo",
  analyst: "Analista",
};

const levelColors: Record<NarrativeLevel, string> = {
  manager: "bg-sky-100 text-sky-800",
  executive: "bg-emerald-100 text-emerald-800",
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dataSignature = useMemo(() => {
    try {
      return JSON.stringify(data);
    } catch {
      return "{}";
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      geminiAI
        .generateNarrative(data, level, section)
        .then((text) => {
          if (cancelled) return;
          setNarrative(text);
        })
        .catch((err) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Error al generar narrativa";
          setError(message);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, dataSignature, level, section]);

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
          <span className="text-xl">✨</span>
          <CardTitle className={cn("text-lg", refreshEnabled && "font-heading text-brand-ink")}>
            {title}
          </CardTitle>
          <Badge variant="outline" className="ml-2 text-xs">
            IA en vivo
          </Badge>
        </div>
        <Tabs value={level} onValueChange={(value) => setLevel(value as NarrativeLevel)}>
          <TabsList className="grid grid-cols-3 gap-2 rounded-full bg-slate-100 p-1 dark:bg-slate-900/60">
            {(["manager", "executive", "analyst"] as NarrativeLevel[]).map((option) => (
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
        ) : (
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
              <span className="font-medium text-slate-900 dark:text-white">
                {narrative || "Ajusta los filtros para ver la narrativa de este período."}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
