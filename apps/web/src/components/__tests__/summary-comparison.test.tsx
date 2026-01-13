import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { SummaryComparison } from '../summary-comparison';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';

describe('Summary Comparison - Tab 1: Resumen', () => {
  const mockBajas = [
    {
      numero_empleado: 1003,
      fecha_baja: '2024-01-15',
      tipo: 'Voluntaria',
      motivo: 'Renuncia voluntaria',
    },
  ];

  const mockIncidencias = [
    {
      emp: 1001,
      fecha: '2024-01-10',
      inci: 'FI',
    },
    {
      emp: 1002,
      fecha: '2024-01-12',
      inci: 'PCON',
    },
  ];

  const mockPlantillaComplete: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1001,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_ingreso: '2020-01-15',
      empresa: 'MOTO REPUESTOS MONTERREY',
      area: 'Comercial',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 1002,
      nombre: 'María García',
      activo: true,
      fecha_ingreso: '2021-03-10',
      empresa: 'MOTO TOTAL',
      area: 'Comercial',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 1003,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2019-05-20',
      fecha_baja: '2024-01-15',
      empresa: 'MOTO REPUESTOS MONTERREY',
      area: 'Producción',
    }),
  ];

  it('T1.12.1: Muestra título del componente', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('📊 Resumen Comparativo')).toBeInTheDocument();
  });

  it('T1.12.2: Renderiza tabs de agrupación', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    // Check for tab triggers
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Negocio')).toBeInTheDocument();
    expect(screen.getByText('Área')).toBeInTheDocument();
    expect(screen.getByText('Departamento')).toBeInTheDocument();
  });

  it('T1.12.3: Muestra KPI cards principales', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    // Check for main KPI cards
    expect(screen.getByText('Empleados Activos')).toBeInTheDocument();
    expect(screen.getByText('Rotación Mensual Voluntaria')).toBeInTheDocument();
    expect(screen.getByText('Incidencias')).toBeInTheDocument();
    expect(screen.getByText('Permisos')).toBeInTheDocument();
  });

  it('T1.12.4: Renderiza toggle de filtro voluntaria/involuntaria', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('Rotación Voluntaria')).toBeInTheDocument();
    expect(screen.getByText('Rotación Involuntaria')).toBeInTheDocument();
    expect(screen.getByText('Rotación Total')).toBeInTheDocument();
  });

  it('T1.12.5: Muestra gráfico de activos por antigüedad', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('Empleados Activos por Antigüedad')).toBeInTheDocument();
  });

  it('T1.12.6: Muestra gráficos de rotación (Mensual, 12m, YTD)', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('Rotación Mensual')).toBeInTheDocument();
    expect(screen.getByText('Rotación - 12 Meses Móviles')).toBeInTheDocument();
    expect(screen.getByText('Rotación - Lo que va del Año')).toBeInTheDocument();
  });

  it('T1.12.7: Muestra gráficos de incidencias y permisos', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('Incidencias - Últimos 12 meses')).toBeInTheDocument();
    expect(screen.getByText('Permisos - Últimos 12 meses')).toBeInTheDocument();
  });

  it('T1.12.8: Muestra tabla de ausentismo desglosada', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
      />
    );

    expect(screen.getByText('Ausentismo (Incidencias y Permisos)')).toBeInTheDocument();

    // Check for ausentismo categories
    expect(screen.getByText('Faltas')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.getByText('Permisos')).toBeInTheDocument();
    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
  });

  it('T1.12.9: Maneja datos vacíos sin crash', () => {
    renderWithProviders(
      <SummaryComparison
        plantilla={[]}
        bajas={[]}
        incidencias={[]}
      />
    );

    // Should still render the structure
    expect(screen.getByText('📊 Resumen Comparativo')).toBeInTheDocument();
  });

  it('T1.12.10: Acepta retentionKPIsOverride', () => {
    const override = {
      rotacionMensual: 5.5,
      rotacionMensualAnterior: 4.2,
      rotacionMensualSameMonthPrevYear: 6.1,
      rotacionAcumulada: 7.8,
      rotacionAcumuladaAnterior: 7.2,
      rotacionAnioActual: 6.5,
      rotacionAnioActualAnterior: 5.9,
    };

    renderWithProviders(
      <SummaryComparison
        plantilla={mockPlantillaComplete}
        bajas={mockBajas}
        incidencias={mockIncidencias}
        retentionKPIsOverride={override}
      />
    );

    // Should use override values instead of calculated
    expect(screen.getByText('Rotación Mensual Voluntaria')).toBeInTheDocument();
  });
});
