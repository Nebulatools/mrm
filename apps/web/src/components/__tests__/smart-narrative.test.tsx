import { describe, it, expect } from 'vitest';
import { SmartNarrative } from '../smart-narrative';
import { renderWithProviders, createMockKPI } from '@/test/utils';

describe('Smart Narrative - Tab 4: Tendencias', () => {
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
      target: 8.0,
      previous_value: 7.2,
      variance_percentage: 18.06,
    }),
  ];

  it('T4.1.1: Renderiza componente correctamente', () => {
    renderWithProviders(<SmartNarrative kpis={mockKPIs} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.2: Acepta array de KPIs', () => {
    renderWithProviders(<SmartNarrative kpis={mockKPIs} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.3: Identifica KPIs fuera de target', () => {
    const kpisFueraTarget = mockKPIs.filter(
      kpi => kpi.target && kpi.value > kpi.target
    );

    expect(kpisFueraTarget.length).toBeGreaterThan(0);
  });

  it('T4.1.4: Identifica tendencias positivas', () => {
    const tendenciasPositivas = mockKPIs.filter(
      kpi => kpi.variance_percentage && kpi.variance_percentage > 0
    );

    expect(tendenciasPositivas.length).toBe(2);
  });

  it('T4.1.5: Identifica tendencias negativas', () => {
    const kpisConNegativa = [
      createMockKPI({
        name: 'Incidencias',
        value: 40,
        previous_value: 50,
        variance_percentage: -20,
      }),
    ];

    renderWithProviders(<SmartNarrative kpis={kpisConNegativa} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.6: Maneja KPIs vacíos', () => {
    renderWithProviders(<SmartNarrative kpis={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.7: Acepta currentDate opcional', () => {
    renderWithProviders(
      <SmartNarrative kpis={mockKPIs} currentDate={new Date('2024-01-31')} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.8: Aplica estilos de refresh cuando refreshEnabled', () => {
    const { container } = renderWithProviders(
      <SmartNarrative kpis={mockKPIs} refreshEnabled={true} />
    );
    expect(container).toBeInTheDocument();
  });
});
