"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PlantillaRecord } from "@/lib/supabase";
import { prettyMotivo, normalizePuesto, normalizeDepartamento, isMotivoClave } from "@/lib/normalizers";
import { cn } from "@/lib/utils";

//

interface Employee {
  id: string;
  puesto?: string;
  departamento?: string;
  clasificacion?: string;
  fecha_baja: string | null;
  motivo_baja?: string;
  ubicacion?: string;
}

interface DismissalReasonsTableProps {
  plantilla: PlantillaRecord[];
  refreshEnabled?: boolean;
  motivoFilter?: 'involuntaria' | 'voluntaria';
}

// Color mapping removed (not used)

export function DismissalReasonsTable({
  plantilla,
  refreshEnabled = false,
  motivoFilter = 'involuntaria',
}: DismissalReasonsTableProps) {
  const [showAll, setShowAll] = useState(false); // COLAPSADA POR DEFECTO

  const sanitizeText = (value?: string) => {
    if (!value) return 'N/A';
    const v = String(value);
    // Hide macOS temp screenshot paths or any absolute file paths
    const isFilePath = v.includes('/var/folders/') || v.startsWith('/') || v.match(/^([A-Za-z]:\\|file:\/\/)/);
    const looksLikeScreenshot = v.toLowerCase().includes('screenshot') || v.toLowerCase().includes('nsird_screencaptureui');
    if (isFilePath || looksLikeScreenshot) return '—';
    return v;
  };

  // Filtrar empleados dados de baja - usar fecha_baja O activo = false
  let empleadosBaja = plantilla.filter(emp => {
    // Tiene fecha de baja O está marcado como inactivo
    return (emp.fecha_baja && emp.fecha_baja !== null) || emp.activo === false;
  });

  // Aplicar filtro por motivo
  if (motivoFilter === 'involuntaria') {
    empleadosBaja = empleadosBaja.filter(emp => isMotivoClave(emp.motivo_baja));
  } else if (motivoFilter === 'voluntaria') {
    empleadosBaja = empleadosBaja.filter(emp => !isMotivoClave(emp.motivo_baja));
  }
  
  // Calcular razones de baja agrupadas
  // Razones agregadas (si se requiere mostrar en otra vista)
  // const motivos = aggregate dismissal reasons here if needed

  // Lista detallada de empleados - ordenar primero y luego decidir cuántos mostrar
  const parseFechaToTime = (value: string | null) => {
    if (!value) return 0;
    const date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const empleadosOrdenados = [...empleadosBaja].sort(
    (a, b) => parseFechaToTime(b.fecha_baja) - parseFechaToTime(a.fecha_baja)
  );
  
  const empleadosDetalle: Employee[] = (showAll ? empleadosOrdenados : empleadosOrdenados.slice(0, 10))
    .map(emp => ({
      id: String(emp.emp_id || emp.numero_empleado || emp.id || 'N/A'),
      puesto: sanitizeText(normalizePuesto(emp.puesto)) || 'Sin puesto',
      departamento: sanitizeText(normalizeDepartamento(emp.departamento)) || 'Sin departamento',
      clasificacion: sanitizeText(emp.clasificacion || '') || 'Sin clasificación',
      fecha_baja: emp.fecha_baja,
      motivo_baja: sanitizeText(prettyMotivo(emp.motivo_baja) || '') || 'No especificado',
      ubicacion: sanitizeText((emp as any).ubicacion || '') || 'Sin ubicación'
    }));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString || '-';
    }
  };

  return (
    <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
      {/* Resumen de Bajas removed as requested */}
      {/* Listado Detallado de Bajas Recientes */}
      <Card
        className={cn(
          "border border-border bg-white shadow-sm dark:bg-gray-900",
          refreshEnabled &&
            "rounded-2xl border-brand-border/60 bg-white/95 shadow-brand transition-shadow dark:border-brand-border/50 dark:bg-gray-900/80"
        )}
      >
        <CardHeader className={cn(refreshEnabled && "pb-6")}>
          <CardTitle
            className={cn(
              "flex items-center gap-2 text-lg",
              refreshEnabled && "font-heading text-xl text-brand-ink"
            )}
          >
            📋 Detalle de Bajas (empleados_sftp)
            <Badge
              variant="outline"
              className={cn(
                "ml-2 text-xs",
                refreshEnabled &&
                  "border-none bg-brand-surface-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-ink/80"
              )}
            >
              {showAll
                ? `Mostrando todas las ${empleadosBaja.length} bajas`
                : `Últimas ${empleadosDetalle.length} de ${empleadosBaja.length} total`}
            </Badge>
          </CardTitle>
          <p
            className={cn(
              "text-sm text-gray-600 dark:text-gray-400",
              refreshEnabled && "font-body text-sm text-brand-ink/70"
            )}
          >
            ID, Departamento, Ubicación, Puesto, Clasificación - Datos completos de
            empleados_sftp
          </p>
        </CardHeader>
        <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>
          <Table
            className={cn(
              refreshEnabled &&
                "text-sm text-brand-ink [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3"
            )}
          >
            <TableHeader
              className={cn(
                refreshEnabled &&
                  "[&_th]:bg-brand-surface-accent [&_th]:font-heading [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-brand-ink"
              )}
            >
              <TableRow
                className={cn(
                  refreshEnabled &&
                    "border-none [&_th:first-child]:rounded-tl-2xl [&_th:last-child]:rounded-tr-2xl"
                )}
              >
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Fecha Baja</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn(
                refreshEnabled &&
                  "bg-white [&_tr:last-child]:rounded-b-2xl [&_tr]:border-none [&_tr]:odd:bg-white/95 [&_tr]:even:bg-brand-surface/50"
              )}
            >
              {empleadosDetalle.map((empleado, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    refreshEnabled &&
                      "hover:bg-brand-surface-accent/70 focus-within:bg-brand-surface-accent/70 transition-colors"
                  )}
                >
                  <TableCell
                    className={cn(
                      "font-mono text-xs",
                      refreshEnabled && "text-sm text-brand-ink/80"
                    )}
                  >
                    {empleado.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs bg-blue-50",
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-medium text-brand-ink/80"
                      )}
                    >
                      {empleado.departamento || "Sin Depto"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-medium text-brand-ink/80"
                      )}
                    >
                      {empleado.ubicacion || "Sin Ubicación"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-medium text-brand-ink/80"
                      )}
                    >
                      {empleado.puesto || "Sin Puesto"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        empleado.clasificacion === "CONFIANZA"
                          ? "default"
                          : empleado.clasificacion === "SINDICALIZADO"
                          ? "destructive"
                          : "secondary"
                      }
                      className={cn(
                        "text-xs font-semibold",
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-semibold text-brand-ink"
                      )}
                    >
                      {empleado.clasificacion || "Sin Clasificación"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-sm",
                      refreshEnabled && "font-medium text-brand-ink/80"
                    )}
                  >
                    {formatDate(empleado.fecha_baja)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        refreshEnabled &&
                          "border-none bg-brand-surface-accent px-2 py-1 text-[11px] font-medium text-brand-ink"
                      )}
                    >
                      {empleado.motivo_baja}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {empleadosBaja.length > 10 && (
            <div
              className={cn(
                "mt-4 text-center",
                refreshEnabled && "mt-6 border-t border-brand-border/50 pt-4"
              )}
            >
              <Button
                variant={refreshEnabled ? "cta" : "outline"}
                onClick={() => setShowAll(!showAll)}
                className={cn("gap-2", refreshEnabled && "px-6 py-2 text-sm font-semibold")}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar todas ({empleadosBaja.length} registros)
                  </>
                )}
              </Button>
            </div>
          )}

          {empleadosDetalle.length === 0 && (
            <div
              className={cn(
                "py-8 text-center text-gray-500",
                refreshEnabled && "text-brand-ink/60"
              )}
            >
              No hay registros de bajas disponibles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
