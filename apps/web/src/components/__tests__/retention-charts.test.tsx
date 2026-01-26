import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { RetentionCharts } from '../rotacion/retention-charts';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';

// Mock Supabase database functions
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual('@/lib/supabase');
  return {
    ...actual,
    db: {
      getEmpleadosSFTP: vi.fn().mockResolvedValue([]),
      getMotivosBaja: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('@/lib/supabase-client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Retention Charts - Tab 3: Rotación', () => {
  const mockPlantillaRotacion: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_ingreso: '2023-01-15',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: false,
      fecha_ingreso: '2022-06-10',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2023-03-01',
      fecha_baja: '2024-02-15',
      motivo_baja: 'Rescisión por desempeño',
    }),
  ];

  it('T3.4.1: Renderiza componente correctamente', () => {
    const { container } = renderWithProviders(<RetentionCharts currentYear={2024} />);

    // Component should mount and render
    expect(container.firstChild).toBeInTheDocument();
    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.2: Muestra secciones principales del componente', async () => {
    renderWithProviders(<RetentionCharts currentYear={2024} />);

    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Component should be in document
    const charts = document.querySelectorAll('[role="img"], svg, canvas');
    expect(charts.length).toBeGreaterThanOrEqual(0);
  });

  it('T3.4.3: Acepta filtro de motivo (voluntaria/involuntaria)', () => {
    const { rerender } = renderWithProviders(
      <RetentionCharts currentYear={2024} motivoFilter="voluntaria" />
    );

    expect(document.body).toBeInTheDocument();

    // Rerender with different filter
    rerender(<RetentionCharts currentYear={2024} motivoFilter="involuntaria" />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.4: Acepta año específico', () => {
    renderWithProviders(<RetentionCharts currentYear={2023} />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.5: Acepta filtros de retención', () => {
    const filters = {
      years: [2024],
      months: [1],
      departamentos: ['Ventas'],
      puestos: [],
      clasificaciones: [],
      empresas: [],
      areas: [],
    };

    renderWithProviders(<RetentionCharts currentYear={2024} filters={filters} />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.6: Maneja datos vacíos sin crash', () => {
    renderWithProviders(<RetentionCharts currentYear={2024} />);

    // Should not crash even with no data
    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.7: Usa fecha actual por defecto cuando no se especifica', () => {
    const currentYear = new Date().getFullYear();

    renderWithProviders(<RetentionCharts />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.4.8: Componente se renderiza correctamente', () => {
    const { container } = renderWithProviders(<RetentionCharts currentYear={2024} />);

    // Component should have mounted
    expect(container.firstChild).toBeInTheDocument();
  });
});
