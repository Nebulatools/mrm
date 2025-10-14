"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
//
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
//
import { supabase } from "@/lib/supabase";
import type { RetentionFilterOptions } from "@/lib/filters/retention";
import { cn } from "@/lib/utils";

// Type moved to lib/filters/retention

interface RetentionFilterPanelProps {
  onFiltersChange: (filters: RetentionFilterOptions) => void;
  className?: string;
  refreshEnabled?: boolean;
}

export function RetentionFilterPanel({
  onFiltersChange,
  className,
  refreshEnabled = false,
}: RetentionFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sanitize = (value: string | number) => {
    const v = String(value);
    const lower = v.toLowerCase();
    const looksFilePath = v.startsWith('/') || v.includes('/var/folders/') || lower.includes('temporaryitems') || lower.includes('screencaptureui');
    const looksScreenshot = lower.includes('screenshot') || lower.endsWith('.png') || lower.includes('.png');
    return (looksFilePath || looksScreenshot) ? '—' : v;
  };
  const [filters, setFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    puestos: [],
    clasificaciones: [],
    ubicaciones: [],
    empresas: [],  // Negocio/Empresa
    areas: []      // Área
  });

  // Set default filters to current month and year
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

    const defaultFilters = {
      years: [currentYear],
      months: [currentMonth], // Default to current month
      departamentos: [],
      puestos: [],
      clasificaciones: [],
      ubicaciones: [],
      empresas: [],
      areas: []
    };

    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  }, []); // Empty dependency array means this runs once on component mount
  
  const [availableOptions, setAvailableOptions] = useState({
    years: [] as number[],
    months: [] as number[],
    departamentos: [] as string[],
    puestos: [] as string[],
    clasificaciones: [] as string[],
    ubicaciones: [] as string[],
    empresas: [] as string[],  // Negocio/Empresa
    areas: [] as string[]      // Área
  });

  // Cargar opciones disponibles desde la base de datos
  useEffect(() => {
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    try {
      // Get empleados_sftp data
      const { data: empleadosSFTP } = await supabase
        .from('empleados_sftp')
        .select('fecha_baja, departamento, puesto, clasificacion, ubicacion, empresa, area');

      // Extract all dates from fecha_baja
      const allDates = [];
      const departamentosSet = new Set<string>();
      const puestosSet = new Set<string>();
      const clasificacionesSet = new Set<string>();
      const ubicacionesSet = new Set<string>();
      const empresasSet = new Set<string>();
      const areasSet = new Set<string>();
      
      if (empleadosSFTP) {
        empleadosSFTP.forEach(emp => {
          // DEBUG: Imprimir un empleado para ver la estructura
          if (departamentosSet.size === 0) {
            console.log('🔍 EMPLEADO EJEMPLO:', emp);
            console.log('🔍 Departamento:', emp.departamento);
            console.log('🔍 Puesto:', emp.puesto);  
            console.log('🔍 Clasificación:', emp.clasificacion);
            console.log('🔍 Ubicación:', (emp as any).ubicacion);
          }
          
          // Collect dates
          if (emp.fecha_baja) {
            allDates.push(emp.fecha_baja);
          }
          
          // Collect unique departamentos
          if (emp.departamento && emp.departamento !== 'null' && emp.departamento !== '') {
            departamentosSet.add(emp.departamento);
          }
          
          // Collect unique puestos
          if (emp.puesto && emp.puesto !== 'null' && emp.puesto !== '') {
            puestosSet.add(emp.puesto);
          }
          
          // Collect unique clasificaciones
          if (emp.clasificacion && emp.clasificacion !== 'null' && emp.clasificacion !== '') {
            clasificacionesSet.add(emp.clasificacion);
          }

          // Collect unique ubicaciones
          // @ts-ignore - runtime property
          const ub = (emp as any).ubicacion as string | undefined;
          if (ub && ub !== 'null' && ub !== '') {
            ubicacionesSet.add(ub);
          }

          // Collect unique empresas (negocio)
          // @ts-ignore - runtime property
          const empresa = (emp as any).empresa as string | undefined;
          if (empresa && empresa !== 'null' && empresa !== '') {
            empresasSet.add(empresa);
          }

          // Collect unique áreas
          // @ts-ignore - runtime property
          const area = (emp as any).area as string | undefined;
          if (area && area !== 'null' && area !== '') {
            areasSet.add(area);
          }
        });
      }
      
      // Add current year if not present
      allDates.push(new Date().toISOString());
      
      // Extract unique years from dates (2022-2025 range)
      const uniqueYears = Array.from(new Set(allDates.map(dateStr => {
        const year = new Date(dateStr).getFullYear();
        return year >= 2022 && year <= 2025 ? year : null;
      }).filter(year => year !== null))) as number[];
      uniqueYears.sort((a, b) => b - a);

      // All months
      const uniqueMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      // Convert sets to sorted arrays
      const departamentos = Array.from(departamentosSet).sort();
      const puestos = Array.from(puestosSet).sort();
      const clasificaciones = Array.from(clasificacionesSet).sort();
      const ubicaciones = Array.from(ubicacionesSet).sort();
      const empresas = Array.from(empresasSet).sort();
      const areas = Array.from(areasSet).sort();
      
      // If no departamentos/puestos found, use default values
      const finalDepartamentos = departamentos.length > 0 ? departamentos : [
        'Recursos Humanos',
        'Tecnología',
        'Ventas',
        'Marketing',
        'Operaciones',
        'Finanzas'
      ];
      
      const finalPuestos = puestos.length > 0 ? puestos : [
        'Analista',
        'Desarrollador',
        'Supervisor',
        'Gerente',
        'Coordinador',
        'Especialista'
      ];
      
      const finalClasificaciones = clasificaciones.length > 0 ? clasificaciones : [
        'CONFIANZA',
        'SINDICALIZADO',
        'HONORARIOS',
        'EVENTUAL'
      ];

      const finalUbicaciones = ubicaciones.length > 0 ? ubicaciones : [
        'Planta Norte',
        'Planta Sur',
        'Oficinas CDMX',
        'Remoto'
      ];

      setAvailableOptions({
        years: uniqueYears,
        months: uniqueMonths,
        departamentos: finalDepartamentos,
        puestos: finalPuestos,
        clasificaciones: finalClasificaciones,
        ubicaciones: finalUbicaciones,
        empresas: empresas.length > 0 ? empresas : ['MOTO REPUESTOS MONTERREY', 'MOTO TOTAL', 'REPUESTOS Y MOTOCICLETAS DEL NORTE'],
        areas: areas.length > 0 ? areas : []
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
    } else if (filterType === 'puestos') {
      newFilters.puestos = selectedValues;
    } else if (filterType === 'clasificaciones') {
      newFilters.clasificaciones = selectedValues;
    } else if (filterType === 'ubicaciones') {
      newFilters.ubicaciones = selectedValues;
    } else if (filterType === 'empresas') {
      newFilters.empresas = selectedValues;
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
      puestos: [],
      clasificaciones: [],
      ubicaciones: [],
      empresas: [],
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
    if ((filters.empresas || []).length > 0) {
      parts.push(`${(filters.empresas || []).length} negocio${(filters.empresas || []).length !== 1 ? 's' : ''}`);
    }
    if ((filters.areas || []).length > 0) {
      parts.push(`${(filters.areas || []).length} área${(filters.areas || []).length !== 1 ? 's' : ''}`);
    }
    if ((filters.departamentos || []).length > 0) {
      parts.push(`${(filters.departamentos || []).length} depto${(filters.departamentos || []).length !== 1 ? 's' : ''}`);
    }
    if ((filters.puestos || []).length > 0) {
      parts.push(`${(filters.puestos || []).length} puesto${(filters.puestos || []).length !== 1 ? 's' : ''}`);
    }
    if ((filters.clasificaciones || []).length > 0) {
      parts.push(`${(filters.clasificaciones || []).length} clasificación${(filters.clasificaciones || []).length !== 1 ? 'es' : ''}`);
    }
    if ((filters.ubicaciones || []).length > 0) {
      parts.push(`${(filters.ubicaciones || []).length} ubicación${(filters.ubicaciones || []).length !== 1 ? 'es' : ''}`);
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

  const wrapperClassName = cn(
    className,
    refreshEnabled &&
      "rounded-2xl border border-brand-border/60 bg-white/95 p-4 shadow-brand/20 backdrop-blur-sm"
  );

  return (
    <div className={wrapperClassName}>
      {/* Botón para expandir/colapsar filtros */}
      <div className="mb-4">
        <Button 
          variant={refreshEnabled ? "cta" : "outline"} 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "gap-2",
            refreshEnabled && "rounded-full px-4 py-2 text-sm font-semibold shadow-brand"
          )}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <span
              className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-xs",
                refreshEnabled ? "bg-brand-surface-accent text-brand-ink font-semibold" : "bg-blue-100 text-blue-700"
              )}
            >
              {getActiveFiltersCount()}
            </span>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Panel de filtros expandible */}
      {isExpanded && (
        <div
          className={cn(
            "mb-6 rounded-lg border bg-white p-4 shadow-sm",
            refreshEnabled && "rounded-2xl border-brand-border/40 bg-brand-surface-accent/60 shadow-none"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3
              className={cn(
                "font-medium",
                refreshEnabled && "font-heading text-sm uppercase tracking-[0.16em] text-brand-ink/80"
              )}
            >
              Filtros de Retención
            </h3>
            {getActiveFiltersCount() > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className={cn(
                  "text-xs hover:text-red-600",
                  refreshEnabled && "font-medium text-brand-ink/70 hover:text-brand-ink"
                )}
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar todos
              </Button>
            )}
          </div>

          {/* Resumen de filtros activos */}
          {getActiveFiltersCount() > 0 && (
            <div
              className={cn(
                "mb-4 rounded bg-muted p-3 text-xs text-muted-foreground",
                refreshEnabled && "bg-brand-surface-accent/70 text-brand-ink/70"
              )}
            >
              <strong>Filtros activos:</strong> {getFilterSummary()}
            </div>
          )}

          {/* Layout de dropdowns - Año, Mes, Negocio, Área, Departamento, Puesto, Clasificación, Ubicación */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
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

            {/* Negocio/Empresa */}
            <MultiSelectDropdown
              label="Negocio"
              options={availableOptions.empresas}
              selectedValues={filters.empresas || []}
              onSelectionChange={(values) => handleMultiSelectChange('empresas', values)}
              renderOption={(option) => sanitize(option)}
            />

            {/* Área */}
            <MultiSelectDropdown
              label="Área"
              options={availableOptions.areas}
              selectedValues={filters.areas || []}
              onSelectionChange={(values) => handleMultiSelectChange('areas', values)}
              renderOption={(option) => sanitize(option)}
            />
            
            {/* Departamentos */}
            <MultiSelectDropdown
              label="Departamento"
              options={availableOptions.departamentos}
              selectedValues={filters.departamentos || []}
              onSelectionChange={(values) => handleMultiSelectChange('departamentos', values)}
              renderOption={(option) => sanitize(option)}
            />
            
            {/* Puestos */}
            <MultiSelectDropdown
              label="Puesto"
              options={availableOptions.puestos}
              selectedValues={filters.puestos || []}
              onSelectionChange={(values) => handleMultiSelectChange('puestos', values)}
              renderOption={(option) => sanitize(option)}
            />
            
            {/* Clasificaciones */}
            <MultiSelectDropdown
              label="Clasificación"
              options={availableOptions.clasificaciones}
              selectedValues={filters.clasificaciones || []}
              onSelectionChange={(values) => handleMultiSelectChange('clasificaciones', values)}
              renderOption={(option) => sanitize(option)}
            />

            {/* Ubicaciones */}
            <MultiSelectDropdown
              label="Ubicación"
              options={availableOptions.ubicaciones}
              selectedValues={filters.ubicaciones || []}
              onSelectionChange={(values) => handleMultiSelectChange('ubicaciones', values)}
              renderOption={(option) => sanitize(option)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
