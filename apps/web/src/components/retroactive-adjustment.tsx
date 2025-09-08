"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Edit, 
  Save, 
  X, 
  History, 
  AlertTriangle,
  Calendar,
  User
} from "lucide-react";
import { KPIResult } from "@/lib/kpi-calculator";
import { format } from "date-fns";

interface AdjustmentRecord {
  id: string;
  kpi_name: string;
  original_value: number;
  adjusted_value: number;
  adjustment_reason: string;
  adjusted_by: string;
  adjustment_date: string;
  period_start: string;
  period_end: string;
}

interface RetroactiveAdjustmentProps {
  kpis: KPIResult[];
  onAdjustmentMade?: () => void;
}

export function RetroactiveAdjustment({ kpis, onAdjustmentMade }: RetroactiveAdjustmentProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPIResult | null>(null);
  const [adjustedValue, setAdjustedValue] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [adjustedBy, setAdjustedBy] = useState<string>("Admin");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Mock adjustment history - in real implementation, this would come from Supabase
  const mockAdjustmentHistory: AdjustmentRecord[] = [
    {
      id: "1",
      kpi_name: "Activos",
      original_value: 25,
      adjusted_value: 27,
      adjustment_reason: "Corrección de datos de nómina - empleados en periodo de prueba",
      adjusted_by: "Manager HR",
      adjustment_date: "2024-12-01T10:30:00Z",
      period_start: "2024-11-01",
      period_end: "2024-11-30"
    },
    {
      id: "2", 
      kpi_name: "Rotación Mensual",
      original_value: 8.5,
      adjusted_value: 7.2,
      adjustment_reason: "Reclasificación de terminaciones voluntarias vs involuntarias",
      adjusted_by: "Director RRHH",
      adjustment_date: "2024-11-28T14:15:00Z",
      period_start: "2024-10-01",
      period_end: "2024-10-31"
    }
  ];

  const handleSelectKPI = (kpi: KPIResult) => {
    setSelectedKPI(kpi);
    setAdjustedValue(kpi.value.toString());
    setAdjustmentReason("");
    setIsDialogOpen(true);
  };

  const handleSaveAdjustment = () => {
    if (!selectedKPI || !adjustedValue || !adjustmentReason.trim()) {
      return;
    }

    const newValue = parseFloat(adjustedValue);
    if (isNaN(newValue)) {
      return;
    }

    // Create new adjustment record
    const newAdjustment: AdjustmentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      kpi_name: selectedKPI.name,
      original_value: selectedKPI.value,
      adjusted_value: newValue,
      adjustment_reason: adjustmentReason,
      adjusted_by: adjustedBy,
      adjustment_date: new Date().toISOString(),
      period_start: selectedKPI.period_start,
      period_end: selectedKPI.period_end
    };

    // In real implementation, this would save to Supabase
    setAdjustmentHistory(prev => [newAdjustment, ...prev]);

    // Close dialog and reset form
    setIsDialogOpen(false);
    setSelectedKPI(null);
    setAdjustedValue("");
    setAdjustmentReason("");

    // Notify parent component
    if (onAdjustmentMade) {
      onAdjustmentMade();
    }
  };

  const formatValue = (value: number, kpiName: string): string => {
    if (kpiName.includes('%') || kpiName.includes('Rotación')) {
      return `${value.toFixed(2)}%`;
    }
    if (kpiName.includes('Prom') && value < 10) {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString('es-MX');
  };

  const getImpactLevel = (original: number, adjusted: number): 'high' | 'medium' | 'low' => {
    const percentChange = Math.abs(((adjusted - original) / original) * 100);
    if (percentChange > 20) return 'high';
    if (percentChange > 10) return 'medium';
    return 'low';
  };

  const getImpactColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ajustes Retroactivos</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Modifica valores de KPIs con registro de auditoría completo
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
        >
          <History className="h-4 w-4 mr-2" />
          {showHistory ? 'Ocultar' : 'Ver'} Historial
        </Button>
      </div>

      {/* Adjustment History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Ajustes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {[...adjustmentHistory, ...mockAdjustmentHistory].length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No hay ajustes registrados aún.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead>Valor Original</TableHead>
                    <TableHead>Valor Ajustado</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Razón</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...adjustmentHistory, ...mockAdjustmentHistory].map((record) => {
                    const impact = getImpactLevel(record.original_value, record.adjusted_value);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.kpi_name}</TableCell>
                        <TableCell>{formatValue(record.original_value, record.kpi_name)}</TableCell>
                        <TableCell>{formatValue(record.adjusted_value, record.kpi_name)}</TableCell>
                        <TableCell>
                          <Badge variant={getImpactColor(impact)}>
                            {impact === 'high' ? 'Alto' : impact === 'medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {record.adjusted_by}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(record.adjustment_date), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={record.adjustment_reason}>
                            {record.adjustment_reason}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.name} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSelectKPI(kpi)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {kpi.name}
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {formatValue(kpi.value, kpi.name)}
                </div>
                <div className="text-xs text-gray-500">
                  Período: {format(new Date(kpi.period_start), 'dd/MM')} - {format(new Date(kpi.period_end), 'dd/MM')}
                </div>
                {kpi.target && (
                  <div className="text-xs text-gray-500">
                    Meta: {formatValue(kpi.target, kpi.name)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Ajustar {selectedKPI?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedKPI && (
            <div className="space-y-4">
              {/* Current Value */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Valor Actual</div>
                <div className="text-2xl font-bold">{formatValue(selectedKPI.value, selectedKPI.name)}</div>
                <div className="text-xs text-gray-500">
                  Período: {format(new Date(selectedKPI.period_start), 'dd/MM/yyyy')} - {format(new Date(selectedKPI.period_end), 'dd/MM/yyyy')}
                </div>
              </div>

              <Separator />

              {/* New Value Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo Valor</label>
                <Input
                  type="number"
                  value={adjustedValue}
                  onChange={(e) => setAdjustedValue(e.target.value)}
                  placeholder="Ingrese el nuevo valor"
                  step={selectedKPI.name.includes('%') || selectedKPI.name.includes('Prom') ? "0.01" : "1"}
                />
              </div>

              {/* Adjustment Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Razón del Ajuste</label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explique la razón del ajuste retroactivo..."
                />
              </div>

              {/* Adjusted By */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuario</label>
                <Input
                  value={adjustedBy}
                  onChange={(e) => setAdjustedBy(e.target.value)}
                  placeholder="Nombre del usuario"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  Los ajustes retroactivos se registran para auditoría y pueden afectar los cálculos de tendencias.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveAdjustment}
                  disabled={!adjustedValue || !adjustmentReason.trim()}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Ajuste
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}