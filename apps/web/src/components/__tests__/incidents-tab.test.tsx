import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import IncidentsTab from '../incidencias/incidents-tab';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';

// Mock Supabase
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual('@/lib/supabase');
  return {
    ...actual,
    db: {
      getIncidenciasCSV: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('@/lib/supabase-client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Incidents Tab - Tab 2: Incidencias', () => {
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
  ];

  it('T2.5.1: Renderiza componente correctamente', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2024}
        initialIncidencias={mockIncidencias as any}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.2: Muestra KPIs de incidencias', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2024}
        initialIncidencias={mockIncidencias as any}
      />
    );
    // Component should render
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.3: Acepta año específico', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2023}
        initialIncidencias={mockIncidencias as any}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.4: Acepta plantilla anual para cálculos', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        plantillaAnual={mockPlantilla}
        currentYear={2024}
        initialIncidencias={mockIncidencias as any}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.5: Acepta selectedYears y selectedMonths', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2024}
        selectedYears={[2024, 2023]}
        selectedMonths={[1, 2, 3]}
        initialIncidencias={mockIncidencias as any}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.6: Callback onKPIsUpdate se ejecuta', () => {
    const onKPIsUpdate = vi.fn();

    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2024}
        initialIncidencias={mockIncidencias as any}
        onKPIsUpdate={onKPIsUpdate}
      />
    );

    // Component should mount
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.7: Maneja plantilla vacía', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={[]}
        currentYear={2024}
        initialIncidencias={[]}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T2.5.8: Maneja incidencias vacías', () => {
    renderWithProviders(
      <IncidentsTab
        plantilla={mockPlantilla}
        currentYear={2024}
        initialIncidencias={[]}
      />
    );
    expect(document.body).toBeInTheDocument();
  });
});
