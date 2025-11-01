import { db, supabase, type PlantillaRecord, type AsistenciaDiariaRecord, type EmpleadoSFTPRecord } from './supabase';
import { normalizeMotivo, prettyMotivo, normalizeArea } from './normalizers';
import { sftpClient } from './sftp-client';
import { startOfMonth, endOfMonth, format, differenceInDays, isWithinInterval, subMonths, subYears } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface KPIResult {
  name: string;
  category: string;
  value: number;
  target?: number;
  previous_value?: number;
  variance_percentage?: number;
  period_start: string;
  period_end: string;
}

export interface TimeFilter {
  period: 'daily' | 'weekly' | 'monthly' | 'annual' | 'last12months' | 'alltime';
  date: Date;
}

export class KPICalculator {
  private cache = new Map<string, { data: KPIResult[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  async calculateAllKPIs(filter: TimeFilter = { period: 'alltime', date: new Date() }, client?: any): Promise<KPIResult[]> {
    console.log('🎯 calculateAllKPIs called for filter:', filter);
    
    const cacheKey = `${filter.period}-${format(filter.date, 'yyyy-MM-dd')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📋 Returning cached KPIs');
      return cached.data;
    }

    try {
      // Try Supabase first, then SFTP, then fallback
      let kpis: KPIResult[] = [];
      
      try {
        console.log('🗄️ Using Supabase database with SFTP tables...');
        kpis = await this.calculateFromDatabase(filter, client);
        console.log('✅ SFTP data loaded successfully:', kpis.length, 'KPIs');
      } catch (error) {
        console.error('❌ Database error:', error);
        console.log('⚠️ Using fallback data...');
        kpis = await this.calculateFromFallback(filter);
      }

      // Cache the results
      this.cache.set(cacheKey, {
        data: kpis,
        timestamp: Date.now()
      });

      return kpis;
    } catch (error) {
      console.error('Error in calculateAllKPIs:', error);
      return await this.calculateFromFallback(filter);
    }
  }

  private async calculateFromFallback(filter: TimeFilter): Promise<KPIResult[]> {
    console.log('⚠️ Using fallback calculation - returning empty KPIs');
    
    const { period, date } = filter;
    let startDate: Date, endDate: Date;

    // Define date ranges based on filter period
    switch (period) {
      case 'daily':
        startDate = new Date(date);
        endDate = new Date(date);
        break;
      case 'weekly':
        const dayOfWeek = date.getDay();
        startDate = new Date(date.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        break;
      case 'annual':
        startDate = new Date(date.getFullYear(), 0, 1);
        endDate = new Date(date.getFullYear(), 11, 31);
        break;
      case 'last12months':
        endDate = new Date(date);
        startDate = subMonths(endDate, 12);
        break;
      case 'alltime':
        // Show ALL data - no date filtering
        startDate = new Date(2020, 0, 1); // Far past date
        endDate = new Date(2030, 11, 31); // Far future date
        break;
      case 'monthly':
      default:
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
    }

    const periodStart = format(startDate, 'yyyy-MM-dd');
    const periodEnd = format(endDate, 'yyyy-MM-dd');

    // Return empty KPIs structure when no data is available
    return [
      {
        name: 'Activos',
        category: 'headcount',
        value: 0,
        target: undefined,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Días',
        category: 'headcount',
        value: differenceInDays(endDate, startDate) + 1,
        target: undefined,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Activos Prom',
        category: 'headcount',
        value: 0,
        target: undefined,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas',
        category: 'retention',
        value: 0,
        target: 2,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Rotación Mensual',
        category: 'retention',
        value: 0,
        target: 8.0,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Incidencias',
        category: 'incidents',
        value: 0,
        target: 12,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Inc prom x empleado',
        category: 'incidents',
        value: 0,
        target: 0.4,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Días Laborados',
        category: 'productivity',
        value: 0,
        target: undefined,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: '%incidencias',
        category: 'incidents',
        value: 0,
        target: 5.0,
        previous_value: 0,
        variance_percentage: 0,
        period_start: periodStart,
        period_end: periodEnd
      }
    ];
  }

  private calculateKPIsFromData(
    plantilla: PlantillaRecord[],
    incidencias: AsistenciaDiariaRecord[],
    asistencia: AsistenciaDiariaRecord[],
    prevPlantilla: PlantillaRecord[],
    prevIncidencias: AsistenciaDiariaRecord[],
    prevAsistencia: AsistenciaDiariaRecord[],
    startDate: Date,
    endDate: Date
  ): KPIResult[] {
    const periodStart = format(startDate, 'yyyy-MM-dd');
    const periodEnd = format(endDate, 'yyyy-MM-dd');

    // Filter data for the current period
    const asistenciaFiltered = asistencia.filter(a => 
      isWithinInterval(a.fecha, { start: startDate, end: endDate })
    );
    const incidenciasFiltered = incidencias.filter(i => 
      isWithinInterval(i.fecha, { start: startDate, end: endDate })
    );

    // Previous period calculations
    const prevAsistenciaFiltered = prevAsistencia.filter(a => 
      isWithinInterval(a.fecha, { start: subMonths(startDate, 1), end: subMonths(endDate, 1) })
    );
    const prevIncidenciasFiltered = prevIncidencias.filter(i => 
      isWithinInterval(i.fecha, { start: subMonths(startDate, 1), end: subMonths(endDate, 1) })
    );

    // 1. Activos - Contar empleados con activo = TRUE
    const activosActuales = plantilla.filter(emp => emp.activo === true).length;
    const prevActivosActuales = prevPlantilla.filter(emp => emp.activo === true).length;

    // 2. Días - Count distinct dates in asistencia_diaria
    const uniqueDays = Array.from(new Set(asistenciaFiltered.map(a => format(new Date(a.fecha), 'yyyy-MM-dd')))).length;
    const prevUniqueDays = Array.from(new Set(prevAsistenciaFiltered.map(a => format(new Date(a.fecha), 'yyyy-MM-dd')))).length;

    // 3. Activos Prom - Promedio de activos al inicio y fin del periodo
    // Empleados activos al inicio del periodo
    const empleadosInicioPeriodo = plantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      // ✅ Activo al inicio = ingresó antes del inicio Y (no tiene fecha_baja O fecha_baja es después del inicio)
      // NO usar emp.activo - solo usar fechas para determinar si estaba activo en ese momento
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      if (fechaBaja) {
        return fechaIngreso <= startDate && fechaBaja > startDate;
      }
      // Si no tiene fecha_baja, estaba activo (no importa el valor del campo activo)
      return fechaIngreso <= startDate;
    }).length;

    // Empleados activos al final del periodo
    const empleadosFinPeriodo = plantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      // ✅ Activo al final = ingresó antes del fin Y (no tiene fecha_baja O fecha_baja es después del fin)
      // NO usar emp.activo - solo usar fechas para determinar si estaba activo en ese momento
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      if (fechaBaja) {
        return fechaIngreso <= endDate && fechaBaja > endDate;
      }
      // Si no tiene fecha_baja, estaba activo (no importa el valor del campo activo)
      return fechaIngreso <= endDate;
    }).length;
    
    const activosProm = (empleadosInicioPeriodo + empleadosFinPeriodo) / 2;
    
    // Previous period calculations
    const prevEmployeesStart = prevPlantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      const prevStartDate = subMonths(startDate, 1);
      
      return fechaIngreso <= prevStartDate && 
             (!fechaBaja || fechaBaja > prevStartDate);
    }).length;
    
    const prevEmployeesEnd = prevPlantilla.filter(emp => {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
      const prevEndDate = subMonths(endDate, 1);
      
      return fechaIngreso <= prevEndDate && 
             (!fechaBaja || fechaBaja > prevEndDate);
    }).length;
    
    const prevActivosProm = (prevEmployeesStart + prevEmployeesEnd) / 2;

    // 4. Bajas - TOTAL de empleados con fecha_baja (TODAS las bajas históricas)
    const bajas = plantilla.filter(p => p.fecha_baja !== null && p.fecha_baja !== undefined).length;
    const prevBajas = prevPlantilla.filter(p => p.fecha_baja !== null && p.fecha_baja !== undefined).length;
    
    // 4.1. Bajas del período = Only departures within the specific period
    const bajasPeriodo = plantilla.filter(p => {
      if (!p.fecha_baja || p.activo) return false;
      const fechaBaja = new Date(p.fecha_baja);
      return isWithinInterval(fechaBaja, { start: startDate, end: endDate });
    }).length;
    
    const prevBajasPeriodo = plantilla.filter(p => {
      if (!p.fecha_baja || p.activo) return false;
      const fechaBaja = new Date(p.fecha_baja);
      return isWithinInterval(fechaBaja, { start: subMonths(startDate, 1), end: subMonths(endDate, 1) });
    }).length;

    // 5. Bajas Tempranas - Empleados con menos de 3 meses que se dieron de baja
    const bajasTempranas = plantilla.filter(emp => {
      if (!emp.fecha_baja || emp.activo) return false;
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = new Date(emp.fecha_baja);
      const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return mesesTrabajados < 3;
    }).length;

    const prevBajasTempranas = prevPlantilla.filter(emp => {
      if (!emp.fecha_baja || emp.activo) return false;
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBaja = new Date(emp.fecha_baja);
      const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return mesesTrabajados < 3;
    }).length;

    // 5.1. Rotación por Temporalidad - TODAS las bajas por tiempo trabajado (sin filtro)
    const bajasPorTemporalidad = {
      menor3meses: plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados < 3;
      }).length,
      entre3y6meses: plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 3 && mesesTrabajados < 6;
      }).length,
      entre6y12meses: plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 6 && mesesTrabajados < 12;
      }).length,
      mas12meses: plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 12;
      }).length
    };

    // Igual que actual (sin filtro)
    const prevBajasPorTemporalidad = bajasPorTemporalidad;

    // 6. Rotación Mensual - % de rotación = Bajas del período/Activos Prom
    const rotacionMensual = (bajasPeriodo / (activosProm || 1)) * 100;
    const prevRotacionMensual = (prevBajasPeriodo / (prevActivosProm || 1)) * 100;

    const previousYearEndDate = endOfMonth(subYears(endDate, 1));
    const rotacionAcumuladaActual = this.calculateRotacionAcumulada(plantilla, endDate);
    const rotacionAcumuladaPrevYear = this.calculateRotacionAcumulada(plantilla, previousYearEndDate);
    const rotacionAnioActualActual = this.calculateRotacionAnioActual(plantilla, endDate);
    const rotacionAnioActualPrevYear = this.calculateRotacionAnioActual(plantilla, previousYearEndDate);

    // 6. Incidencias - Count(INCIDENCIAS[EMP]) - Count of incidents
    const incidenciasCount = incidenciasFiltered.length;
    const prevIncidenciasCount = prevIncidenciasFiltered.length;

    // 7. Inc prom x empleado - Incidencias/Activos Prom
    const incPromXEmpleado = incidenciasCount / (activosProm || 1);
    const prevIncPromXEmpleado = prevIncidenciasCount / (prevActivosProm || 1);

    // 8. Días Laborados - ((Activos)/7)*6 
    const diasLaborados = Math.round((activosActuales / 7) * 6);
    const prevDiasLaborados = Math.round((prevActivosActuales / 7) * 6);

    // 9. %incidencias - Incidencias/días Laborados
    const porcentajeIncidencias = (incidenciasCount / (diasLaborados || 1)) * 100;
    const prevPorcentajeIncidencias = (prevIncidenciasCount / (prevDiasLaborados || 1)) * 100;

    // Helper function to calculate variance
    const calculateVariance = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return [
      {
        name: 'Activos',
        category: 'headcount',
        value: activosActuales,
        target: undefined,
        previous_value: prevActivosActuales,
        variance_percentage: calculateVariance(activosActuales, prevActivosActuales),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Días',
        category: 'headcount',
        value: uniqueDays,
        target: undefined,
        previous_value: prevUniqueDays,
        variance_percentage: calculateVariance(uniqueDays, prevUniqueDays),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Activos Prom',
        category: 'headcount',
        value: Math.round(activosProm),
        target: undefined,
        previous_value: Math.round(prevActivosProm),
        variance_percentage: calculateVariance(activosProm, prevActivosProm),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas',
        category: 'retention',
        value: bajas,
        target: undefined,
        previous_value: prevBajas,
        variance_percentage: calculateVariance(bajas, prevBajas),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas Tempranas',
        category: 'retention',
        value: bajasTempranas,
        target: undefined,
        previous_value: prevBajasTempranas,
        variance_percentage: calculateVariance(bajasTempranas, prevBajasTempranas),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas < 3 meses',
        category: 'retention',
        value: bajasPorTemporalidad.menor3meses,
        target: undefined,
        previous_value: prevBajasPorTemporalidad.menor3meses,
        variance_percentage: calculateVariance(bajasPorTemporalidad.menor3meses, prevBajasPorTemporalidad.menor3meses),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas 3-6 meses',
        category: 'retention',
        value: bajasPorTemporalidad.entre3y6meses,
        target: undefined,
        previous_value: prevBajasPorTemporalidad.entre3y6meses,
        variance_percentage: calculateVariance(bajasPorTemporalidad.entre3y6meses, prevBajasPorTemporalidad.entre3y6meses),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas 6-12 meses',
        category: 'retention',
        value: bajasPorTemporalidad.entre6y12meses,
        target: undefined,
        previous_value: prevBajasPorTemporalidad.entre6y12meses,
        variance_percentage: calculateVariance(bajasPorTemporalidad.entre6y12meses, prevBajasPorTemporalidad.entre6y12meses),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Bajas +12 meses',
        category: 'retention',
        value: bajasPorTemporalidad.mas12meses,
        target: undefined,
        previous_value: prevBajasPorTemporalidad.mas12meses,
        variance_percentage: calculateVariance(bajasPorTemporalidad.mas12meses, prevBajasPorTemporalidad.mas12meses),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Rotación Mensual',
        category: 'retention',
        value: Number(rotacionMensual.toFixed(2)),
        target: undefined,
        previous_value: Number(prevRotacionMensual.toFixed(2)),
        variance_percentage: calculateVariance(rotacionMensual, prevRotacionMensual),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Rotación Acumulada',
        category: 'retention',
        value: rotacionAcumuladaActual,
        target: undefined,
        previous_value: rotacionAcumuladaPrevYear,
        variance_percentage: calculateVariance(rotacionAcumuladaActual, rotacionAcumuladaPrevYear),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Rotación Año Actual',
        category: 'retention',
        value: rotacionAnioActualActual,
        target: undefined,
        previous_value: rotacionAnioActualPrevYear,
        variance_percentage: calculateVariance(rotacionAnioActualActual, rotacionAnioActualPrevYear),
        period_start: format(new Date(endDate.getFullYear(), 0, 1), 'yyyy-MM-dd'),
        period_end: periodEnd
      },
      {
        name: 'Incidencias',
        category: 'incidents',
        value: incidenciasCount,
        target: undefined,
        previous_value: prevIncidenciasCount,
        variance_percentage: calculateVariance(incidenciasCount, prevIncidenciasCount),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Inc prom x empleado',
        category: 'incidents',
        value: Number(incPromXEmpleado.toFixed(2)),
        target: 0.4,
        previous_value: Number(prevIncPromXEmpleado.toFixed(2)),
        variance_percentage: calculateVariance(incPromXEmpleado, prevIncPromXEmpleado),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: 'Días Laborados',
        category: 'productivity',
        value: diasLaborados,
        target: undefined,
        previous_value: prevDiasLaborados,
        variance_percentage: calculateVariance(diasLaborados, prevDiasLaborados),
        period_start: periodStart,
        period_end: periodEnd
      },
      {
        name: '%incidencias',
        category: 'incidents',
        value: Number(porcentajeIncidencias.toFixed(2)),
        target: 5.0,
        previous_value: Number(prevPorcentajeIncidencias.toFixed(2)),
        variance_percentage: calculateVariance(porcentajeIncidencias, prevPorcentajeIncidencias),
        period_start: periodStart,
        period_end: periodEnd
      }
    ];
  }


  private async calculateFromDatabase(filter: TimeFilter, client?: any): Promise<KPIResult[]> {
    console.log('🗄️ Calculating KPIs from Supabase database');
    const effectiveClient = client || supabase; // Use provided client or default

    const { period, date } = filter;
    let startDate: Date, endDate: Date, previousStartDate: Date, previousEndDate: Date;

    // Define date ranges based on filter period
    switch (period) {
      case 'daily':
        startDate = new Date(date);
        endDate = new Date(date);
        previousStartDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        previousEndDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        const dayOfWeek = date.getDay();
        startDate = new Date(date.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'annual':
        startDate = new Date(date.getFullYear(), 0, 1);
        endDate = new Date(date.getFullYear(), 11, 31);
        previousStartDate = new Date(date.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(date.getFullYear() - 1, 11, 31);
        break;
      case 'last12months':
        endDate = new Date(date);
        startDate = subMonths(endDate, 12);
        previousEndDate = subMonths(date, 12);
        previousStartDate = subMonths(previousEndDate, 12);
        break;
      case 'alltime':
        // Show ALL data - no date filtering
        startDate = new Date(2020, 0, 1); // Far past date
        endDate = new Date(2030, 11, 31); // Far future date  
        previousStartDate = new Date(2020, 0, 1);
        previousEndDate = new Date(2025, 0, 1); // Previous "year" for comparison
        break;
      case 'monthly':
      default:
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        const prevMonth = subMonths(date, 1);
        previousStartDate = startOfMonth(prevMonth);
        previousEndDate = endOfMonth(prevMonth);
        break;
    }

    try {
      // Fetch data from Supabase - SOLO empleados_sftp tiene TODO lo que necesitamos
      const [empleados, asistencia] = await Promise.all([
        db.getEmpleadosSFTP(effectiveClient),
        db.getAsistenciaDiaria(format(previousStartDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), effectiveClient)
      ]);

      // Normalizar plantilla garantizando campos obligatorios
      const plantillaWithDates: PlantillaRecord[] = (empleados as PlantillaRecord[]).map((emp) => {
        const numeroEmpleado = emp.numero_empleado ?? Number(emp.emp_id ?? 0);
        const empId = emp.emp_id ? String(emp.emp_id) : numeroEmpleado ? String(numeroEmpleado) : '';
        const activo =
          typeof emp.activo === 'boolean'
            ? emp.activo
            : String(emp.activo).toLowerCase() === 'true' || Number(emp.activo) === 1;

        const nombreAlternativo = typeof (emp as any).nombre_completo === 'string'
          ? (emp as any).nombre_completo
          : '';

        return {
          ...emp,
          emp_id: empId,
          numero_empleado: numeroEmpleado,
          nombre: emp.nombre && emp.nombre.trim().length > 0
            ? emp.nombre
            : nombreAlternativo || 'Sin Nombre',
          fecha_ingreso: emp.fecha_ingreso || emp.fecha_antiguedad || new Date().toISOString(),
          fecha_baja: emp.fecha_baja || null,
          motivo_baja: emp.motivo_baja || null,
          puesto: emp.puesto || 'Sin puesto',
          departamento: emp.departamento || 'Sin departamento',
          area: normalizeArea(emp.area) || 'Sin Área',
          clasificacion: emp.clasificacion || 'No especificado',
          activo,
          created_at: emp.created_at || new Date().toISOString(),
          updated_at: emp.updated_at || new Date().toISOString()
        };
      });

      // Filter asistencia for current period
      const currentAsistencia = asistencia.filter(a =>
        isWithinInterval(new Date(a.fecha), { start: startDate, end: endDate })
      );
      
      // Get incidencias (records with horas_incidencia > 0)
      const currentIncidencias = currentAsistencia.filter(a => (a.horas_incidencia || 0) > 0);

      // Filter asistencia for previous period
      const previousAsistencia = asistencia.filter(a =>
        isWithinInterval(new Date(a.fecha), { start: previousStartDate, end: previousEndDate })
      );
      
      // Get previous incidencias
      const previousIncidencias = previousAsistencia.filter(a => (a.horas_incidencia || 0) > 0);

      console.log(`📊 Database data loaded: ${plantillaWithDates.length} employees, ${currentIncidencias.length} current incidents, ${currentAsistencia.length} current attendance records`);

      // Use the same calculation logic with asistencia data
      return this.calculateKPIsFromData(
        plantillaWithDates,
        currentIncidencias,
        currentAsistencia,
        plantillaWithDates, // Same plantilla for previous period
        previousIncidencias,
        previousAsistencia,
        startDate,
        endDate
      );

    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      throw error;
    }
  }

  // Clear cache when user manually refreshes
  public clearCache(): void {
    console.log('🧹 Cache cleared');
    this.cache.clear(); // Clear internal cache too
    sftpClient.clearCache();
  }
  
  // Force refresh - clear cache and load fresh data
  public forceRefresh(): void {
    console.log('🔄 FORCE REFRESH - Clearing all caches');
    this.cache.clear();
    sftpClient.clearCache();
  }

  private calculateRotacionAcumulada(plantilla: PlantillaRecord[], endDate: Date): number {
    try {
      // Calculate 12-month rolling turnover
      const startDate12m = new Date(endDate);
      startDate12m.setMonth(startDate12m.getMonth() - 11);
      startDate12m.setDate(1);

      // Count terminations in the 12-month period
      const bajasEn12Meses = plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja >= startDate12m && fechaBaja <= endDate;
      }).length;

      // Calculate average headcount for the period
      const activosInicio = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate12m && (!fechaBaja || fechaBaja > startDate12m);
      }).length;

      const activosFin = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate && (!fechaBaja || fechaBaja > endDate);
      }).length;

      const promedioActivos12m = (activosInicio + activosFin) / 2;

      // Calculate accumulated rotation percentage
      const rotacionAcumulada = promedioActivos12m > 0 ? (bajasEn12Meses / promedioActivos12m) * 100 : 0;

      return Number(rotacionAcumulada.toFixed(2));
    } catch (error) {
      console.error('Error calculating rotación acumulada:', error);
      return 0;
    }
  }

  private calculateRotacionAnioActual(plantilla: PlantillaRecord[], referenceDate: Date): number {
    try {
      const endDate = endOfMonth(referenceDate);
      const startOfYear = new Date(endDate.getFullYear(), 0, 1);

      const bajasYTD = plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja >= startOfYear && fechaBaja <= endDate;
      }).length;

      const activosInicio = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startOfYear && (!fechaBaja || fechaBaja > startOfYear);
      }).length;

      const activosFin = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate && (!fechaBaja || fechaBaja > endDate);
      }).length;

      const promedioActivos = (activosInicio + activosFin) / 2;
      const rotacionYTD = promedioActivos > 0 ? (bajasYTD / promedioActivos) * 100 : 0;

      return Number(rotacionYTD.toFixed(2));
    } catch (error) {
      console.error('Error calculating rotación año actual:', error);
      return 0;
    }
  }

  // Nueva función para obtener bajas por motivo y mes
  async getBajasPorMotivoYMes(year: number, client?: any): Promise<any[]> {
    try {
      console.log(`🚦 Getting bajas por motivo for year: ${year}`);
      const effectiveClient = client || supabase; // Use provided client or default

      // Obtener datos de motivos_baja desde Supabase
      const { data: motivosBaja, error } = await effectiveClient
        .from('motivos_baja')
        .select('*')
        .gte('fecha_baja', `${year}-01-01`)
        .lte('fecha_baja', `${year}-12-31`);

      if (error) {
        console.error('Error fetching motivos_baja:', error);
        return [];
      }

      if (!motivosBaja || motivosBaja.length === 0) {
        console.log('No motivos_baja data found for year:', year);
        return [];
      }

      // Agrupar por motivo y mes
      const heatmapData: { [motivo: string]: { [mes: string]: number } } = {};

      const isGeneric = (s?: string | null) => {
        if (!s) return true;
        const v = String(s).trim().toLowerCase();
        return v === '' || v === 'baja' || v === 'sin motivo' || v === 'otra' || v === 'otro' || v === 'n/a' || v === 'na';
      };

      motivosBaja.forEach((baja: any) => {
        const fechaBaja = new Date(baja.fecha_baja);
        const raw = isGeneric(baja.descripcion) ? baja.motivo : baja.descripcion || baja.motivo || 'Otra razón';
        const motivo = prettyMotivo(raw);
        const mes = fechaBaja.getMonth(); // 0-11

        // Inicializar motivo si no existe
        if (!heatmapData[motivo]) {
          heatmapData[motivo] = {
            enero: 0, febrero: 0, marzo: 0, abril: 0,
            mayo: 0, junio: 0, julio: 0, agosto: 0,
            septiembre: 0, octubre: 0, noviembre: 0, diciembre: 0
          };
        }

        // Mapear número de mes a nombre
        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        heatmapData[motivo][meses[mes]]++;
      });

      // Convertir a array para el componente
      const result = Object.entries(heatmapData).map(([motivo, meses]) => ({
        motivo,
        ...meses
      }));

      console.log(`📊 Found ${result.length} motivos with data for ${year}`);
      return result;

    } catch (error) {
      console.error('Error in getBajasPorMotivoYMes:', error);
      return [];
    }
  }

  // Función para calcular bajas por motivo y mes desde plantilla pre-filtrada
  getBajasPorMotivoYMesFromPlantilla(plantilla: PlantillaRecord[], year: number): any[] {
    try {
      console.log(`🚦 Calculating bajas por motivo from filtered plantilla for year: ${year}`);

      // Filtrar bajas del año especificado
      const bajasDelAño = plantilla.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja.getFullYear() === year;
      });

      if (bajasDelAño.length === 0) {
        console.log('No bajas found in filtered plantilla for year:', year);
        return [];
      }

      // Agrupar por motivo y mes
      const heatmapData: { [motivo: string]: { [mes: string]: number } } = {};

      bajasDelAño.forEach(emp => {
        const fechaBaja = new Date(emp.fecha_baja!);
        const raw = emp.motivo_baja || 'Otra razón';
        const motivo = prettyMotivo(raw);
        const mes = fechaBaja.getMonth(); // 0-11

        // Inicializar motivo si no existe
        if (!heatmapData[motivo]) {
          heatmapData[motivo] = {
            enero: 0, febrero: 0, marzo: 0, abril: 0,
            mayo: 0, junio: 0, julio: 0, agosto: 0,
            septiembre: 0, octubre: 0, noviembre: 0, diciembre: 0
          };
        }

        // Mapear número de mes a nombre
        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        heatmapData[motivo][meses[mes]]++;
      });

      // Convertir a array para el componente
      const result = Object.entries(heatmapData).map(([motivo, meses]) => ({
        motivo,
        ...meses
      }));

      console.log(`📊 Found ${result.length} motivos with data from filtered plantilla for ${year}`);
      return result;

    } catch (error) {
      console.error('Error in getBajasPorMotivoYMesFromPlantilla:', error);
      return [];
    }
  }
}

export const kpiCalculator = new KPICalculator();

// Test function to verify changes are taking effect
export const testFallbackData = () => {
  console.log('TEST: KPI Calculator changes are working!');
  return true;
};
