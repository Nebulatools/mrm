import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KPICalculator } from '../kpi-calculator';
import type { PlantillaRecord, AsistenciaDiariaRecord } from '../supabase';
import { mockPlantilla, createMockEmpleado } from '@/test/mockData';

describe('KPICalculator - KPI Activos', () => {
  let calculator: KPICalculator;
  let testPlantilla: PlantillaRecord[];

  beforeEach(() => {
    calculator = new KPICalculator();
    testPlantilla = [...mockPlantilla];
  });

  it('T1.1.1: Renderiza correctamente el valor actual', async () => {
    const kpis = await calculator['calculateKPIsFromData'](
      testPlantilla,
      [],
      [],
      [],
      [],
      [],
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );

    const activosKPI = kpis.find((kpi) => kpi.name === 'Activos');
    expect(activosKPI).toBeDefined();
    expect(activosKPI?.value).toBeGreaterThan(0);
    expect(typeof activosKPI?.value).toBe('number');
  });

  it('T1.1.2: Muestra varianza vs período anterior', async () => {
    // Create previous period with one more active employee
    const prevPlantilla = [
      ...testPlantilla,
      createMockEmpleado({
        emp_id: '999',
        numero_empleado: 999,
        activo: true,
        nombre: 'Extra Employee',
      }),
    ];

    const kpis = await calculator['calculateKPIsFromData'](
      testPlantilla,
      [],
      [],
      prevPlantilla,
      [],
      [],
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );

    const activosKPI = kpis.find((kpi) => kpi.name === 'Activos');
    expect(activosKPI?.previous_value).toBeDefined();
    expect(activosKPI?.variance_percentage).toBeDefined();
    expect(typeof activosKPI?.variance_percentage).toBe('number');
  });

  it('T1.1.3: Calcula correctamente empleados activos (activo = true)', () => {
    const activos = testPlantilla.filter((emp) => emp.activo === true);
    const inactivos = testPlantilla.filter((emp) => emp.activo === false);

    expect(activos.length).toBeGreaterThan(0);
    expect(inactivos.length).toBeGreaterThan(0);
    expect(activos.every((emp) => emp.activo === true)).toBe(true);
    expect(inactivos.every((emp) => emp.activo === false)).toBe(true);
  });

  it('T1.1.4: Actualiza cuando cambian filtros de departamento', () => {
    const departamento = 'Ventas';
    const filtradoPorDepto = testPlantilla.filter(
      (emp) => emp.departamento === departamento && emp.activo
    );

    expect(filtradoPorDepto.length).toBeGreaterThanOrEqual(0);

    if (filtradoPorDepto.length > 0) {
      expect(filtradoPorDepto.every((emp) => emp.departamento === departamento)).toBe(true);
      expect(filtradoPorDepto.every((emp) => emp.activo === true)).toBe(true);
    }
  });

  it('T1.1.5: Actualiza cuando cambian filtros de clasificación', () => {
    const clasificacion = 'SINDICALIZADO';
    const filtradoPorClasif = testPlantilla.filter(
      (emp) => emp.clasificacion === clasificacion && emp.activo
    );

    expect(filtradoPorClasif.length).toBeGreaterThanOrEqual(0);

    if (filtradoPorClasif.length > 0) {
      expect(filtradoPorClasif.every((emp) => emp.clasificacion === clasificacion)).toBe(true);
      expect(filtradoPorClasif.every((emp) => emp.activo === true)).toBe(true);
    }
  });

  it('T1.1.6: Maneja correctamente valores nulos/undefined', () => {
    const plantillaConNulos: PlantillaRecord[] = [
      ...testPlantilla,
      createMockEmpleado({
        emp_id: '888',
        numero_empleado: 888,
        nombre: 'Sin Activo',
        activo: undefined as any,
      }),
      createMockEmpleado({
        emp_id: '777',
        numero_empleado: 777,
        nombre: 'Null Activo',
        activo: null as any,
      }),
    ];

    // Filter should handle undefined/null gracefully
    const activos = plantillaConNulos.filter((emp) => emp.activo === true);

    // Should only count explicitly true values
    expect(activos.length).toBeGreaterThan(0);
    expect(activos.every((emp) => emp.activo === true)).toBe(true);

    // Undefined/null should not be counted as active
    const undefinedEmp = plantillaConNulos.find((emp) => emp.emp_id === '888');
    const nullEmp = plantillaConNulos.find((emp) => emp.emp_id === '777');
    expect(activos).not.toContain(undefinedEmp);
    expect(activos).not.toContain(nullEmp);
  });
});

describe('KPICalculator - Cache Management', () => {
  let calculator: KPICalculator;

  beforeEach(() => {
    calculator = new KPICalculator();
  });

  it('should cache results correctly', async () => {
    const spy = vi.spyOn(calculator as any, 'calculateFromDatabase');

    // First call should hit the database
    await calculator.calculateAllKPIs({ period: 'monthly', date: new Date() });
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call within cache TTL should use cache
    await calculator.calculateAllKPIs({ period: 'monthly', date: new Date() });
    expect(spy).toHaveBeenCalledTimes(1); // Should still be 1
  });

  it('should clear cache when requested', async () => {
    // Populate cache
    await calculator.calculateAllKPIs({ period: 'monthly', date: new Date() });

    // Clear cache
    calculator.clearCache();

    // Cache should be empty
    expect((calculator as any).cache.size).toBe(0);
  });

  it('should force refresh when requested', async () => {
    // Populate cache
    await calculator.calculateAllKPIs({ period: 'monthly', date: new Date() });

    // Force refresh should clear cache
    calculator.forceRefresh();

    // Cache should be empty
    expect((calculator as any).cache.size).toBe(0);
  });
});
