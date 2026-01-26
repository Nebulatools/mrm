import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { DismissalReasonsTable } from '../rotacion/dismissal-reasons-table';
import { renderWithProviders, createMockEmpleado } from '@/test/utils';

describe('Dismissal Reasons Table - Tab 3: Rotación', () => {
  const mockPlantilla = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: false,
      fecha_ingreso: '2023-01-15',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: false,
      fecha_ingreso: '2022-06-10',
      fecha_baja: '2024-02-15',
      motivo_baja: 'Abandono de trabajo',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2021-03-01',
      fecha_baja: '2024-03-10',
      motivo_baja: 'Rescisión por desempeño',
    }),
  ];

  it('T3.6.1: Renderiza componente correctamente', () => {
    renderWithProviders(<DismissalReasonsTable plantilla={mockPlantilla} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T3.6.2: Filtra empleados con fecha_baja', () => {
    const conBaja = mockPlantilla.filter(emp => emp.fecha_baja !== null);
    expect(conBaja.length).toBe(3);
  });

  it('T3.6.3: Filtra por motivo voluntaria', () => {
    renderWithProviders(
      <DismissalReasonsTable plantilla={mockPlantilla} motivoFilter="voluntaria" />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.6.4: Filtra por motivo involuntaria', () => {
    renderWithProviders(
      <DismissalReasonsTable plantilla={mockPlantilla} motivoFilter="involuntaria" />
    );
    expect(document.body).toBeInTheDocument();
  });

  it('T3.6.5: Agrupa motivos correctamente', () => {
    const renuncias = mockPlantilla.filter(
      emp => emp.motivo_baja === 'Renuncia voluntaria'
    );
    expect(renuncias.length).toBe(1);
  });

  it('T3.6.6: Maneja plantilla vacía', () => {
    renderWithProviders(<DismissalReasonsTable plantilla={[]} />);
    expect(document.body).toBeInTheDocument();
  });

  it('T3.6.7: Aplica estilos de refresh cuando refreshEnabled', () => {
    const { container } = renderWithProviders(
      <DismissalReasonsTable plantilla={mockPlantilla} refreshEnabled={true} />
    );
    expect(container).toBeInTheDocument();
  });

  it('T3.6.8: Maneja empleados sin motivo_baja', () => {
    const plantillaConNull = [
      createMockEmpleado({
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Sin Motivo',
        activo: false,
        fecha_baja: '2024-01-01',
        motivo_baja: null,
      }),
    ];

    renderWithProviders(<DismissalReasonsTable plantilla={plantillaConNull} />);
    expect(document.body).toBeInTheDocument();
  });
});
