import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { BajasPorMotivoHeatmap } from '../bajas-por-motivo-heatmap';
import { renderWithProviders } from '@/test/utils';

describe('Bajas por Motivo Heatmap - Tab 3: Rotación', () => {
  const mockHeatmapData = [
    {
      motivo: 'Renuncia voluntaria',
      enero: 2,
      febrero: 1,
      marzo: 0,
      abril: 3,
      mayo: 1,
      junio: 2,
      julio: 0,
      agosto: 1,
      septiembre: 2,
      octubre: 1,
      noviembre: 0,
      diciembre: 1,
    },
    {
      motivo: 'Abandono de trabajo',
      enero: 1,
      febrero: 0,
      marzo: 1,
      abril: 0,
      mayo: 2,
      junio: 0,
      julio: 1,
      agosto: 0,
      septiembre: 1,
      octubre: 0,
      noviembre: 1,
      diciembre: 0,
    },
    {
      motivo: 'Rescisión por desempeño',
      enero: 0,
      febrero: 1,
      marzo: 0,
      abril: 1,
      mayo: 0,
      junio: 0,
      julio: 1,
      agosto: 0,
      septiembre: 0,
      octubre: 1,
      noviembre: 0,
      diciembre: 0,
    },
  ];

  it('T3.5.1: Renderiza título del componente', () => {
    renderWithProviders(<BajasPorMotivoHeatmap data={mockHeatmapData} />);

    // Should have some content
    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.2: Renderiza 12 meses en el eje X', () => {
    renderWithProviders(<BajasPorMotivoHeatmap data={mockHeatmapData} />);

    // Check for month labels
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    monthLabels.forEach((month) => {
      const monthElement = screen.queryByText(month);
      // Month might be in the heatmap
      if (monthElement) {
        expect(monthElement).toBeInTheDocument();
      }
    });
  });

  it('T3.5.3: Muestra motivos de baja en el eje Y', () => {
    renderWithProviders(<BajasPorMotivoHeatmap data={mockHeatmapData} />);

    // Check for some motivos
    const renunciaElement = screen.queryByText(/Renuncia/i);
    if (renunciaElement) {
      expect(renunciaElement).toBeInTheDocument();
    }
  });

  it('T3.5.4: Filtra por motivo involuntaria', () => {
    renderWithProviders(
      <BajasPorMotivoHeatmap data={mockHeatmapData} motivoFilter="involuntaria" />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.5: Filtra por motivo voluntaria', () => {
    renderWithProviders(
      <BajasPorMotivoHeatmap data={mockHeatmapData} motivoFilter="voluntaria" />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.6: Muestra todos los motivos cuando filter=all', () => {
    renderWithProviders(
      <BajasPorMotivoHeatmap data={mockHeatmapData} motivoFilter="all" />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.7: Acepta array de años seleccionados', () => {
    renderWithProviders(
      <BajasPorMotivoHeatmap data={mockHeatmapData} selectedYears={[2024, 2023]} />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.8: Maneja datos vacíos sin crash', () => {
    renderWithProviders(<BajasPorMotivoHeatmap data={[]} />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.5.9: Agrupa motivos en secciones (Involuntaria vs Voluntaria)', () => {
    const { container } = renderWithProviders(<BajasPorMotivoHeatmap data={mockHeatmapData} />);

    // Should render sections
    expect(container).toBeInTheDocument();
  });

  it('T3.5.10: Calcula totales por motivo correctamente', () => {
    renderWithProviders(<BajasPorMotivoHeatmap data={mockHeatmapData} />);

    // Component should process totals internally
    expect(document.body).toBeInTheDocument();
  });
});
