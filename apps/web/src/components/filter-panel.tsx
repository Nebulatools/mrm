"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
//
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
//
import { supabase } from "@/lib/supabase";
import type { RetentionFilterOptions } from "@/lib/filters/filters";
import { countActiveFilters, getFilterSummary, sanitizeFilterValue } from "@/lib/filters/summary";
import { cn } from "@/lib/utils";

// Type moved to lib/filters/filters (renamed from retention)

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
  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);
  const filtersSummary = useMemo(() => getFilterSummary(filters), [filters]);
  const hasActiveFilters = activeFiltersCount > 0;

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
  }, [onFiltersChange]);
  
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
      const parsedYears = selectedValues
        .map(v => parseInt(v))
        .filter(v => !Number.isNaN(v));
      newFilters.years = Array.from(new Set(parsedYears)).sort((a, b) => a - b);
    } else if (filterType === 'months') {
      const parsedMonths = selectedValues
        .map(v => parseInt(v))
        .filter(v => !Number.isNaN(v) && v >= 1 && v <= 12);
      newFilters.months = Array.from(new Set(parsedMonths)).sort((a, b) => a - b);
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
    const [searchTerm, setSearchTerm] = useState("");

    const toggleDropdown = () => {
      setOpenDropdown(isOpen ? null : label);
      if (isOpen) {
        setSearchTerm("");
      }
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
      setSearchTerm("");
    };

    // Cerrar dropdown cuando se hace clic afuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (isOpen && !target.closest(`[data-dropdown="${label}"]`)) {
          setOpenDropdown(null);
          setSearchTerm("");
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, label]);

    const filteredOptions = useMemo(() => {
      if (!searchTerm.trim()) {
        return options;
      }
      const term = searchTerm.toLowerCase();
      return options.filter(option => renderOption(option).toLowerCase().includes(term));
    }, [options, searchTerm, renderOption]);

    const selectedLabels = useMemo(() => {
      return selectedValues
        .map(value => ({ value, label: renderOption(value) }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }, [selectedValues, renderOption]);

    const previewLabel = selectedLabels.length
      ? `${selectedLabels.slice(0, 2).map(item => item.label).join(', ')}${selectedLabels.length > 2 ? ` +${selectedLabels.length - 2}` : ''}`
      : `Seleccionar ${label.toLowerCase()}`;

    return (
      <div className="relative" data-dropdown={label}>
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</Label>
        <div className="mt-0.5">
          <Button
            variant="outline"
            onClick={toggleDropdown}
            className="w-full justify-between h-9 px-3 text-sm"
          >
            <span className="truncate">
              {previewLabel}
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-lg border bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
                <Input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  className="h-8 text-sm"
                />
                {selectedValues.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {searchTerm ? `Sin resultados para ${searchTerm}` : 'Sin resultados'}
                  </p>
                ) : (
                  filteredOptions.map(option => (
                    <div key={option} className="flex items-center space-x-2 rounded px-2 py-1 hover:bg-gray-50">
                      <Checkbox
                        id={`${label}-${option}`}
                        checked={selectedValues.includes(option)}
                        onCheckedChange={() => toggleOption(option)}
                      />
                      <Label 
                        htmlFor={`${label}-${option}`} 
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {renderOption(option)}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const wrapperClassName = cn("relative z-30 w-full", className);
  const containerClassName = cn(
    "flex w-full flex-col gap-4 rounded-xl border border-gray-200/80 bg-white px-4 py-4 shadow-none",
    refreshEnabled &&
      "rounded-2xl border-brand-border/60 bg-white/95 px-6 py-6 backdrop-blur"
  );
  const summaryBadgeClass = cn(
    "inline-flex max-w-full items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600",
    refreshEnabled && "bg-brand-surface-accent/70 text-brand-ink/70"
  );

  const summaryText = hasActiveFilters && filtersSummary
    ? filtersSummary
    : "Sin filtros adicionales";

  return (
    <div className={wrapperClassName}>
      <div className={containerClassName}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={refreshEnabled ? "cta" : "outline"}
              onClick={() => setIsExpanded((prev) => !prev)}
              className={cn(
                "gap-2",
                refreshEnabled && "rounded-full px-4 py-2 text-sm font-semibold shadow-brand"
              )}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span
                  className={cn(
                    "inline-flex min-w-[1.75rem] justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    refreshEnabled
                      ? "bg-brand-surface-accent text-brand-ink"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  {activeFiltersCount}
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className={cn(
                  "text-xs font-semibold text-blue-600 hover:text-red-600",
                  refreshEnabled && "text-brand-ink/70 hover:text-brand-ink"
                )}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={summaryBadgeClass} title={summaryText}>
              {summaryText}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-dashed pt-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,_1fr))] gap-3">
              <MultiSelectDropdown
                label="Año"
                options={availableOptions.years}
                selectedValues={filters.years}
                onSelectionChange={(values) => handleMultiSelectChange("years", values)}
                renderOption={(option) => option.toString()}
              />

              <MultiSelectDropdown
                label="Mes"
                options={availableOptions.months}
                selectedValues={filters.months}
                onSelectionChange={(values) => handleMultiSelectChange("months", values)}
                renderOption={(option) => monthNames[parseInt(option.toString()) - 1]}
              />

              <MultiSelectDropdown
                label="Negocio"
                options={availableOptions.empresas}
                selectedValues={filters.empresas || []}
                onSelectionChange={(values) => handleMultiSelectChange("empresas", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />

              <MultiSelectDropdown
                label="Área"
                options={availableOptions.areas}
                selectedValues={filters.areas || []}
                onSelectionChange={(values) => handleMultiSelectChange("areas", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />

              <MultiSelectDropdown
                label="Departamento"
                options={availableOptions.departamentos}
                selectedValues={filters.departamentos || []}
                onSelectionChange={(values) => handleMultiSelectChange("departamentos", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />

              <MultiSelectDropdown
                label="Puesto"
                options={availableOptions.puestos}
                selectedValues={filters.puestos || []}
                onSelectionChange={(values) => handleMultiSelectChange("puestos", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />

              <MultiSelectDropdown
                label="Clasificación"
                options={availableOptions.clasificaciones}
                selectedValues={filters.clasificaciones || []}
                onSelectionChange={(values) => handleMultiSelectChange("clasificaciones", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />

              <MultiSelectDropdown
                label="Ubicación"
                options={availableOptions.ubicaciones}
                selectedValues={filters.ubicaciones || []}
                onSelectionChange={(values) => handleMultiSelectChange("ubicaciones", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
