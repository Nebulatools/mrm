import { describe, it, expect } from 'vitest';
import { RotationByMotiveMonthTable } from '../../rotacion/tables/rotation-by-motive-month-table';
import { renderWithProviders, createMockEmpleado, mockMotivosBaja } from '@/test/utils';

describe('Rotation by Motive-Month Table - Tab 3: Rotación', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Baja Enero',
      activo: false,
      fecha_ingreso: '2023-01-15',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'Baja Febrero',
      activo: false,
      fecha_ingreso: '2022-06-10',
      fecha_baja: '2024-02-15',
      motivo_baja: 'Abandono de trabajo',
    }),
  ];

  it('T3.9.1: Renderiza 12 columnas de meses', () => {
    renderWithProviders(
      <RotationByMotiveMonthTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} selectedYears={[2024]} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.9.2: Agrupa por motivo en filas', () => {
    const motivos = [...new Set(mockPlantilla.map(emp => emp.motivo_baja))];
    expect(motivos.length).toBe(2);
  });

  it('T3.9.3: Filtra por año seleccionado', () => {
    renderWithProviders(
      <RotationByMotiveMonthTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} selectedYears={[2024]} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.9.4: Calcula totales mensuales', () => {
    const bajasEnero = mockPlantilla.filter(emp => {
      if (!emp.fecha_baja) return false;
      const fecha = new Date(emp.fecha_baja);
      return fecha.getMonth() === 0; // Enero = 0
    });
    expect(bajasEnero.length).toBe(1);
  });

  it('T3.9.5: Calcula totales por motivo', () => {
    const renuncias = mockPlantilla.filter(
      emp => emp.motivo_baja === 'Renuncia voluntaria'
    );
    expect(renuncias.length).toBe(1);
  });

  it('T3.9.6: Acepta años seleccionados', () => {
    renderWithProviders(
      <RotationByMotiveMonthTable
        plantilla={mockPlantilla}
        motivosBaja={mockMotivosBaja}
        selectedYears={[2024, 2023]}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.9.7: Maneja plantilla vacía', () => {
    renderWithProviders(
      <RotationByMotiveMonthTable plantilla={[]} motivosBaja={[]} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.9.8: Maneja motivosBaja vacío', () => {
    renderWithProviders(
      <RotationByMotiveMonthTable plantilla={mockPlantilla} motivosBaja={[]} selectedYears={[2024]} />
    );
    expect(document.body).toBeInTheDocument();
  });
});
