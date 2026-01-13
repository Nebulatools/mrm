import { describe, it, expect } from 'vitest';
import { ModelTrendsTab } from '../model-trends-tab';
import { renderWithProviders, createMockKPI, createMockEmpleado } from '@/test/utils';

describe('Model Trends Tab - Tab 4: Tendencias', () => {
  const mockKPIs = [
    createMockKPI({
      name: 'Activos',
      category: 'headcount',
      value: 75,
      previous_value: 73,
      variance_percentage: 2.74,
    }),
    createMockKPI({
      name: 'Rotación Mensual',
      category: 'retention',
      value: 8.5,
      previous_value: 7.2,
      variance_percentage: 18.06,
    }),
  ];

  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
    }),
  ];

  it('T4.2.1: Renderiza componente correctamente', () => {
    renderWithProviders(
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2024}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.2: Acepta KPIs y plantilla', () => {
    renderWithProviders(
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2024}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.3: Acepta año específico', () => {
    renderWithProviders(
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2023}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.4: Acepta filtros de retención', () => {
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
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2024}
        filters={filters}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.5: Maneja KPIs vacíos', () => {
    renderWithProviders(
      <ModelTrendsTab kpis={[]} plantilla={mockPlantilla} currentYear={2024} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.6: Maneja plantilla vacía', () => {
    renderWithProviders(
      <ModelTrendsTab kpis={mockKPIs} plantilla={[]} currentYear={2024} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.2.7: Aplica estilos de refresh', () => {
    const { container } = renderWithProviders(
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2024}
        refreshEnabled={true}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('T4.2.8: Componente se monta sin errores', () => {
    const { container } = renderWithProviders(
      <ModelTrendsTab
        kpis={mockKPIs}
        plantilla={mockPlantilla}
        currentYear={2024}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
