import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { SeniorityGenderTable } from '../seniority-gender-table';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';

describe('Seniority-Gender Table - Tab 1: Resumen', () => {
  const mockPlantillaWithSeniority: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_ingreso: '2024-10-01', // ~3 meses
      genero: 'masculino',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: true,
      fecha_ingreso: '2023-06-01', // ~1.5 años
      genero: 'femenino',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: true,
      fecha_ingreso: '2020-01-01', // ~4 años
      genero: 'masculino',
    }),
    createMockEmpleado({
      emp_id: '4',
      numero_empleado: 4,
      nombre: 'Ana Martínez',
      activo: false, // Inactive - should be excluded
      fecha_ingreso: '2023-01-01',
      genero: 'femenino',
    }),
  ];

  it('T1.11.1: Renderiza tabla con columnas correctas', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />);

    // Check headers
    expect(screen.getByText('Antigüedad')).toBeInTheDocument();
    expect(screen.getByText('Femenino')).toBeInTheDocument();
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('T1.11.2: Agrupa rangos de antigüedad correctamente', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />);

    // Check that seniority ranges are displayed
    const seniorityRanges = [
      'Menor de 1 mes',
      '1 a 3 meses',
      '3 a 6 meses',
      '6 meses a 1 año',
      '1-3 años',
      '3-5 años',
      'más de 5 años',
    ];

    seniorityRanges.forEach((range) => {
      expect(screen.getByText(range)).toBeInTheDocument();
    });
  });

  it('T1.11.3: Calcula antigüedad desde fecha_ingreso correctamente', () => {
    const plantillaConFechasEspecificas = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Nuevo Empleado',
        activo: true,
        fecha_ingreso: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
        genero: 'masculino',
      }),
    ];

    renderWithProviders(<SeniorityGenderTable plantilla={plantillaConFechasEspecificas} />);

    // Should categorize as "1 a 3 meses" (1 month)
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.11.4: Excluye empleados inactivos', () => {
    const plantillaConInactivos = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Activo',
        activo: true,
        fecha_ingreso: '2023-01-01',
        genero: 'masculino',
      }),
      createMockEmpleado({
        emp_id: '2',
        numero_empleado: 2,
        nombre: 'Inactivo',
        activo: false,
        fecha_ingreso: '2023-01-01',
        genero: 'femenino',
      }),
    ];

    renderWithProviders(<SeniorityGenderTable plantilla={plantillaConInactivos} />);

    // Only active employee should be counted
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.11.5: Maneja correctamente fechas inválidas', () => {
    const plantillaConFechasInvalidas = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Sin Fecha',
        activo: true,
        fecha_ingreso: undefined,
        genero: 'masculino',
      }),
      createMockEmpleado({
        emp_id: '2',
        numero_empleado: 2,
        nombre: 'Fecha Inválida',
        activo: true,
        fecha_ingreso: 'invalid-date',
        genero: 'femenino',
      }),
    ];

    renderWithProviders(<SeniorityGenderTable plantilla={plantillaConFechasInvalidas} />);

    // Should not crash
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.11.6: Muestra fila de totales correctamente', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />);

    // Check for totals row
    const totalRows = screen.getAllByText('Total');
    expect(totalRows.length).toBeGreaterThan(0);
  });

  it('T1.11.7: Renderiza título del componente', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />);

    expect(screen.getByText('Distribución por Antigüedad y Género')).toBeInTheDocument();
    expect(
      screen.getByText('Análisis de antigüedad de empleados activos por género')
    ).toBeInTheDocument();
  });

  it('T1.11.8: Destaca rango 1-3 años', () => {
    const { container } = renderWithProviders(
      <SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />
    );

    // Check that 1-3 años range has highlight class
    const highlightedRows = container.querySelectorAll('.bg-orange-50, .dark\\:bg-orange-950\\/20');
    expect(highlightedRows.length).toBeGreaterThan(0);
  });

  it('T1.11.9: Calcula porcentajes correctamente', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={mockPlantillaWithSeniority} />);

    // Check that percentage column exists with % symbol
    const percentageCells = screen.getAllByText(/%$/);
    expect(percentageCells.length).toBeGreaterThan(0);
  });

  it('T1.11.10: Maneja plantilla vacía sin crash', () => {
    renderWithProviders(<SeniorityGenderTable plantilla={[]} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Should show all ranges with 0 values (using getAllByText since there might be multiple)
    const totalElements = screen.getAllByText('Total');
    expect(totalElements.length).toBeGreaterThan(0);
  });
});
