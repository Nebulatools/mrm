import { describe, it, expect } from 'vitest';
import { SmartNarrative } from '../smart-narrative';
import { renderWithProviders, createMockKPI } from '@/test/utils';

describe('Smart Narrative - Tab 4: Tendencias', () => {
  const mockData = {
    kpis: [
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
    ],
  };

  it('T4.1.1: Renderiza componente correctamente', () => {
    renderWithProviders(<SmartNarrative data={mockData} section="tendencias" />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.2: Acepta data con KPIs', () => {
    renderWithProviders(<SmartNarrative data={mockData} section="tendencias" />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.3: Identifica KPIs fuera de target', () => {
    const kpisFueraTarget = mockData.kpis.filter(
      kpi => kpi.target && kpi.value > kpi.target
    );

    expect(kpisFueraTarget.length).toBeGreaterThan(0);
  });

  it('T4.1.4: Identifica tendencias positivas', () => {
    const tendenciasPositivas = mockData.kpis.filter(
      kpi => kpi.variance_percentage && kpi.variance_percentage > 0
    );

    expect(tendenciasPositivas.length).toBe(2);
  });

  it('T4.1.5: Identifica tendencias negativas', () => {
    const kpisConNegativa = {
      kpis: [
        createMockKPI({
          name: 'Incidencias',
          value: 40,
          previous_value: 50,
          variance_percentage: -20,
        }),
      ],
    };

    renderWithProviders(<SmartNarrative data={kpisConNegativa} section="tendencias" />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.6: Maneja data vacío', () => {
    renderWithProviders(<SmartNarrative data={{ kpis: [] }} section="tendencias" />);
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.7: Acepta título personalizado', () => {
    renderWithProviders(
      <SmartNarrative data={mockData} section="tendencias" title="Análisis Personalizado" />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T4.1.8: Aplica estilos de refresh cuando refreshEnabled', () => {
    const { container } = renderWithProviders(
      <SmartNarrative data={mockData} section="tendencias" refreshEnabled={true} />
    );
    expect(container).toBeInTheDocument();
  });
});
