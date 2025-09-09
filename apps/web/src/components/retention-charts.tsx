"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '@/lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyRetentionData {
  mes: string;
  rotacionPorcentaje: number;
  rotacionAcumulada12m: number;
  bajas: number;
  activos: number;
  activosProm: number;
  
  // Temporalidad
  bajasMenor3m: number;
  bajas3a6m: number;
  bajas6a12m: number;
  bajasMas12m: number;
}

interface RetentionChartsProps {
  currentDate?: Date;
}

export function RetentionCharts({ currentDate = new Date() }: RetentionChartsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyRetentionData();
  }, [currentDate]);

  const loadMonthlyRetentionData = async () => {
    try {
      setLoading(true);
      console.log('🔄 RetentionCharts: Loading monthly retention data...');
      
      // Cargar plantilla una sola vez para todos los meses (optimización)
      const plantilla = await db.getPlantilla();
      console.log('👥 Plantilla loaded:', plantilla?.length, 'records');
      if (!plantilla) {
        throw new Error('No plantilla data found');
      }
      
      // Cargar ACT para referencia (pero no dependemos de él para los meses)
      const actMonths = await db.getACT();
      console.log('📊 ACT data loaded:', actMonths?.length, 'records');
      
      if (actMonths && actMonths.length > 0) {
        const allDates = [...new Set(actMonths.map(record => record.fecha))].sort();
        console.log('📅 All unique dates in ACT:', allDates);
      }
      
      // Obtener meses basados en fechas de ingreso y baja de PLANTILLA
      const allEmployeeDates = [];
      plantilla.forEach(emp => {
        // Fecha de ingreso
        allEmployeeDates.push(emp.fecha_ingreso);
        // Fecha de baja si existe
        if (emp.fecha_baja) {
          allEmployeeDates.push(emp.fecha_baja);
        }
      });
      
      // Obtener meses únicos desde la fecha más antigua hasta hoy
      const earliestDate = new Date(Math.min(...allEmployeeDates.map(d => new Date(d).getTime())));
      const latestDate = new Date(); // Hoy
      
      const realMonths = [];
      let currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
      
      while (currentDate <= latestDate) {
        realMonths.push(format(currentDate, 'yyyy-MM'));
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      console.log('📊 Real months with data:', realMonths);

      // Solo calcular para los meses que realmente tienen información
      const monthsData: MonthlyRetentionData[] = [];
      
      for (const yearMonth of realMonths) {
        const [year, month] = yearMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        const monthData = await calculateMonthlyRetention(startDate, endDate, plantilla);
        monthsData.push(monthData);
      }
      
      // Calcular rotación acumulada de 12 meses móviles para cada punto
      for (let i = 0; i < monthsData.length; i++) {
        const currentMonthDate = new Date(monthsData[i].mes + ' 1');
        const rotacionAcumulada12m = calculateRolling12MonthRotation(monthsData, i, plantilla, currentMonthDate);
        monthsData[i].rotacionAcumulada12m = rotacionAcumulada12m;
      }
      
      console.log('✅ Final monthsData:', monthsData.length, 'months loaded');
      console.log('📊 Sample data:', monthsData[0]);
      setMonthlyData(monthsData);
    } catch (error) {
      console.error('Error loading monthly retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calcula la ROTACIÓN ACUMULADA de 12 meses móviles
   * 
   * FÓRMULA: (Total de Bajas en 12 meses / Promedio de Empleados Activos en 12 meses) × 100
   * 
   * EXPLICACIÓN:
   * - Para cada punto en el tiempo, tomamos los 12 meses anteriores
   * - Contamos todas las bajas en ese período
   * - Calculamos el promedio de empleados activos (inicio + fin) / 2
   * - La rotación nos dice qué % de la plantilla se renovó en los últimos 12 meses
   * 
   * EJEMPLO: Si en dic-2025 calculamos rotación acumulada:
   * - Período: ene-2025 a dic-2025 (12 meses)
   * - Bajas: todas las bajas en esos 12 meses
   * - Activos promedio: (activos ene-2025 + activos dic-2025) / 2
   * - Rotación: (bajas_12m / activos_prom) × 100
   */
  const calculateRolling12MonthRotation = (monthsData: MonthlyRetentionData[], currentIndex: number, plantilla: any[], baseDate: Date): number => {
    try {
      // 1. Definir el período de 12 meses hacia atrás desde el mes actual
      const currentMonthDate = subMonths(baseDate, 11 - currentIndex);
      const startDate12m = subMonths(currentMonthDate, 11);
      const endDate12m = endOfMonth(currentMonthDate);

      console.log(`📊 Calculating 12-month rolling rotation for ${format(currentMonthDate, 'MMM yyyy')}`);
      console.log(`📅 Period: ${format(startDate12m, 'MMM yyyy')} to ${format(endDate12m, 'MMM yyyy')}`);

      // 2. Contar todas las bajas en el período de 12 meses
      const bajasEn12Meses = plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja >= startDate12m && fechaBaja <= endDate12m;
      }).length;

      // 3. Calcular promedio de empleados activos en el período de 12 meses
      // Empleados activos al INICIO del período (contratados antes del inicio, no dados de baja antes del inicio)
      const activosInicioRango = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate12m && (!fechaBaja || fechaBaja > startDate12m);
      }).length;

      // Empleados activos al FINAL del período (contratados antes del final, no dados de baja antes del final)  
      const activosFinRango = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate12m && (!fechaBaja || fechaBaja > endDate12m);
      }).length;

      // Promedio de empleados activos = (empleados_inicio + empleados_fin) / 2
      const promedioActivos12m = (activosInicioRango + activosFinRango) / 2;
      
      console.log(`👥 Active employees start: ${activosInicioRango}, end: ${activosFinRango}, average: ${promedioActivos12m.toFixed(2)}`);
      console.log(`📉 Terminations in 12 months: ${bajasEn12Meses}`);
      
      // 4. FÓRMULA FINAL: Rotación acumulada = (Bajas 12m / Promedio Activos 12m) × 100
      const rotacionAcumulada = promedioActivos12m > 0 ? (bajasEn12Meses / promedioActivos12m) * 100 : 0;
      
      console.log(`🎯 12-month rolling rotation: ${rotacionAcumulada.toFixed(2)}%`);
      
      return Number(rotacionAcumulada.toFixed(2));
    } catch (error) {
      console.error('Error calculating rolling 12-month rotation:', error);
      return 0;
    }
  };

  const calculateMonthlyRetention = async (startDate: Date, endDate: Date, plantilla: any[]): Promise<MonthlyRetentionData> => {
    try {

      // Filtrar empleados que ingresaron antes o durante el mes
      const plantillaFiltered = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        return fechaIngreso <= endDate;
      });

      // Obtener datos de actividad para el mes
      const actividad = await db.getACT(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      if (!plantillaFiltered || !actividad) {
        throw new Error('No data found');
      }

      // Calculate correct average headcount using employees at start and end of month
      
      // Employees at start of month (hired before or on start date, not terminated before start date)
      const empleadosInicioMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        
        return fechaIngreso <= startDate && 
               (!fechaBaja || fechaBaja > startDate);
      }).length;
      
      // Employees at end of month (hired before or on end date, not terminated before end date)
      const empleadosFinMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        
        return fechaIngreso <= endDate && 
               (!fechaBaja || fechaBaja > endDate);
      }).length;
      
      // Correct average headcount = (start + end) / 2
      const activosProm = (empleadosInicioMes + empleadosFinMes) / 2;
      
      // For reporting: unique employees in ACT (for comparison)
      const uniqueEmployeesInACT = [...new Set(actividad.map(a => a.emp_id))].length;
      
      // Bajas totales en el mes
      const bajas = plantillaFiltered.filter(p => {
        if (!p.fecha_baja || p.activo) return false;
        const fechaBaja = new Date(p.fecha_baja);
        return fechaBaja >= startDate && fechaBaja <= endDate;
      }).length;

      // Rotación mensual = (Bajas / Activos Prom) * 100
      const rotacionPorcentaje = (bajas / (activosProm || 1)) * 100;

      // Calcular bajas por temporalidad (fecha_baja - fecha_ingreso)
      const bajasEnMes = plantillaFiltered.filter(p => {
        if (!p.fecha_baja || p.activo) return false;
        const fechaBaja = new Date(p.fecha_baja);
        return fechaBaja >= startDate && fechaBaja <= endDate;
      });

      const bajasMenor3m = bajasEnMes.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados < 3;
      }).length;

      const bajas3a6m = bajasEnMes.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 3 && mesesTrabajados < 6;
      }).length;

      const bajas6a12m = bajasEnMes.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 6 && mesesTrabajados < 12;
      }).length;

      const bajasMas12m = bajasEnMes.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = new Date(emp.fecha_baja);
        const mesesTrabajados = (fechaBaja.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return mesesTrabajados >= 12;
      }).length;

      return {
        mes: format(startDate, 'MMM yyyy'),
        rotacionPorcentaje: Number(rotacionPorcentaje.toFixed(2)),
        rotacionAcumulada12m: 0, // Se calculará después en el loop principal
        bajas,
        activos: empleadosFinMes, // Use actual headcount at end of month, not ACT table
        activosProm: Number(activosProm.toFixed(2)),
        bajasMenor3m,
        bajas3a6m,
        bajas6a12m,
        bajasMas12m
      };
    } catch (error) {
      console.error('Error calculating monthly retention:', error);
      // Calculate basic headcount even if ACT data is missing
      const empleadosFinMesError = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        
        return fechaIngreso <= endDate && 
               (!fechaBaja || fechaBaja > endDate);
      }).length;
      
      return {
        mes: format(startDate, 'MMM yyyy'),
        rotacionPorcentaje: 0,
        rotacionAcumulada12m: 0,
        bajas: 0,
        activos: empleadosFinMesError, // Use actual headcount even in error case
        activosProm: empleadosFinMesError,
        bajasMenor3m: 0,
        bajas3a6m: 0,
        bajas6a12m: 0,
        bajasMas12m: 0
      };
    }
  };

  const CustomTooltip = ({ active, payload, label }: {active?: boolean, payload?: Array<{color: string, name: string, value: number, dataKey: string}>, label?: string}) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="text-sm">
              <span style={{ color: entry.color }}>
                {entry.name}: {
                  entry.dataKey?.includes('Porcentaje') || entry.dataKey?.includes('rotacion') 
                    ? `${entry.value.toFixed(2)}%` 
                    : entry.value.toLocaleString()
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[300px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Cargando...</span>
          </div>
        ))}
      </div>
    );
  }

  console.log('🎨 RetentionCharts rendering with data:', monthlyData.length, 'months');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Gráfico 1: Rotación Acumulada (12 meses móviles) */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-base font-semibold mb-2">Rotación Acumulada (12 meses móviles)</h3>
        <p className="text-sm text-gray-600 mb-4">Rotación acumulada de los últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mes" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Rotación %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="rotacionAcumulada12m" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Rotación Acumulada 12m %"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 2: Rotación Mensual (Múltiples Líneas) */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
        <p className="text-sm text-gray-600 mb-4">Rotación mensual %, bajas y activos por mes</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mes" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Rotación %', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="numbers"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Cantidad', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              yAxisId="percentage"
              type="monotone" 
              dataKey="rotacionPorcentaje" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Rotación %"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
            />
            <Line 
              yAxisId="numbers"
              type="monotone" 
              dataKey="bajas" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Bajas"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
            />
            <Line 
              yAxisId="numbers"
              type="monotone" 
              dataKey="activos" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Activos"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 3: Rotación por Temporalidad (Barras Apiladas por Mes) */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-base font-semibold mb-2">Rotación por Temporalidad</h3>
        <p className="text-sm text-gray-600 mb-4">Bajas por tiempo trabajado por mes</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mes" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Número de Bajas', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="bajasMenor3m" stackId="a" fill="#dc2626" name="< 3 meses" />
            <Bar dataKey="bajas3a6m" stackId="a" fill="#ea580c" name="3-6 meses" />
            <Bar dataKey="bajas6a12m" stackId="a" fill="#d97706" name="6-12 meses" />
            <Bar dataKey="bajasMas12m" stackId="a" fill="#65a30d" name="+12 meses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}