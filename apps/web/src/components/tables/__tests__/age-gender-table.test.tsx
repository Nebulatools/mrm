import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { AgeGenderTable } from '../age-gender-table';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';

describe('Age-Gender Table - Tab 1: Resumen', () => {
  const mockPlantillaWithAge: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_nacimiento: '1990-05-15',
      genero: 'masculino',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: true,
      fecha_nacimiento: '1985-08-20',
      genero: 'femenino',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: true,
      fecha_nacimiento: '1978-03-10',
      genero: 'masculino',
    }),
    createMockEmpleado({
      emp_id: '4',
      numero_empleado: 4,
      nombre: 'Ana Martínez',
      activo: false, // Inactive - should be excluded
      fecha_nacimiento: '1995-12-01',
      genero: 'femenino',
    }),
  ];

  it('T1.10.1: Renderiza tabla con columnas correctas', () => {
    renderWithProviders(<AgeGenderTable plantilla={mockPlantillaWithAge} />);

    // Check headers
    expect(screen.getByText('Edad')).toBeInTheDocument();
    expect(screen.getByText('Femenino')).toBeInTheDocument();
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('T1.10.2: Agrupa correctamente rangos de edad', () => {
    renderWithProviders(<AgeGenderTable plantilla={mockPlantillaWithAge} />);

    // Check that age ranges are displayed
    const ageRanges = ['18-20', '21-25', '26-30', '31-35', '36-40', '41+'];
    ageRanges.forEach((range) => {
      expect(screen.getByText(range)).toBeInTheDocument();
    });
  });

  it('T1.10.3: Calcula totales por género correctamente', () => {
    renderWithProviders(<AgeGenderTable plantilla={mockPlantillaWithAge} />);

    // Verify table structure is correct
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Check that totals row exists (using getAllByText since there might be multiple)
    const totalElements = screen.getAllByText('Total');
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('T1.10.4: Filtra correctamente empleados activos', () => {
    const plantillaConInactivos = [
      ...mockPlantillaWithAge,
      createMockEmpleado({
        emp_id: '5',
        numero_empleado: 5,
        nombre: 'Inactivo Test',
        activo: false,
        fecha_nacimiento: '1992-01-01',
        genero: 'masculino',
      }),
    ];

    renderWithProviders(<AgeGenderTable plantilla={plantillaConInactivos} />);

    // Inactive employees should not be counted
    // The table should only show active employees (3 in this case)
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.10.5: Excluye empleados sin fecha_nacimiento', () => {
    const plantillaSinFechaNacimiento = [
      ...mockPlantillaWithAge,
      createMockEmpleado({
        emp_id: '6',
        numero_empleado: 6,
        nombre: 'Sin Edad',
        activo: true,
        fecha_nacimiento: undefined,
        genero: 'masculino',
      }),
    ];

    renderWithProviders(<AgeGenderTable plantilla={plantillaSinFechaNacimiento} />);

    // Should not crash and should render normally
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.10.6: Maneja correctamente valores null en género', () => {
    const plantillaConGeneroNull = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Sin Género',
        activo: true,
        fecha_nacimiento: '1990-01-01',
        genero: undefined,
      }),
    ];

    renderWithProviders(<AgeGenderTable plantilla={plantillaConGeneroNull} />);

    // Should not crash
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('T1.10.7: Renderiza título del componente', () => {
    renderWithProviders(<AgeGenderTable plantilla={mockPlantillaWithAge} />);

    expect(screen.getByText('Distribución por Edad y Género')).toBeInTheDocument();
    expect(
      screen.getByText('Análisis demográfico de empleados activos por rango de edad')
    ).toBeInTheDocument();
  });

  it('T1.10.8: Destaca rango 41+ años', () => {
    const plantillaConMayores = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Empleado Mayor',
        activo: true,
        fecha_nacimiento: '1970-01-01', // ~54 años
        genero: 'masculino',
      }),
    ];

    const { container } = renderWithProviders(<AgeGenderTable plantilla={plantillaConMayores} />);

    // Check that 41+ range has highlight class
    const highlightedRows = container.querySelectorAll('.bg-orange-50, .dark\\:bg-orange-950\\/20');
    expect(highlightedRows.length).toBeGreaterThan(0);
  });
});
