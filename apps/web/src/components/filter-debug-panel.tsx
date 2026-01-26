"use client";

import { useState } from "react";
import { Bug, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RetentionFilterOptions } from "@/lib/filters";
import type { PlantillaRecord } from "@/lib/supabase";
import type { MotivoBajaRecord } from "@/lib/types/records";

interface FilterDebugPanelProps {
  tab: "resumen" | "personal" | "incidencias" | "rotacion";
  retentionFilters: RetentionFilterOptions;
  plantillaFiltered?: PlantillaRecord[];
  plantillaRotacionYearScope?: PlantillaRecord[];
  plantillaFilteredYearScope?: PlantillaRecord[];
  motivosBaja?: MotivoBajaRecord[];
  selectedPeriod?: Date;
}

export function FilterDebugPanel({
  tab,
  retentionFilters,
  plantillaFiltered = [],
  plantillaRotacionYearScope = [],
  plantillaFilteredYearScope = [],
  motivosBaja = [],
  selectedPeriod,
}: FilterDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Análisis de filtros activos
  const activeFiltersCount = Object.entries(retentionFilters).filter(
    ([key, value]) => Array.isArray(value) && value.length > 0
  ).length;

  // Análisis de bajas en diciembre 2025 (para debug de rotación)
  const december2025Bajas = motivosBaja.filter(baja => {
    if (!baja.fecha_baja) return false;
    const date = new Date(baja.fecha_baja);
    return date.getFullYear() === 2025 && date.getMonth() === 11; // Diciembre
  });

  const plantillaWithBajaDec2025 = plantillaRotacionYearScope.filter(emp => {
    if (!emp.fecha_baja) return false;
    const date = new Date(emp.fecha_baja);
    return date.getFullYear() === 2025 && date.getMonth() === 11;
  });

  // Warning si hay inconsistencia
  const hasInconsistency = december2025Bajas.length !== plantillaWithBajaDec2025.length;

  return (
    <Card className="mb-4 border-2 border-orange-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bug className="h-4 w-4 text-orange-500" />
            🔍 Debug de Filtros - Tab: {tab.toUpperCase()}
            {hasInconsistency && (
              <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Resumen de filtros activos */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-semibold text-xs mb-2">📊 Filtros Activos ({activeFiltersCount})</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <strong>Años:</strong> {retentionFilters.years?.length || 0}
                {retentionFilters.years && retentionFilters.years.length > 0 &&
                  ` (${retentionFilters.years.join(', ')})`}
              </div>
              <div>
                <strong>Meses:</strong> {retentionFilters.months?.length || 0}
                {retentionFilters.months && retentionFilters.months.length > 0 &&
                  ` (${retentionFilters.months.join(', ')})`}
              </div>
              <div>
                <strong>Departamentos:</strong> {retentionFilters.departamentos?.length || 0}
              </div>
              <div>
                <strong>Puestos:</strong> {retentionFilters.puestos?.length || 0}
              </div>
              <div>
                <strong>Empresas:</strong> {retentionFilters.empresas?.length || 0}
              </div>
              <div>
                <strong>Áreas:</strong> {retentionFilters.areas?.length || 0}
              </div>
              <div>
                <strong>Ubicaciones:</strong> {retentionFilters.ubicaciones?.length || 0}
              </div>
              <div>
                <strong>Clasificaciones:</strong> {retentionFilters.clasificaciones?.length || 0}
              </div>
            </div>
          </div>

          {/* Análisis de plantillas */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-semibold text-xs mb-2">👥 Datasets de Plantilla</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>plantillaFiltered:</span>
                <strong>{plantillaFiltered.length} empleados</strong>
              </div>
              <div className="flex justify-between">
                <span>plantillaRotacionYearScope:</span>
                <strong>{plantillaRotacionYearScope.length} empleados</strong>
              </div>
              <div className="flex justify-between">
                <span>plantillaFilteredYearScope:</span>
                <strong>{plantillaFilteredYearScope.length} empleados</strong>
              </div>
              <div className="flex justify-between">
                <span>motivosBaja (total):</span>
                <strong>{motivosBaja.length} bajas</strong>
              </div>
            </div>
          </div>

          {/* Análisis específico para Rotación tab */}
          {tab === "rotacion" && (
            <div className={`p-3 rounded-lg ${hasInconsistency ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
              <h4 className="font-semibold text-xs mb-2 flex items-center gap-2">
                {hasInconsistency ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                🎯 Análisis Diciembre 2025
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Bajas en motivos_baja (dic 2025):</span>
                  <strong className={hasInconsistency ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {december2025Bajas.length}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Bajas en plantillaRotacionYearScope:</span>
                  <strong className={hasInconsistency ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {plantillaWithBajaDec2025.length}
                  </strong>
                </div>
                {hasInconsistency && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-700 dark:text-red-300">
                    ⚠️ <strong>INCONSISTENCIA DETECTADA:</strong> Las bajas no coinciden!
                    <br />
                    Diferencia: {Math.abs(december2025Bajas.length - plantillaWithBajaDec2025.length)} bajas
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fecha seleccionada */}
          {selectedPeriod && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-semibold text-xs mb-2">📅 Período Seleccionado</h4>
              <div className="text-xs">
                {selectedPeriod.toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}

          {/* Análisis por tab */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-semibold text-xs mb-2">📋 Comportamiento de Tab</h4>
            <div className="text-xs space-y-1">
              {tab === "resumen" && (
                <>
                  <div>✅ Usa <code>plantillaFiltered</code> con filtros temporales</div>
                  <div>✅ KPIs generales y tendencias</div>
                </>
              )}
              {tab === "personal" && (
                <>
                  <div>✅ Usa <code>plantillaFiltered</code> con filtros completos</div>
                  <div>✅ Análisis de edad, género, antigüedad</div>
                </>
              )}
              {tab === "incidencias" && (
                <>
                  <div>✅ Usa <code>plantillaFiltered</code> + incidenciasData</div>
                  <div>✅ Análisis de ausentismo y permisos</div>
                </>
              )}
              {tab === "rotacion" && (
                <>
                  <div className={hasInconsistency ? 'text-red-600 dark:text-red-400' : ''}>
                    {hasInconsistency ? '❌' : '✅'} Usa <code>plantillaRotacionYearScope</code> + motivosBaja
                  </div>
                  <div>📊 Tablas de rotación por motivo, área, mes</div>
                  <div className="text-orange-600 dark:text-orange-400 mt-2">
                    ⚠️ <strong>IMPORTANTE:</strong> Las tablas de rotación NO deben filtrar
                    por departamento/puesto porque pierden bajas. Solo deben filtrar por año.
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
