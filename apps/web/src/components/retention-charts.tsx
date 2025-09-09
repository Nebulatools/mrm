"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '@/lib/supabase';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyRetentionData {
  mes: string;
  rotacionPorcentaje: number;
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
      
      // Obtener datos de los últimos 12 meses
      const monthsData: MonthlyRetentionData[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(currentDate, i);
        const startDate = startOfMonth(monthDate);
        const endDate = endOfMonth(monthDate);
        
        const monthData = await calculateMonthlyRetention(startDate, endDate);
        monthsData.push(monthData);
      }
      
      setMonthlyData(monthsData);
    } catch (error) {
      console.error('Error loading monthly retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRetention = async (startDate: Date, endDate: Date): Promise<MonthlyRetentionData> => {
    try {
      // Obtener datos de plantilla para el mes
      const { data: plantilla } = await db
        .from('plantilla')
        .select('*')
        .lte('fecha_ingreso', format(endDate, 'yyyy-MM-dd'));

      // Obtener datos de actividad para el mes
      const { data: actividad } = await db
        .from('act')
        .select('*')
        .gte('fecha', format(startDate, 'yyyy-MM-dd'))
        .lte('fecha', format(endDate, 'yyyy-MM-dd'));

      if (!plantilla || !actividad) {
        throw new Error('No data found');
      }

      // Calcular activos únicos en el mes
      const uniqueEmployeesInACT = [...new Set(actividad.map(a => a.emp_id))].length;
      
      // Calcular días únicos en el mes
      const uniqueDays = [...new Set(actividad.map(a => format(new Date(a.fecha), 'yyyy-MM-dd')))].length;
      
      // Activos promedio = Activos/Días
      const activosProm = uniqueEmployeesInACT / (uniqueDays || 1);
      
      // Bajas totales en el mes
      const bajas = plantilla.filter(p => {
        if (!p.fecha_baja || p.activo) return false;
        const fechaBaja = new Date(p.fecha_baja);
        return fechaBaja >= startDate && fechaBaja <= endDate;
      }).length;

      // Rotación mensual = (Bajas / Activos Prom) * 100
      const rotacionPorcentaje = (bajas / (activosProm || 1)) * 100;

      // Calcular bajas por temporalidad (fecha_baja - fecha_ingreso)
      const bajasEnMes = plantilla.filter(p => {
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
        bajas,
        activos: uniqueEmployeesInACT,
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
        rotacionPorcentaje: 0,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Gráfico 1: Rotación Mensual por Mes (Líneas) */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-base font-semibold mb-2">Rotación Mensual por Mes</h3>
        <p className="text-sm text-gray-600 mb-4">Evolución de rotación % por mes</p>
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
              dataKey="rotacionPorcentaje" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Rotación %"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico 2: Rotación 12 Meses Móviles (Múltiples Líneas) */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-base font-semibold mb-2">Rotación 12 Meses Móviles</h3>
        <p className="text-sm text-gray-600 mb-4">Rotación %, bajas y activos</p>
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