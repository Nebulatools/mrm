"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserClient } from "@/lib/supabase-client";
import { summarizeAbandonos } from "@/lib/gemini-ai";
import { format } from "date-fns";

type Props = {
  referenceDate: Date; // Usar la fecha seleccionada en filtros (fin de mes)
};

const FALLBACK_BULLETS = [
  "No hay registros de bajas con motivo otro/abandono/sin información en el mes seleccionado.",
];

export function AbandonosOtrosSummary({ referenceDate }: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [bullets, setBullets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

        const { data, error } = await supabase
          .from("motivos_baja")
          .select("motivo, descripcion")
          .gte("fecha_baja", format(start, "yyyy-MM-dd"))
          .lte("fecha_baja", format(end, "yyyy-MM-dd"));

        if (error) throw error;

        const selected = (data || []).filter((row) => {
          const motivo = (row.motivo || "").toLowerCase();
          return (
            motivo.includes("otro") ||
            motivo.includes("aband") ||
            motivo.includes("sin inform") ||
            motivo.includes("sin dato")
          );
        });

        const descriptions = selected
          .map((r) => (r.descripcion || "").trim())
          .filter((d) => d.length > 0);

        if (descriptions.length === 0) {
          setBullets(FALLBACK_BULLETS);
          return;
        }

        const summary = await summarizeAbandonos(descriptions);
        if (!cancelled) {
          setBullets(summary.length ? summary : FALLBACK_BULLETS);
        }
      } catch (err) {
        console.error("Error generando resumen de abandonos:", err);
        if (!cancelled) {
          setError("No se pudo generar el resumen");
          setBullets(FALLBACK_BULLETS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [referenceDate, supabase]);

  return (
    <Card className="border-brand-border/40 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Detalle de Abandonos/Otros</CardTitle>
        <p className="text-sm text-muted-foreground">
          Resumen de descripciones de bajas con motivos “otro/abandono/sin información” del mes seleccionado.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Generando resumen...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {bullets.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
