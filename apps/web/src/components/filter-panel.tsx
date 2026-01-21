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
import { normalizeCCToUbicacion } from "@/lib/normalizers";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { endOfMonth, subMonths } from "date-fns";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<RetentionFilterOptions>({
    years: [],
    months: [],
    departamentos: [],
    puestos: [],
    clasificaciones: [],
    ubicaciones: [],
    ubicacionesIncidencias: [],
    empresas: [],  // Negocio/Empresa
    areas: []      // Área
  });
  const activeFiltersCount = useMemo(() => countActiveFilters(filters), [filters]);
  const filtersSummary = useMemo(() => getFilterSummary(filters), [filters]);
  const hasActiveFilters = activeFiltersCount > 0;

  // Set default filters to current month and year
  useEffect(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = endOfMonth(currentMonthStart);
    const isMonthClosed = now > currentMonthEnd;
    const referenceMonthStart = isMonthClosed ? currentMonthStart : subMonths(currentMonthStart, 1);

    const defaultFilters = {
      years: [referenceMonthStart.getFullYear()],
      months: [referenceMonthStart.getMonth() + 1],
      departamentos: [],
      puestos: [],
      clasificaciones: [],
      ubicaciones: [],
      ubicacionesIncidencias: [],
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
    ubicacionesIncidencias: [] as string[],
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
        .select('fecha_baja, departamento, puesto, clasificacion, ubicacion, empresa, area, cc');

      // Extract all dates from fecha_baja
      const allDates = [];
      const departamentosSet = new Set<string>();
      const puestosSet = new Set<string>();
    const clasificacionesSet = new Set<string>();
    const ubicacionesSet = new Set<string>();
    const ubicacionesIncSet = new Set<string>();
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

      // Extract unique years from dates (2022 to current year range)
      const currentYear = new Date().getFullYear();
      const uniqueYears = Array.from(new Set(allDates.map(dateStr => {
        const year = new Date(dateStr).getFullYear();
        return year >= 2022 && year <= currentYear ? year : null;
      }).filter(year => year !== null))) as number[];
      uniqueYears.sort((a, b) => b - a);

      // All months
      const uniqueMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      // Convert sets to sorted arrays
      const departamentos = Array.from(departamentosSet).sort();
      const puestos = Array.from(puestosSet).sort();
      const clasificaciones = Array.from(clasificacionesSet).sort();
      const ubicaciones = Array.from(ubicacionesSet).sort();
      // ✅ CORREGIDO: Usar empleados_sftp.cc con normalizer normalizeCCToUbicacion
      // El normalizer mapea: CAD, CORPORATIVO (MRM/DIRE), FILIALES (SM*/DF/TORREON/etc), OTROS
      empleadosSFTP?.forEach(emp => {
        const cc = (emp as any).cc as string | undefined;
        if (cc) {
          const ubicacionNormalizada = normalizeCCToUbicacion(cc);
          if (ubicacionNormalizada !== 'SIN UBICACIÓN') {
            ubicacionesIncSet.add(ubicacionNormalizada);
          }
        }
      });
      const ubicacionesIncidencias = Array.from(ubicacionesIncSet).sort();
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
        ubicacionesIncidencias,
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
    } else if (filterType === 'ubicacionesIncidencias') {
      newFilters.ubicacionesIncidencias = selectedValues;
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
      ubicacionesIncidencias: [],
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
    renderOption,
    singleSelect = false
  }: {
    label: string;
    options: (string | number)[];
    selectedValues: (string | number)[];
    onSelectionChange: (values: string[]) => void;
    renderOption: (option: string | number) => string;
    singleSelect?: boolean;
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

      // Single-select mode: solo permite un valor seleccionado a la vez
      if (singleSelect) {
        const isCurrentlySelected = selectedValues.includes(option);
        const newValues = isCurrentlySelected ? [] : [stringValue];
        onSelectionChange(newValues);
        return;
      }

      // Multi-select mode: comportamiento original
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
        <Label
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            refreshEnabled
              ? isDark
                ? "text-brand-ink/70"
                : "text-brand-ink/60"
              : isDark
                ? "text-brand-ink/60"
                : "text-muted-foreground"
          )}
        >
          {label}
        </Label>
        <div className="mt-0.5">
          <Button
            variant="outline"
            onClick={toggleDropdown}
            className={cn(
              "h-9 w-full justify-between rounded-lg px-3 text-sm transition-colors",
              refreshEnabled
                ? isDark
                  ? "border-brand-border/40 bg-brand-surface/70 text-brand-ink hover:bg-brand-surface/80"
                  : "border-brand-border/40 bg-white text-brand-ink/80 hover:bg-white/90"
                : isDark
                  ? "border-brand-border/40 bg-brand-surface/80 text-brand-ink hover:bg-brand-surface/70"
                  : "border-gray-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {previewLabel}
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {isOpen && (
            <div
              className={cn(
                "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg",
                isDark
                  ? "border-brand-border/40 bg-brand-surface/90 backdrop-blur"
                  : "border-brand-border/40 bg-white"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 border-b px-3 py-2",
                  isDark
                    ? "border-brand-border/30 bg-brand-surface/80"
                    : "border-brand-border/40 bg-slate-50"
                )}
              >
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
                    className={cn(
                      "h-8 w-8 text-muted-foreground",
                      isDark ? "text-brand-ink/70 hover:text-brand-ink" : "hover:text-red-600"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto p-2 lg:max-h-none">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {searchTerm ? `Sin resultados para ${searchTerm}` : 'Sin resultados'}
                  </p>
                ) : (
                  filteredOptions.map(option => (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center space-x-2 rounded-lg px-2 py-1",
                        isDark ? "hover:bg-brand-surface/70" : "hover:bg-slate-100"
                      )}
                    >
                      <Checkbox
                        id={`${label}-${option}`}
                        checked={selectedValues.includes(option)}
                        onCheckedChange={() => toggleOption(option)}
                      />
                      <Label 
                        htmlFor={`${label}-${option}`} 
                        className="flex-1 cursor-pointer text-sm text-foreground"
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
    "flex w-full flex-col gap-4 rounded-xl border px-4 py-4 transition-colors",
    refreshEnabled
      ? isDark
        ? "rounded-2xl border-brand-border/40 bg-brand-surface/80 px-6 py-6 shadow-brand/10 backdrop-blur"
        : "rounded-2xl border-brand-border/60 bg-white/95 px-6 py-6 shadow-brand/10 backdrop-blur"
      : isDark
        ? "border-brand-border/40 bg-brand-surface/90"
        : "border-gray-200/80 bg-white"
  );
  const summaryBadgeClass = cn(
    "inline-flex max-w-full items-center justify-center rounded-full px-3 py-1 text-xs font-medium",
    refreshEnabled
      ? isDark
        ? "border border-brand-border/40 bg-brand-surface/70 text-brand-ink/80"
        : "bg-brand-surface-accent/70 text-brand-ink/70"
      : isDark
        ? "border border-brand-border/40 bg-brand-surface/70 text-brand-ink/70"
        : "bg-gray-100 text-gray-600"
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
                "gap-2 transition-colors",
                refreshEnabled && "rounded-full px-4 py-2 text-sm font-semibold shadow-brand",
                refreshEnabled && isDark && "text-brand-foreground",
                !refreshEnabled && isDark && "border-brand-border/40 text-brand-ink hover:bg-brand-surface/80 hover:text-brand-ink"
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
                  "text-xs font-semibold transition-colors",
                  refreshEnabled
                    ? isDark
                      ? "text-brand-ink/80 hover:text-brand-ink"
                      : "text-brand-ink/70 hover:text-brand-ink"
                    : isDark
                      ? "text-brand-ink/70 hover:text-brand-ink"
                      : "text-blue-600 hover:text-red-600"
                )}
              >
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros
              </Button>
            )}
          </div>
          <div
            className={cn(
              "flex max-w-full flex-wrap items-center gap-2 text-xs",
              refreshEnabled
                ? isDark
                  ? "text-brand-ink/70"
                  : "text-brand-ink/60"
                : isDark
                  ? "text-brand-ink/60"
                  : "text-muted-foreground"
            )}
          >
            <span className={summaryBadgeClass} title={summaryText}>
              {summaryText}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div
            className={cn(
              "border-t border-dashed pt-4",
              refreshEnabled
                ? isDark
                  ? "border-brand-border/40"
                  : "border-brand-border/40"
                : isDark
                  ? "border-brand-border/40"
                  : "border-gray-200"
            )}
          >
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
                singleSelect={true}
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
                options={availableOptions.ubicacionesIncidencias}
                selectedValues={filters.ubicacionesIncidencias || []}
                onSelectionChange={(values) => handleMultiSelectChange("ubicacionesIncidencias", values)}
                renderOption={(option) => sanitizeFilterValue(option)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
