"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '@/lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MonthlyRetentionData {
  mes: string;
  year: number;
  month: number;
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

interface YearlyComparisonData {
  mes: string;
  [key: string]: any; // Para soportar años dinámicos
}

interface RetentionFilters {
  years: number[];
  months: number[];
  departamentos?: string[];
  areas?: string[];
}

interface RetentionChartsProps {
  currentDate?: Date;
  filters?: RetentionFilters;
}

export function RetentionCharts({ currentDate = new Date(), filters }: RetentionChartsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyRetentionData[]>([]);
  const [yearlyComparison, setYearlyComparison] = useState<YearlyComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    loadMonthlyRetentionData();
  }, [currentDate, filters]);

  const loadMonthlyRetentionData = async () => {
    try {
      setLoading(true);
      console.log('🔄 RetentionCharts: Loading monthly retention data...');
      
      // Cargar empleados SFTP una sola vez para todos los meses (optimización)
      const plantilla = await db.getEmpleadosSFTP();
      console.log('👥 Empleados SFTP loaded:', plantilla?.length, 'records');
      if (!plantilla) {
        throw new Error('No plantilla data found');
      }
      
      // Detectar el rango de años con datos reales de bajas
      const bajasConFecha = plantilla.filter(emp => emp.fecha_baja);
      const años = new Set<number>();
      
      bajasConFecha.forEach(emp => {
        const año = new Date(emp.fecha_baja).getFullYear();
        if (año >= 2022 && año <= 2025) {
          años.add(año);
        }
      });
      
      // Si no hay bajas, usar años por defecto
      const years = años.size > 0 ? Array.from(años).sort() : [2024, 2025];
      console.log('📅 Years with dismissal data:', years);
      
      // Generar datos para todos los años con bajas
      const allMonthsData: MonthlyRetentionData[] = [];
      
      for (const year of years) {
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          
          const monthData = await calculateMonthlyRetention(startDate, endDate, plantilla);
          allMonthsData.push({
            ...monthData,
            year,
            month: month + 1
          });
        }
      }
      
      // Calcular rotación acumulada de 12 meses móviles para cada punto
      for (let i = 0; i < allMonthsData.length; i++) {
        const currentMonthDate = new Date(allMonthsData[i].year, allMonthsData[i].month - 1, 1);
        const rotacionAcumulada12m = calculateRolling12MonthRotation(allMonthsData, i, plantilla, currentMonthDate);
        allMonthsData[i].rotacionAcumulada12m = rotacionAcumulada12m;
      }
      
      // Aplicar filtros si están definidos
      let filteredMonthsData = allMonthsData;
      
      if (filters && (filters.years.length > 0 || filters.months.length > 0)) {
        console.log('🎯 Applying filters to retention charts:', filters);
        
        filteredMonthsData = allMonthsData.filter(monthData => {
          const year = monthData.year;
          const month = monthData.month;
          
          // Si hay filtros de año y mes, ambos deben coincidir
          if (filters.years.length > 0 && filters.months.length > 0) {
            return filters.years.includes(year) && filters.months.includes(month);
          }
          
          // Si solo hay filtros de año
          if (filters.years.length > 0 && filters.months.length === 0) {
            return filters.years.includes(year);
          }
          
          // Si solo hay filtros de mes
          if (filters.months.length > 0 && filters.years.length === 0) {
            return filters.months.includes(month);
          }
          
          return true;
        });
      }
      
      // Preparar datos para comparación por año (últimos 2 años con datos)
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const uniqueYears = [...new Set(allMonthsData.map(d => d.year))].sort();
      const lastTwoYears = uniqueYears.slice(-2); // Tomar los últimos 2 años
      
      const comparisonData: YearlyComparisonData[] = monthNames.map((monthName, index) => {
        const dataByYear: any = {
          mes: monthName
        };
        
        // Agregar datos para cada año disponible
        lastTwoYears.forEach(year => {
          const monthData = allMonthsData.find(d => d.year === year && d.month === index + 1);
          if (monthData) {
            dataByYear[`rotacion${year}`] = monthData.rotacionAcumulada12m;
            dataByYear[`bajas${year}`] = monthData.bajas;
            dataByYear[`activos${year}`] = monthData.activos;
          }
        });
        
        return dataByYear;
      });
      
      setMonthlyData(filteredMonthsData);
      setYearlyComparison(comparisonData);
      setAvailableYears(lastTwoYears);
    } catch (error) {
      console.error('Error loading monthly retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRolling12MonthRotation = (monthsData: MonthlyRetentionData[], currentIndex: number, plantilla: any[], baseDate: Date): number => {
    try {
      const currentMonthData = monthsData[currentIndex];
      if (!currentMonthData) return 0;
      
      const currentMonthDate = new Date(currentMonthData.year, currentMonthData.month - 1, 1);
      const startDate12m = subMonths(currentMonthDate, 11);
      const endDate12m = endOfMonth(currentMonthDate);

      // Contar todas las bajas en el período de 12 meses
      const bajasEn12Meses = plantilla.filter(emp => {
        if (!emp.fecha_baja || emp.activo) return false;
        const fechaBaja = new Date(emp.fecha_baja);
        return fechaBaja >= startDate12m && fechaBaja <= endDate12m;
      }).length;

      // Calcular promedio de empleados activos en el período de 12 meses
      const activosInicioRango = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate12m && (!fechaBaja || fechaBaja > startDate12m);
      }).length;

      const activosFinRango = plantilla.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate12m && (!fechaBaja || fechaBaja > endDate12m);
      }).length;

      const promedioActivos12m = (activosInicioRango + activosFinRango) / 2;
      const rotacionAcumulada = promedioActivos12m > 0 ? (bajasEn12Meses / promedioActivos12m) * 100 : 0;
      
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

      // Empleados al inicio y fin del mes para calcular promedio correcto
      const empleadosInicioMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= startDate && (!fechaBaja || fechaBaja > startDate);
      }).length;
      
      const empleadosFinMes = plantillaFiltered.filter(emp => {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBaja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return fechaIngreso <= endDate && (!fechaBaja || fechaBaja > endDate);
      }).length;
      
      const activosProm = (empleadosInicioMes + empleadosFinMes) / 2;
      
      // Bajas totales en el mes
      const bajasEnMes = plantillaFiltered.filter(p => {
        if (!p.fecha_baja || p.activo) return false;
        const fechaBaja = new Date(p.fecha_baja);
        return fechaBaja >= startDate && fechaBaja <= endDate;
      });

      const bajas = bajasEnMes.length;
      const rotacionPorcentaje = (bajas / (activosProm || 1)) * 100;

      // Calcular bajas por temporalidad
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
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        rotacionPorcentaje: Number(rotacionPorcentaje.toFixed(2)),
        rotacionAcumulada12m: 0, // Se calculará después
        bajas,
        activos: empleadosFinMes,
        activosProm: Number(activosProm.toFixed(2)),
        bajasMenor3m,
        bajas3a6m,
        bajas6a12m,
        bajasMas12m
      };
    } catch (error) {
      console.error('Error calculating monthly retention:', error);
      return {
        mes: format(startDate, 'MMM yyyy'),
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        rotacionPorcentaje: 0,
        rotacionAcumulada12m: 0,
        bajas: 0,
        activos: 0,
        activosProm: 0,
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
                    ? `${entry.value?.toFixed(2)}%` 
                    : entry.value?.toLocaleString()
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

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  return (
    <div className="space-y-6">
      {/* Primera fila de gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Rotación Acumulada (12 meses móviles) con comparación anual */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación Acumulada (12 meses móviles)</h3>
          <p className="text-sm text-gray-600 mb-4">
            {availableYears.length > 0 
              ? `Comparación ${availableYears[0]} vs ${availableYears[availableYears.length - 1]}`
              : 'Comparación anual'}
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={yearlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Rotación %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {availableYears.map((year, index) => (
                <Line 
                  key={year}
                  type="monotone" 
                  dataKey={`rotacion${year}`} 
                  stroke={index === 0 ? "#3b82f6" : "#ef4444"} 
                  strokeWidth={2}
                  name={year.toString()}
                  dot={{ fill: index === 0 ? '#3b82f6' : '#ef4444', strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Rotación Mensual (Múltiples Líneas) */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-base font-semibold mb-2">Rotación Mensual</h3>
          <p className="text-sm text-gray-600 mb-4">Rotación mensual %, bajas y activos por mes</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData.filter(d => d.year === (availableYears[availableYears.length - 1] || 2025))}>
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
            <BarChart data={monthlyData.filter(d => d.year === (availableYears[availableYears.length - 1] || 2025))}>
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

      {/* Tabla comparativa de Rotación Acumulada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tabla Comparativa - Rotación Acumulada 12 Meses Móviles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Mes</th>
                  <th className="text-center py-2 px-4 bg-blue-50">{availableYears[0] || 2024}</th>
                  <th className="text-center py-2 px-4 bg-red-50">{availableYears[availableYears.length - 1] || 2025}</th>
                  <th className="text-center py-2 px-4">Variación</th>
                </tr>
              </thead>
              <tbody>
                {yearlyComparison.map((row, index) => {
                  const year1 = availableYears[0];
                  const year2 = availableYears[availableYears.length - 1];
                  const variation = row[`rotacion${year2}`] && row[`rotacion${year1}`] 
                    ? ((row[`rotacion${year2}`] - row[`rotacion${year1}`]) / row[`rotacion${year1}`] * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={row.mes} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 font-medium">{row.mes}</td>
                      <td className="py-2 px-4 text-center">
                        {row[`rotacion${year1}`] ? `${row[`rotacion${year1}`].toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {row[`rotacion${year2}`] ? `${row[`rotacion${year2}`].toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {variation && (
                          <Badge variant={parseFloat(variation) > 0 ? "destructive" : "default"}>
                            {variation}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabla comparativa de Rotación Mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tabla Comparativa - Rotación Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3" rowSpan={2}>Mes</th>
                  <th className="text-center py-2 px-3 bg-blue-50" colSpan={3}>{availableYears[0] || 2024}</th>
                  <th className="text-center py-2 px-3 bg-red-50" colSpan={3}>{availableYears[availableYears.length - 1] || 2025}</th>
                </tr>
                <tr className="border-b">
                  <th className="text-center py-2 px-3 bg-blue-50 text-xs">% Rotación</th>
                  <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Bajas</th>
                  <th className="text-center py-2 px-3 bg-blue-50 text-xs"># Activos</th>
                  <th className="text-center py-2 px-3 bg-red-50 text-xs">% Rotación</th>
                  <th className="text-center py-2 px-3 bg-red-50 text-xs"># Bajas</th>
                  <th className="text-center py-2 px-3 bg-red-50 text-xs"># Activos</th>
                </tr>
              </thead>
              <tbody>
                {monthNames.map((monthName, index) => {
                  const year1 = availableYears[0] || 2024;
                  const year2 = availableYears[availableYears.length - 1] || 2025;
                  const monthYear1 = monthlyData.find(d => d.year === year1 && d.month === index + 1);
                  const monthYear2 = monthlyData.find(d => d.year === year2 && d.month === index + 1);
                  
                  return (
                    <tr key={monthName} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-3 font-medium">{monthName}</td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear1?.rotacionPorcentaje ? `${monthYear1.rotacionPorcentaje.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear1?.bajas ?? '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear1?.activos ?? '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear2?.rotacionPorcentaje ? `${monthYear2.rotacionPorcentaje.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear2?.bajas ?? '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {monthYear2?.activos ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}