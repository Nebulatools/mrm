"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Calendar } from "lucide-react";
import { format } from "date-fns";

interface FilterPanelProps {
  selectedPeriod: Date;
  onPeriodChange: (date: Date) => void;
  onClose: () => void;
}

export function FilterPanel({ selectedPeriod, onPeriodChange, onClose }: FilterPanelProps) {
  const [tempPeriod, setTempPeriod] = useState(selectedPeriod);

  const generatePeriodOptions = () => {
    const options = [];
    const now = new Date();
    
    // Quick time period options
    options.push(
      { value: 'current-week', label: 'Esta Semana', date: now, type: 'week' },
      { value: 'last-week', label: 'Semana Pasada', date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), type: 'week' },
      { value: 'current-month', label: 'Este Mes', date: now, type: 'month' },
      { value: 'last-month', label: 'Mes Pasado', date: new Date(now.getFullYear(), now.getMonth() - 1, 1), type: 'month' },
      { value: 'current-year', label: 'Este Año', date: new Date(now.getFullYear(), 0, 1), type: 'year' },
      { value: 'last-year', label: 'Año Pasado', date: new Date(now.getFullYear() - 1, 0, 1), type: 'year' },
      { value: 'last-12-months', label: 'Últimos 12 Meses', date: new Date(now.getFullYear(), now.getMonth() - 11, 1), type: 'range' }
    );
    
    // Add separator
    options.push({ value: 'separator', label: '--- Meses Específicos ---', date: null, type: 'separator' });
    
    // Generate options for specific months (last 18 months)
    for (let i = 0; i < 18; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
        date: date,
        type: 'month-specific'
      });
    }
    
    return options;
  };

  const periodOptions = generatePeriodOptions();

  const handleApplyFilters = () => {
    onPeriodChange(tempPeriod);
    onClose();
  };

  const handlePeriodSelect = (value: string) => {
    const option = periodOptions.find(opt => opt.value === value);
    if (option && option.date) {
      setTempPeriod(option.date);
      // Actualizar inmediatamente y cerrar el modal
      onPeriodChange(option.date);
      onClose();
    }
  };

  return (
    <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros del Dashboard
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={format(tempPeriod, 'yyyy-MM')} onValueChange={handlePeriodSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {periodOptions.map((option) => (
                    option.type === 'separator' ? (
                      <div key={option.value} className="px-2 py-1 text-xs font-medium text-gray-500 border-t mt-1 pt-2">
                        {option.label}
                      </div>
                    ) : (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                          {(option.type === 'week' || option.type === 'month' || option.type === 'year' || option.type === 'range') && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                              {option.type === 'week' ? 'Sem' : option.type === 'month' ? 'Mes' : option.type === 'year' ? 'Año' : 'Rango'}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter - RH Department only */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <Select defaultValue="rh" disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Recursos Humanos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rh">Recursos Humanos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Solo departamento de RH disponible</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}