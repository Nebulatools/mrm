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
import { format } from "date-fns";
import { VisualizationContainer } from "@/components/visualization-container";

//

interface Employee {
  numero_empleado: number;
  puesto?: string;
  unidad?: string;  // Centro de costo (cc)
  empresa?: string;
  ubicacion?: string;
  departamento?: string;
  area?: string;
  fecha_ingreso: string;
  fecha_baja: string | null;
  motivo: string;
  antiguedad: string;
}

interface DismissalReasonsTableProps {
  plantilla: PlantillaRecord[];
  refreshEnabled?: boolean;
  motivoFilter?: 'involuntaria' | 'voluntaria' | 'all';
}

// Color mapping removed (not used)

export function DismissalReasonsTable({
  plantilla,
  refreshEnabled = false,
  motivoFilter = 'all',
}: DismissalReasonsTableProps) {
  const [showAll, setShowAll] = useState(false); // COLAPSADA POR DEFECTO

  const sanitizeText = (value?: string) => {
    if (!value) return 'N/A';
    const v = String(value);
    // Hide macOS temp screenshot paths or any absolute file paths
    const isFilePath = v.includes('/var/folders/') || v.startsWith('/') || v.match(/^([A-Za-z]:\\|file:\/\/)/);
    const looksLikeScreenshot = v.toLowerCase().includes('screenshot') || v.toLowerCase().includes('nsird_screencaptureui');
    if (isFilePath || looksLikeScreenshot) return '—';
    const cleaned = v.replace(/\(empleados_sftp\)/gi, '').replace(/empleados_sftp/gi, '').trim();
    return cleaned || '—';
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
  
  const calcularAntiguedad = (fechaIngreso: string | null, fechaBaja: string | null): string => {
    if (!fechaIngreso) return '—';
    const inicio = new Date(fechaIngreso);
    const fin = fechaBaja ? new Date(fechaBaja) : new Date();
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return '—';

    const diffMs = fin.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0 && months > 0) return `${years}a ${months}m`;
    if (years > 0) return `${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
    return `${diffDays} días`;
  };

  const empleadosDetalle: Employee[] = (showAll ? empleadosOrdenados : empleadosOrdenados.slice(0, 10))
    .map(emp => ({
      numero_empleado: emp.numero_empleado || 0,
      puesto: sanitizeText(normalizePuesto(emp.puesto)) || 'Sin puesto',
      unidad: sanitizeText(emp.cc || '') || 'Sin unidad',
      empresa: sanitizeText(emp.empresa || '') || 'Sin empresa',
      ubicacion: sanitizeText(emp.ubicacion || '') || 'Sin ubicación',
      departamento: sanitizeText(normalizeDepartamento(emp.departamento)) || 'Sin departamento',
      area: sanitizeText(emp.area || '') || 'Sin área',
      fecha_ingreso: emp.fecha_ingreso,
      fecha_baja: emp.fecha_baja || null,
      motivo: prettyMotivo(emp.motivo_baja),
      antiguedad: calcularAntiguedad(emp.fecha_ingreso, emp.fecha_baja)
    }));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return dateString || '—';
    }
    return format(parsed, 'dd-MM-yyyy');
  };

  return (
    <div className={cn("space-y-6", refreshEnabled && "space-y-8")}>
      {/* Resumen de Bajas removed as requested */}
      {/* Listado Detallado de Bajas Recientes */}
      <Card
        className={cn(
          "border border-border bg-card shadow-sm",
          refreshEnabled &&
            "rounded-2xl border-brand-border/50 bg-card shadow-brand transition-shadow dark:border-brand-border/40 dark:bg-brand-surface/80"
        )}
      >
        <CardHeader
          className={cn(
            "flex flex-col gap-3",
            refreshEnabled && "pb-6 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="space-y-2">
            <CardTitle
              className={cn(
                "flex items-center gap-2 text-lg",
                refreshEnabled && "font-heading text-xl text-brand-ink dark:text-white"
              )}
            >
              📋 Detalle de Bajas
              <Badge
                variant="outline"
                className={cn(
                  "ml-1 text-xs",
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
                "text-sm text-muted-foreground",
                refreshEnabled && "font-body text-sm text-brand-ink/70"
              )}
            >
              Vista compacta con todas las columnas visibles sin scroll horizontal
            </p>
          </div>
          <Button
            variant={refreshEnabled ? "cta" : "outline"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "gap-2",
              refreshEnabled && "rounded-full px-5 py-2 text-sm font-semibold shadow-brand"
            )}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Mostrar todas ({empleadosBaja.length})
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className={cn(refreshEnabled && "px-0 pb-0 pt-0")}>        
          <VisualizationContainer
            title="Detalle de bajas"
            type="table"
            className="w-full"
            filename="detalle-bajas"
          >
            {(isFullscreen) => (
              <div className={isFullscreen ? "w-full" : "overflow-x-auto"}>
                <Table className={cn("table-corporate", isFullscreen ? "text-sm" : "text-xs")}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isFullscreen ? "px-4" : "w-16 px-2"}># Nómina</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "max-w-[100px] px-2"}>Puesto</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-20 px-2"}>Unidad</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-16 px-2"}>Emp</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-20 px-2"}>Ubicación</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "max-w-[80px] px-2"}>Depto</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-20 px-2"}>Área</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-20 px-2"}>F. Ingreso</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-20 px-2"}>F. Baja</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "max-w-[120px] px-2"}>Motivo Baja</TableHead>
                      <TableHead className={isFullscreen ? "px-4" : "w-16 px-2"}>Antig.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleadosDetalle.map((empleado, index) => (
                      <TableRow key={index}>
                        <TableCell className={cn("font-mono", isFullscreen ? "text-xs px-4" : "text-[10px] px-2")}>
                          {empleado.numero_empleado}
                        </TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "max-w-[100px] truncate px-2")} title={empleado.puesto}>{empleado.puesto || "—"}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "w-20 truncate px-2")} title={empleado.unidad}>{empleado.unidad || "—"}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "w-16 truncate px-2")} title={empleado.empresa}>{empleado.empresa || "—"}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "w-20 truncate px-2")} title={empleado.ubicacion}>{empleado.ubicacion || "—"}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "max-w-[80px] truncate px-2")} title={empleado.departamento}>{empleado.departamento || "—"}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "w-20 truncate px-2")} title={empleado.area}>{empleado.area || "—"}</TableCell>
                        <TableCell className={cn("whitespace-nowrap", isFullscreen ? "px-4" : "w-20 px-2")}>{formatDate(empleado.fecha_ingreso)}</TableCell>
                        <TableCell className={cn("whitespace-nowrap", isFullscreen ? "px-4" : "w-20 px-2")}>{formatDate(empleado.fecha_baja)}</TableCell>
                        <TableCell className={cn(isFullscreen ? "px-4" : "max-w-[120px] truncate px-2")} title={empleado.motivo}>{empleado.motivo || "—"}</TableCell>
                        <TableCell className={cn("whitespace-nowrap", isFullscreen ? "px-4" : "w-16 px-2")}>{empleado.antiguedad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </VisualizationContainer>

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
