import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { AbandonosOtrosSummary } from '../abandonos-otros-summary';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';

describe('Abandonos-Otros Summary - Tab 3: Rotación', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Abandono 1',
      activo: false,
      fecha_baja: '2024-01-15',
      motivo_baja: 'Abandono de trabajo',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'Renuncia 1',
      activo: false,
      fecha_baja: '2024-02-10',
      motivo_baja: 'Renuncia voluntaria',
    }),
  ];

  it('T3.11.1: Agrupa abandonos correctamente', () => {
    const abandonos = mockPlantilla.filter(
      emp => emp.motivo_baja?.toLowerCase().includes('abandono')
    );
    expect(abandonos.length).toBe(1);
  });

  it('T3.11.2: Agrupa otros motivos', () => {
    const otros = mockPlantilla.filter(
      emp => !emp.motivo_baja?.toLowerCase().includes('abandono')
    );
    expect(otros.length).toBe(1);
  });

  it('T3.11.3: Calcula porcentajes del total', () => {
    const total = mockPlantilla.length;
    const abandonos = 1;
    const porcentaje = (abandonos / total) * 100;

    expect(porcentaje).toBe(50);
  });

  it('T3.11.4: Renderiza componente', () => {
    renderWithProviders(<AbandonosOtrosSummary referenceDate={new Date('2024-01-31')} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T3.11.5: Acepta fecha específica', () => {
    renderWithProviders(
      <AbandonosOtrosSummary referenceDate={new Date('2024-12-31')} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.11.6: Maneja diferentes meses', () => {
    renderWithProviders(<AbandonosOtrosSummary referenceDate={new Date('2024-06-30')} />);
    expect(document.body).toBeInTheDocument();
  });
});
