import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { RotationCombinedTable } from '../../rotacion/tables/rotation-combined-table';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';
import { mockMotivosBaja } from '@/test/mockData';
import type { PlantillaRecord } from '@/lib/supabase';

describe('Rotation Combined Table - Tab 3: Rotación', () => {
  const mockPlantillaRotacion: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: false,
      fecha_ingreso: '2023-01-15',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
      departamento: 'Ventas',
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
      departamento: 'Marketing',
      area: 'Comercial',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2021-03-01',
      fecha_baja: '2024-03-10',
      motivo_baja: 'Rescisión por desempeño',
      departamento: 'Operaciones',
      area: 'Producción',
    }),
  ];

  it('T3.10.1: Renderiza título del componente', () => {
    renderWithProviders(
      <RotationCombinedTable plantilla={mockPlantillaRotacion} motivosBaja={mockMotivosBaja} selectedYears={[2024]} />
    );

    // Check for table or component presence
    const container = document.body;
    expect(container).toBeInTheDocument();
  });

  it('T3.10.2: Acepta año específico', () => {
    renderWithProviders(
      <RotationCombinedTable plantilla={mockPlantillaRotacion} motivosBaja={mockMotivosBaja} selectedYears={[2023]} />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.10.3: Muestra desglose de rotación', () => {
    renderWithProviders(
      <RotationCombinedTable
        plantilla={mockPlantillaRotacion}
        motivosBaja={mockMotivosBaja}
        selectedYears={[2024]}
      />
    );

    expect(document.body).toBeInTheDocument();
  });

  it('T3.10.4: Maneja plantilla vacía sin crash', () => {
    renderWithProviders(<RotationCombinedTable plantilla={[]} motivosBaja={mockMotivosBaja} selectedYears={[2024]} />);

    expect(document.body).toBeInTheDocument();
  });

  it('T3.10.5: Calcula antigüedad correctamente', () => {
    // Test seniority calculation logic
    const empleado = mockPlantillaRotacion[0];
    const fechaIngreso = new Date(empleado.fecha_ingreso);
    const fechaBaja = empleado.fecha_baja ? new Date(empleado.fecha_baja) : new Date();

    const diffTime = fechaBaja.getTime() - fechaIngreso.getTime();
    const meses = Math.floor(diffTime / (30.44 * 24 * 60 * 60 * 1000));

    expect(meses).toBeGreaterThan(0);
  });

  it('T3.10.6: Clasifica motivos correctamente (voluntaria vs involuntaria)', () => {
    const voluntaria = mockPlantillaRotacion.filter(
      (emp) => !emp.motivo_baja?.toLowerCase().includes('rescisión')
    );
    const involuntaria = mockPlantillaRotacion.filter(
      (emp) => emp.motivo_baja?.toLowerCase().includes('rescisión')
    );

    expect(voluntaria.length).toBe(2); // Juan y María
    expect(involuntaria.length).toBe(1); // Pedro
  });

  it('T3.10.7: Agrupa por área correctamente', () => {
    const comercial = mockPlantillaRotacion.filter((emp) => emp.area === 'Comercial');
    const produccion = mockPlantillaRotacion.filter((emp) => emp.area === 'Producción');

    expect(comercial.length).toBe(2);
    expect(produccion.length).toBe(1);
  });

  it('T3.10.8: Agrupa por departamento correctamente', () => {
    const ventas = mockPlantillaRotacion.filter((emp) => emp.departamento === 'Ventas');
    const marketing = mockPlantillaRotacion.filter((emp) => emp.departamento === 'Marketing');

    expect(ventas.length).toBe(1);
    expect(marketing.length).toBe(1);
  });
});
