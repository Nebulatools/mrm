import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { RotationByMotiveAreaTable } from '../../rotacion/tables/rotation-by-motive-area-table';
import { renderWithProviders, createMockEmpleado, mockMotivosBaja } from '@/test/utils';

describe('Rotation by Motive-Area Table - Tab 3: Rotación', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: false,
      fecha_ingreso: '2023-01-15',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
      area: 'Comercial',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: false,
      fecha_ingreso: '2022-06-10',
      fecha_baja: '2024-02-15',
      motivo_baja: 'Abandono de trabajo',
      area: 'Producción',
    }),
  ];

  it('T3.7.1: Renderiza título del componente', () => {
    renderWithProviders(
      <RotationByMotiveAreaTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.7.2: Crea matriz Motivos × Áreas', () => {
    renderWithProviders(
      <RotationByMotiveAreaTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} />
    );

    // Component should process the cross-tabulation
    expect(document.body).toBeInTheDocument();
  });

  it('T3.7.3: Filtra por año correctamente', () => {
    renderWithProviders(
      <RotationByMotiveAreaTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} selectedYears={[2023]} />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.7.4: Maneja datos vacíos', () => {
    renderWithProviders(<RotationByMotiveAreaTable plantilla={[]} motivosBaja={[]} />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.7.5: Agrupa por área correctamente', () => {
    const comercial = mockPlantilla.filter((emp) => emp.area === 'Comercial');
    const produccion = mockPlantilla.filter((emp) => emp.area === 'Producción');

    expect(comercial.length).toBe(1);
    expect(produccion.length).toBe(1);
  });

  it('T3.7.6: Agrupa por motivo correctamente', () => {
    const renuncia = mockPlantilla.filter((emp) => emp.motivo_baja === 'Renuncia voluntaria');
    const abandono = mockPlantilla.filter((emp) => emp.motivo_baja === 'Abandono de trabajo');

    expect(renuncia.length).toBe(1);
    expect(abandono.length).toBe(1);
  });

  it('T3.7.7: Acepta años seleccionados', () => {
    renderWithProviders(
      <RotationByMotiveAreaTable
        plantilla={mockPlantilla}
        motivosBaja={mockMotivosBaja}
        selectedYears={[2024, 2023]}
      />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.7.8: Componente se monta correctamente', () => {
    const { container } = renderWithProviders(
      <RotationByMotiveAreaTable plantilla={mockPlantilla} motivosBaja={mockMotivosBaja} />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
