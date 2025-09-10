"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";

export interface RetentionFilterOptions {
  years: number[];
  months: number[];
  departamentos: string[];
  areas: string[];
}

interface RetentionFilterPanelProps {
  onFiltersChange: (filters: RetentionFilterOptions) => void;
  className?: string;
}

export function RetentionFilterPanel({ onFiltersChange, className }: RetentionFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    areas: []
  });
  
  const [availableOptions, setAvailableOptions] = useState({
    years: [] as number[],
    months: [] as number[],
    departamentos: [] as string[],
    areas: [] as string[]
  });

  // Cargar opciones disponibles desde la base de datos
  useEffect(() => {
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    try {
      // Try to get from empleados_sftp first, fallback to plantilla
      let empleados = [];
      try {
        const { data: empleadosSFTP } = await supabase
          .from('empleados_sftp')
          .select('*');
        
        if (empleadosSFTP && empleadosSFTP.length > 0) {
          empleados = empleadosSFTP;
        }
      } catch (e) {
        // Fallback to plantilla
        const { data: plantilla } = await supabase
          .from('plantilla')
          .select('*');
        empleados = plantilla || [];
      }

      // Get motivos_baja for dates
      const { data: motivosBaja } = await supabase
        .from('motivos_baja')
        .select('fecha_baja');

      // Extract all dates
      const allDates = [];
      if (motivosBaja) {
        motivosBaja.forEach(baja => {
          if (baja.fecha_baja) {
            allDates.push(baja.fecha_baja);
          }
        });
      }
      
      // Add current year if not present
      const currentYear = new Date().getFullYear();
      allDates.push(new Date().toISOString());
      
      // Extract unique years
      const uniqueYears = [...new Set(allDates.map(dateStr => 
        new Date(dateStr).getFullYear()
      ))].sort((a, b) => b - a);

      // All months
      const uniqueMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      // Mock departamentos and areas (since the fields don't exist yet in empleados_sftp)
      const departamentos = [
        'Recursos Humanos',
        'Tecnología',
        'Ventas',
        'Marketing',
        'Operaciones',
        'Finanzas'
      ];
      
      const areas = [
        'Desarrollo',
        'Soporte',
        'Gestión',
        'Análisis',
        'Diseño',
        'Calidad'
      ];

      setAvailableOptions({
        years: uniqueYears,
        months: uniqueMonths,
        departamentos: departamentos,
        areas: areas
      });
    } catch (error) {
      console.error('Error loading available options:', error);
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleMultiSelectChange = (filterType: keyof RetentionFilterOptions, selectedValues: string[]) => {
    const newFilters = { ...filters };
    
    if (filterType === 'years') {
      newFilters.years = selectedValues.map(v => parseInt(v));
    } else if (filterType === 'months') {
      newFilters.months = selectedValues.map(v => parseInt(v));
    } else if (filterType === 'departamentos') {
      newFilters.departamentos = selectedValues;
    } else if (filterType === 'areas') {
      newFilters.areas = selectedValues;
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters = {
      years: [],
      months: [],
      departamentos: [],
      areas: []
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  const getFilterSummary = () => {
    const parts = [];
    
    if (filters.years.length > 0) {
      parts.push(`${filters.years.length} año${filters.years.length !== 1 ? 's' : ''}`);
    }
    if (filters.months.length > 0) {
      parts.push(`${filters.months.length} mes${filters.months.length !== 1 ? 'es' : ''}`);
    }
    if (filters.departamentos.length > 0) {
      parts.push(`${filters.departamentos.length} depto${filters.departamentos.length !== 1 ? 's' : ''}`);
    }
    if (filters.areas.length > 0) {
      parts.push(`${filters.areas.length} área${filters.areas.length !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

  // Estado para controlar qué dropdown está abierto
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Componente para multi-select con checkboxes en dropdown
  const MultiSelectDropdown = ({ 
    label, 
    options, 
    selectedValues, 
    onSelectionChange,
    renderOption 
  }: {
    label: string;
    options: (string | number)[];
    selectedValues: (string | number)[];
    onSelectionChange: (values: string[]) => void;
    renderOption: (option: string | number) => string;
  }) => {
    const isOpen = openDropdown === label;
    
    const toggleDropdown = () => {
      setOpenDropdown(isOpen ? null : label);
    };
    
    const toggleOption = (option: string | number) => {
      const stringValue = option.toString();
      const newValues = selectedValues.includes(option)
        ? selectedValues.filter(v => v !== option).map(v => v.toString())
        : [...selectedValues.map(v => v.toString()), stringValue];
      onSelectionChange(newValues);
    };

    const clearSelection = () => {
      onSelectionChange([]);
    };

    // Cerrar dropdown cuando se hace clic afuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (isOpen && !target.closest(`[data-dropdown="${label}"]`)) {
          setOpenDropdown(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, label]);

    return (
      <div className="relative" data-dropdown={label}>
        <Label className="text-sm font-medium">{label}</Label>
        <div className="mt-1">
          <Button
            variant="outline"
            onClick={toggleDropdown}
            className="w-full justify-between h-9 px-3"
          >
            <span className="truncate">
              {selectedValues.length > 0 
                ? `${selectedValues.length} seleccionado${selectedValues.length !== 1 ? 's' : ''}`
                : `Seleccionar ${label.toLowerCase()}`
              }
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {selectedValues.length > 0 && (
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar selección
                  </Button>
                </div>
              )}
              <div className="p-2">
                {options.map(option => (
                  <div key={option} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`${label}-${option}`}
                      checked={selectedValues.includes(option)}
                      onCheckedChange={() => toggleOption(option)}
                    />
                    <Label 
                      htmlFor={`${label}-${option}`} 
                      className="text-sm cursor-pointer flex-1"
                    >
                      {renderOption(option)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Botón para expandir/colapsar filtros */}
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
              {getActiveFiltersCount()}
            </span>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Panel de filtros expandible */}
      {isExpanded && (
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Filtros de Retención</h3>
            {getActiveFiltersCount() > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs hover:text-red-600"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar todos
              </Button>
            )}
          </div>

          {/* Resumen de filtros activos */}
          {getActiveFiltersCount() > 0 && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded mb-4">
              <strong>Filtros activos:</strong> {getFilterSummary()}
            </div>
          )}

          {/* Layout de dropdowns - Año, Mes, Departamento y Área */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Años */}
            <MultiSelectDropdown
              label="Año"
              options={availableOptions.years}
              selectedValues={filters.years}
              onSelectionChange={(values) => handleMultiSelectChange('years', values)}
              renderOption={(option) => option.toString()}
            />

            {/* Meses */}
            <MultiSelectDropdown
              label="Mes"
              options={availableOptions.months}
              selectedValues={filters.months}
              onSelectionChange={(values) => handleMultiSelectChange('months', values)}
              renderOption={(option) => monthNames[parseInt(option.toString()) - 1]}
            />
            
            {/* Departamentos */}
            <MultiSelectDropdown
              label="Departamento"
              options={availableOptions.departamentos}
              selectedValues={filters.departamentos}
              onSelectionChange={(values) => handleMultiSelectChange('departamentos', values)}
              renderOption={(option) => option.toString()}
            />
            
            {/* Áreas */}
            <MultiSelectDropdown
              label="Área"
              options={availableOptions.areas}
              selectedValues={filters.areas}
              onSelectionChange={(values) => handleMultiSelectChange('areas', values)}
              renderOption={(option) => option.toString()}
            />
          </div>
        </div>
      )}
    </div>
  );
}