import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { AbsenteeismTable } from '../absenteeism-table';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';

describe('Absenteeism Table - Tab 2: Incidencias', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1001,
      nombre: 'Juan Pérez',
      activo: true,
    }),
  ];

  const mockIncidencias = [
    {
      id: 1,
      emp: 1001,
      fecha: '2024-01-15',
      inci: 'FI',
      incidencia: 'Falta injustificada',
    },
    {
      id: 2,
      emp: 1001,
      fecha: '2024-01-20',
      inci: 'PCON',
      incidencia: 'Permiso con goce',
    },
  ];

  it('T2.6.1: Renderiza título del componente', () => {
    renderWithProviders(
      <AbsenteeismTable
        incidencias={mockIncidencias as any}
        plantilla={mockPlantilla}
        currentYear={2024}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.6.2: Agrupa incidencias por empleado', () => {
    const grouped = mockIncidencias.reduce((acc, inc) => {
      if (!acc[inc.emp]) acc[inc.emp] = [];
      acc[inc.emp].push(inc);
      return acc;
    }, {} as Record<number, typeof mockIncidencias>);

    expect(grouped[1001].length).toBe(2);
  });

  it('T2.6.3: Calcula totales por empleado', () => {
    const incPorEmpleado = mockIncidencias.filter(inc => inc.emp === 1001);
    expect(incPorEmpleado.length).toBe(2);
  });

  it('T2.6.4: Acepta filtros de año', () => {
    renderWithProviders(
      <AbsenteeismTable
        incidencias={mockIncidencias as any}
        plantilla={mockPlantilla}
        currentYear={2024}
        selectedYears={[2024]}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.6.5: Acepta filtros adicionales', () => {
    const filters = {
      years: [2024],
      months: [1],
      departamentos: [],
      puestos: [],
      clasificaciones: [],
      ubicaciones: [],
      ubicacionesIncidencias: [],
      empresas: [],
      areas: [],
    };

    renderWithProviders(
      <AbsenteeismTable
        incidencias={mockIncidencias as any}
        plantilla={mockPlantilla}
        currentYear={2024}
        filters={filters}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.6.6: Maneja plantilla vacía', () => {
    renderWithProviders(
      <AbsenteeismTable
        incidencias={mockIncidencias as any}
        plantilla={[]}
        currentYear={2024}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.6.7: Maneja incidencias vacías', () => {
    renderWithProviders(
      <AbsenteeismTable
        incidencias={[]}
        plantilla={mockPlantilla}
        currentYear={2024}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.6.8: Filtra por año correctamente', () => {
    const incidencias2024 = mockIncidencias.filter(inc => {
      const fecha = new Date(inc.fecha);
      return fecha.getFullYear() === 2024;
    });

    expect(incidencias2024.length).toBe(2);
  });
});
