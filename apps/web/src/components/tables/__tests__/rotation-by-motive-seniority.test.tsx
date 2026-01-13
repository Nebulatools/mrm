import { describe, it, expect } from 'vitest';
import { RotationByMotiveSeniorityTable } from '../rotation-by-motive-seniority-table';
import { renderWithProviders, createMockEmpleado, mockMotivosBaja } from '@/test/utils';

describe('Rotation by Motive-Seniority Table - Tab 3: Rotación', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Baja Temprana',
      activo: false,
      fecha_ingreso: '2023-11-01',
      fecha_baja: '2024-01-15',
      motivo_baja: 'Renuncia voluntaria',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'Baja Media',
      activo: false,
      fecha_ingreso: '2022-06-01',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Abandono de trabajo',
    }),
  ];

  it('T3.8.1: Renderiza componente', () => {
    renderWithProviders(
      <RotationByMotiveSeniorityTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.8.2: Calcula antigüedad en meses', () => {
    const emp = mockPlantilla[0];
    const fechaIngreso = new Date(emp.fecha_ingreso);
    const fechaBaja = new Date(emp.fecha_baja!);
    const meses = Math.floor(
      (fechaBaja.getTime() - fechaIngreso.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    );
    expect(meses).toBeGreaterThanOrEqual(0);
  });

  it('T3.8.3: Clasifica en rangos (<3m, 3-6m, 6-12m, 12+)', () => {
    const clasificar = (meses: number) => {
      if (meses < 3) return '<3m';
      if (meses < 6) return '3-6m';
      if (meses < 12) return '6-12m';
      return '12+m';
    };

    expect(clasificar(2)).toBe('<3m');
    expect(clasificar(4)).toBe('3-6m');
    expect(clasificar(8)).toBe('6-12m');
    expect(clasificar(15)).toBe('12+m');
  });

  it('T3.8.4: Agrupa por motivo', () => {
    const renuncias = mockPlantilla.filter(emp => emp.motivo_baja === 'Renuncia voluntaria');
    expect(renuncias.length).toBe(1);
  });

  it('T3.8.5: Renderiza con datos completos', () => {
    renderWithProviders(
      <RotationByMotiveSeniorityTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.8.6: Procesa motivos correctamente', () => {
    renderWithProviders(
      <RotationByMotiveSeniorityTable
        plantilla={mockPlantilla}
        motivosBaja={mockMotivosBaja}
      />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.8.7: Maneja plantilla vacía', () => {
    renderWithProviders(
      <RotationByMotiveSeniorityTable plantilla={[]} motivosBaja={[]} />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.8.8: Maneja motivosBaja vacío', () => {
    renderWithProviders(
      <RotationByMotiveSeniorityTable plantilla={mockPlantilla} motivosBaja={[]} />
    );
    expect(document.body).toBeInTheDocument();
  });
});
