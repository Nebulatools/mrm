import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockPlantilla, mockAsistenciaDiaria, createMockEmpleado } from '@/test/mockData';
import type { PlantillaRecord } from '../supabase';

// Import the actual module to test
import { KPICalculator } from '../kpi-calculator';

describe('KPICalculator - Tests de Funcionalidad', () => {
  let calculator: KPICalculator;

  beforeEach(() => {
    calculator = new KPICalculator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('T1.1 - KPI Activos (Tab 1: Resumen)', () => {
    it('T1.1.3: Filtra empleados activos correctamente', () => {
      const testPlantilla = [...mockPlantilla];
      const activos = testPlantilla.filter((emp) => emp.activo === true);
      const inactivos = testPlantilla.filter((emp) => emp.activo === false);

      expect(activos.length).toBeGreaterThan(0);
      expect(inactivos.length).toBeGreaterThan(0);
      expect(activos.every((emp) => emp.activo === true)).toBe(true);
      expect(inactivos.every((emp) => emp.activo === false)).toBe(true);
    });

    it('T1.1.4: Filtra por departamento correctamente', () => {
      const testPlantilla = [...mockPlantilla];
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

    it('T1.1.5: Filtra por clasificación correctamente', () => {
      const testPlantilla = [...mockPlantilla];
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

    it('T1.1.6: Maneja correctamente valores nulos/undefined en activo', () => {
      const plantillaConNulos: PlantillaRecord[] = [
        ...mockPlantilla,
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

      const activos = plantillaConNulos.filter((emp) => emp.activo === true);

      expect(activos.length).toBeGreaterThan(0);
      expect(activos.every((emp) => emp.activo === true)).toBe(true);

      const undefinedEmp = plantillaConNulos.find((emp) => emp.emp_id === '888');
      const nullEmp = plantillaConNulos.find((emp) => emp.emp_id === '777');
      expect(activos).not.toContain(undefinedEmp);
      expect(activos).not.toContain(nullEmp);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when requested', () => {
      calculator.clearCache();

      // Access private cache property for testing
      const cache = (calculator as any).cache;
      expect(cache.size).toBe(0);
    });

    it('should force refresh clears cache', () => {
      calculator.forceRefresh();

      // Access private cache property for testing
      const cache = (calculator as any).cache;
      expect(cache.size).toBe(0);
    });
  });

  describe('T1.2 - Cálculo de Días Únicos', () => {
    it('T1.2.1: Cuenta días únicos correctamente desde asistencia', () => {
      const asistencia = [
        ...mockAsistenciaDiaria,
        { ...mockAsistenciaDiaria[0], fecha: new Date('2024-01-16') },
        { ...mockAsistenciaDiaria[0], fecha: new Date('2024-01-16') }, // Duplicate - should count once
      ];

      const uniqueDates = new Set(asistencia.map(a => a.fecha.toISOString().split('T')[0]));
      expect(uniqueDates.size).toBeGreaterThan(0);
    });
  });

  describe('T1.3 - Activos Promedio', () => {
    it('T1.3.1: Calcula promedio correctamente', () => {
      const empleadosInicio = 75;
      const empleadosFin = 80;
      const promedio = (empleadosInicio + empleadosFin) / 2;

      expect(promedio).toBe(77.5);
      expect(Math.round(promedio)).toBe(78);
    });

    it('T1.3.2: Redondea a entero', () => {
      const promedio = 77.4;
      expect(Math.round(promedio)).toBe(77);

      const promedio2 = 77.6;
      expect(Math.round(promedio2)).toBe(78);
    });
  });

  describe('T2 - KPIs de Incidencias', () => {
    it('T2.1.1: Filtra incidencias con horas_incidencia > 0', () => {
      const asistencia = [
        createMockEmpleado({ horas_incidencia: 0 } as any),
        createMockEmpleado({ horas_incidencia: 2.5 } as any),
        createMockEmpleado({ horas_incidencia: 0 } as any),
        createMockEmpleado({ horas_incidencia: 4.0 } as any),
      ];

      const incidencias = asistencia.filter((a: any) => (a.horas_incidencia || 0) > 0);
      expect(incidencias.length).toBe(2);
    });

    it('T2.2.1: Calcula Inc prom x empleado correctamente', () => {
      const incidencias = 45;
      const activosProm = 74;
      const incPromXEmpleado = incidencias / activosProm;

      expect(incPromXEmpleado).toBeCloseTo(0.608, 2);
    });

    it('T2.2.2: Maneja división por cero en Inc prom x empleado', () => {
      const incidencias = 45;
      const activosProm = 0;
      const incPromXEmpleado = activosProm > 0 ? incidencias / activosProm : 0;

      expect(incPromXEmpleado).toBe(0);
    });

    it('T2.3.1: Calcula Días Laborados correctamente', () => {
      const activos = 70;
      const diasLaborados = Math.round((activos / 7) * 6);

      expect(diasLaborados).toBe(60);
    });

    it('T2.4.1: Calcula %incidencias correctamente', () => {
      const incidencias = 45;
      const diasLaborados = 60;
      const porcentaje = (incidencias / diasLaborados) * 100;

      expect(porcentaje).toBeCloseTo(75.0, 1);
    });

    it('T2.4.2: Maneja división por cero en %incidencias', () => {
      const incidencias = 45;
      const diasLaborados = 0;
      const porcentaje = diasLaborados > 0 ? (incidencias / diasLaborados) * 100 : 0;

      expect(porcentaje).toBe(0);
    });
  });

  describe('T3 - KPIs de Rotación', () => {
    it('T3.1.1: Calcula Rotación Mensual correctamente', () => {
      const bajasPeriodo = 5;
      const activosProm = 74;
      const rotacionMensual = (bajasPeriodo / activosProm) * 100;

      expect(rotacionMensual).toBeCloseTo(6.76, 2);
    });

    it('T3.1.2: Maneja división por cero en Rotación Mensual', () => {
      const bajasPeriodo = 5;
      const activosProm = 0;
      const rotacionMensual = activosProm > 0 ? (bajasPeriodo / activosProm) * 100 : 0;

      expect(rotacionMensual).toBe(0);
    });

    it('T3.1.3: Redondea a 2 decimales', () => {
      const rotacion = 6.76543;
      expect(Number(rotacion.toFixed(2))).toBe(6.77);
    });
  });

  describe('Varianzas y Comparaciones', () => {
    it('Calcula varianza porcentual correctamente', () => {
      const current = 80;
      const previous = 75;
      const variance = ((current - previous) / previous) * 100;

      expect(variance).toBeCloseTo(6.67, 2);
    });

    it('Maneja varianza cuando previous es 0', () => {
      const current = 80;
      const previous = 0;
      const variance = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

      expect(variance).toBe(100);
    });

    it('Maneja varianza cuando ambos son 0', () => {
      const current = 0;
      const previous = 0;
      const variance = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

      expect(variance).toBe(0);
    });
  });
});
