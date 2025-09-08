"use client";

import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KPIResult } from "@/lib/kpi-calculator";

interface KPIChartProps {
  data: KPIResult[];
  type?: 'line' | 'bar' | 'area' | 'pie' | 'stacked-bar' | 'trend';
  height?: number;
  showAll?: boolean;
}

export function KPIChart({ data, type = 'line', height = 300, showAll = false }: KPIChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos disponibles para mostrar
      </div>
    );
  }

  // Transform data for charts
  const chartData = data.map((kpi) => ({
    name: kpi.name,
    value: kpi.value,
    previous_value: kpi.previous_value || 0,
    target: kpi.target,
    variance: kpi.variance_percentage || 0,
    category: kpi.category
  }));

  const formatValue = (value: number, label?: string): string => {
    if (label && (label.includes('%') || label.includes('Rotación'))) {
      return `${value.toFixed(2)}%`;
    }
    if (label && label.includes('Prom') && value < 10) {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString('es-MX');
  };

  const CustomTooltip = ({ active, payload, label }: {active?: boolean, payload?: Array<{color: string, name: string, value: number}>, label?: string}) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="text-sm">
              <span style={{ color: entry.color }}>
                {entry.name}: {formatValue(entry.value, label)}
              </span>
              {entry.name === 'value' && entry.payload.target && (
                <div className="text-xs text-gray-500">
                  Meta: {formatValue(entry.payload.target, label)}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F97316', // orange
    '#06B6D4', // cyan
  ];

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="value" fill={colors[0]} name="Valor Actual" />
            <Bar dataKey="previous_value" fill={colors[1]} name="Valor Anterior" />
            <Bar dataKey="target" fill={colors[2]} name="Meta" />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} name="Valor Actual" />
            {showAll && <Area type="monotone" dataKey="previous_value" stroke={colors[1]} fill={colors[1]} fillOpacity={0.3} name="Valor Anterior" />}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      const pieData = chartData.map((item, index) => ({
        name: item.name,
        value: Math.abs(item.value), // Use absolute values for pie chart
        color: colors[index % colors.length]
      }));

      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={Math.min(height / 3, 120)}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'stacked-bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="value" stackId="a" fill={colors[0]} name="Valor Actual" />
            <Bar dataKey="previous_value" stackId="a" fill={colors[1]} name="Valor Anterior" />
            {showAll && <Bar dataKey="target" stackId="a" fill={colors[2]} name="Meta" />}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'trend':
      // Enhanced trend chart with filled area
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={colors[0]} 
              fill={colors[0]} 
              fillOpacity={0.6} 
              name="Valor Actual"
              strokeWidth={3}
            />
            <Area 
              type="monotone" 
              dataKey="previous_value" 
              stroke={colors[1]} 
              fill={colors[1]} 
              fillOpacity={0.3} 
              name="Valor Anterior"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    default: // line
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} name="Valor Actual" />
            <Line type="monotone" dataKey="previous_value" stroke={colors[1]} strokeWidth={2} name="Valor Anterior" />
            {showAll && <Line type="monotone" dataKey="target" stroke={colors[2]} strokeWidth={2} strokeDasharray="5 5" name="Meta" />}
          </LineChart>
        </ResponsiveContainer>
      );
  }
}