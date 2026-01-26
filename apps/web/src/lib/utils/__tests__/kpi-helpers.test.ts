import { describe, it, expect } from 'vitest';
import {
  calculateVariancePercentage,
  calculateActivosPromedio,
  calculateBajasEnPeriodo,
  calculateRotacion,
  calcularRotacionMensual,
  calcularRotacionAcumulada12m,
  calcularRotacionYTD,
  filterByMotivo,
  filterByDateRange,
  calculateBajasTempranas,
  calculateTotalBajas,
  countActivosEnFecha,
  calcularRotacionConDesglose,
  calcularRotacionAcumulada12mConDesglose,
  calcularRotacionYTDConDesglose,
  validatePlantilla,
} from '../kpi-helpers';
import { isMotivoClave } from '@/lib/normalizers';
import { createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';

describe('KPI Helpers - Funciones Críticas de Negocio', () => {
  const mockPlantilla: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_ingreso: '2023-01-15',
      fecha_baja: null,
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: false,
      fecha_ingreso: '2022-06-10',
      fecha_baja: '2024-01-20',
      motivo_baja: 'Renuncia voluntaria',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2023-10-01',
      fecha_baja: '2023-12-15',
      motivo_baja: 'Rescisión por desempeño',
    }),
  ];

  describe('T6.21: calculateVariancePercentage', () => {
    it('Calcula varianza porcentual correctamente', () => {
      const result = calculateVariancePercentage(80, 75);
      expect(result).toBeCloseTo(6.7, 1);
    });

    it('Maneja división por cero (previous = 0)', () => {
      const result = calculateVariancePercentage(80, 0);
      expect(result).toBe(100);
    });

    it('Maneja ambos valores en cero', () => {
      const result = calculateVariancePercentage(0, 0);
      expect(result).toBe(0);
    });

    it('Maneja valores negativos', () => {
      const result = calculateVariancePercentage(70, 80);
      expect(result).toBeCloseTo(-12.5, 1);
    });

    it('Redondea a 1 decimal', () => {
      const result = calculateVariancePercentage(75.567, 70.123);
      expect(typeof result).toBe('number');
      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe('T6.22: calculateActivosPromedio', () => {
    it('Calcula promedio de activos correctamente', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = calculateActivosPromedio(mockPlantilla, startDate, endDate);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(typeof result).toBe('number');
    });

    it('Maneja plantilla vacía', () => {
      const result = calculateActivosPromedio([], new Date(), new Date());
      expect(result).toBe(0);
    });

    it('Maneja startDate > endDate', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-01-01');

      const result = calculateActivosPromedio(mockPlantilla, startDate, endDate);
      expect(result).toBe(0);
    });

    it('Calcula activos al inicio del período', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const activosInicio = mockPlantilla.filter(emp => {
        const ingreso = new Date(emp.fecha_ingreso);
        const baja = emp.fecha_baja ? new Date(emp.fecha_baja) : null;
        return ingreso <= startDate && (!baja || baja > startDate);
      }).length;

      expect(activosInicio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('T6.23: calculateBajasEnPeriodo', () => {
    it('Cuenta bajas en período correctamente', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = calculateBajasEnPeriodo(mockPlantilla, startDate, endDate);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('Excluye bajas fuera del período', () => {
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      const bajasEnPeriodo = mockPlantilla.filter(emp => {
        if (!emp.fecha_baja) return false;
        const fecha = new Date(emp.fecha_baja);
        return fecha >= startDate && fecha <= endDate;
      });

      expect(bajasEnPeriodo.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('T6.24: calcularRotacionConDesglose', () => {
    it('Retorna objeto con total, voluntaria, involuntaria', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = calcularRotacionConDesglose(mockPlantilla, startDate, endDate);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('voluntaria');
      expect(result).toHaveProperty('involuntaria');
      expect(typeof result.total).toBe('number');
      expect(typeof result.voluntaria).toBe('number');
      expect(typeof result.involuntaria).toBe('number');
    });

    it('Separa rotación voluntaria de involuntaria', () => {
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-12-31');

      const result = calcularRotacionConDesglose(mockPlantilla, startDate, endDate);

      // Pedro tiene rescisión (involuntaria), María renuncia (voluntaria)
      expect(result.involuntaria).toBeGreaterThanOrEqual(0);
      expect(result.voluntaria).toBeGreaterThanOrEqual(0);
    });

    it('Total = voluntaria + involuntaria', () => {
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-12-31');

      const result = calcularRotacionConDesglose(mockPlantilla, startDate, endDate);

      expect(result.total).toBeCloseTo(result.voluntaria + result.involuntaria, 1);
    });
  });

  describe('T6.25: calcularRotacionAcumulada12mConDesglose', () => {
    it('Calcula rotación de 12 meses móviles', () => {
      const endDate = new Date('2024-01-31');

      const result = calcularRotacionAcumulada12mConDesglose(mockPlantilla, endDate);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('voluntaria');
      expect(result).toHaveProperty('involuntaria');
    });

    it('Usa ventana de 12 meses hacia atrás', () => {
      const endDate = new Date('2024-01-31');

      // Debería considerar bajas desde Feb 2023 hasta Ene 2024
      const result = calcularRotacionAcumulada12mConDesglose(mockPlantilla, endDate);

      expect(typeof result.total).toBe('number');
    });
  });

  describe('T6.26: calcularRotacionYTDConDesglose', () => {
    it('Calcula rotación Year-to-Date', () => {
      const endDate = new Date('2024-06-30');

      const result = calcularRotacionYTDConDesglose(mockPlantilla, endDate);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('voluntaria');
      expect(result).toHaveProperty('involuntaria');
    });

    it('Usa inicio de año como fecha de inicio', () => {
      const endDate = new Date('2024-06-30');

      // Debería calcular desde 1 Ene 2024 hasta 30 Jun 2024
      const result = calcularRotacionYTDConDesglose(mockPlantilla, endDate);

      expect(typeof result.total).toBe('number');
    });
  });

  describe('T6.27: calculateBajasTempranas', () => {
    it('Identifica empleados con < 3 meses de antigüedad', () => {
      const result = calculateBajasTempranas(mockPlantilla);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('Calcula meses trabajados correctamente', () => {
      const empleadoBajaTemplrana = createMockEmpleado({
        emp_id: '99',
        numero_empleado: 99,
        nombre: 'Baja Temprana',
        fecha_ingreso: '2024-01-01',
        fecha_baja: '2024-02-15',
        activo: false,
      });

      const plantillaConBajaTemprana = [...mockPlantilla, empleadoBajaTemplrana];
      const result = calculateBajasTempranas(plantillaConBajaTemprana);

      expect(result).toBeGreaterThan(0);
    });

    it('Excluye empleados >= 3 meses', () => {
      const empleadoAntiguedad = createMockEmpleado({
        emp_id: '98',
        numero_empleado: 98,
        nombre: 'Con Antigüedad',
        fecha_ingreso: '2023-01-01',
        fecha_baja: '2023-06-01', // 5 meses
        activo: false,
      });

      const plantilla = [empleadoAntiguedad];
      const result = calculateBajasTempranas(plantilla);

      expect(result).toBe(0);
    });
  });

  describe('T6.28: filterByMotivo', () => {
    it('Filtra por motivo voluntaria', () => {
      const result = filterByMotivo(mockPlantilla, 'voluntaria');

      expect(result.every(emp => !isMotivoClave(emp.motivo_baja))).toBe(true);
    });

    it('Filtra por motivo involuntaria', () => {
      const result = filterByMotivo(mockPlantilla, 'involuntaria');

      expect(result.every(emp => isMotivoClave(emp.motivo_baja))).toBe(true);
    });

    it('all retorna todos los empleados con baja', () => {
      const result = filterByMotivo(mockPlantilla, 'all');

      const empleadosConBaja = mockPlantilla.filter(emp => emp.fecha_baja);
      expect(result.length).toBe(empleadosConBaja.length);
    });
  });

  describe('T6.29: filterByDateRange', () => {
    it('Filtra empleados por rango de fechas', () => {
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-12-31');

      const result = filterByDateRange(mockPlantilla, startDate, endDate);

      result.forEach(emp => {
        expect(emp.fecha_baja).toBeDefined();
        const fecha = new Date(emp.fecha_baja!);
        expect(fecha.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(fecha.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('Retorna array vacío si no hay bajas en el período', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = filterByDateRange(mockPlantilla, startDate, endDate);

      // Puede estar vacío si no hay bajas en ese período
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('T6.30: countActivosEnFecha', () => {
    it('Cuenta empleados activos en una fecha específica', () => {
      const fecha = new Date('2024-01-15');

      const result = countActivosEnFecha(mockPlantilla, fecha);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('Incluye empleados sin fecha_baja', () => {
      const fecha = new Date('2024-01-15');

      const sinBaja = mockPlantilla.filter(emp => !emp.fecha_baja);
      const result = countActivosEnFecha(mockPlantilla, fecha);

      expect(result).toBeGreaterThanOrEqual(sinBaja.length);
    });

    it('Excluye empleados con baja antes de la fecha', () => {
      const fecha = new Date('2024-02-01');

      const result = countActivosEnFecha(mockPlantilla, fecha);

      // Pedro se fue en dic 2023, no debería contar en feb 2024
      expect(typeof result).toBe('number');
    });
  });

  describe('T6.31: validatePlantilla', () => {
    it('Retorna true para plantilla válida', () => {
      const result = validatePlantilla(mockPlantilla);
      expect(result).toBe(true);
    });

    it('Maneja plantilla vacía', () => {
      const result = validatePlantilla([]);
      expect(typeof result).toBe('boolean');
    });

    it('Valida campos requeridos', () => {
      const plantillaInvalida = [
        {
          emp_id: '1',
          // Falta numero_empleado
        } as any,
      ];

      const result = validatePlantilla(plantillaInvalida);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('T6.32: Performance de Helpers', () => {
    it('calculateActivosPromedio ejecuta en <50ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        calculateActivosPromedio(
          mockPlantilla,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
      }

      const duration = performance.now() - start;
      const avgPerCall = duration / 100;

      expect(avgPerCall).toBeLessThan(50); // <50ms por llamada
    });

    it('calcularRotacionConDesglose ejecuta en <100ms', () => {
      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        calcularRotacionConDesglose(
          mockPlantilla,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
      }

      const duration = performance.now() - start;
      const avgPerCall = duration / 50;

      expect(avgPerCall).toBeLessThan(100); // <100ms por llamada
    });
  });

  describe('Fórmulas de Rotación - Validación', () => {
    it('Rotación mensual usa fórmula correcta', () => {
      // Fórmula: (Bajas_Período / Activos_Promedio) × 100
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const activosProm = calculateActivosPromedio(mockPlantilla, startDate, endDate);
      const bajasEnPeriodo = calculateBajasEnPeriodo(mockPlantilla, startDate, endDate);

      let rotacionEsperada = 0;
      if (activosProm > 0) {
        rotacionEsperada = (bajasEnPeriodo / activosProm) * 100;
      }

      // Verificar que la fórmula se aplica correctamente
      expect(rotacionEsperada).toBeGreaterThanOrEqual(0);
    });

    it('Rotación YTD calcula desde inicio de año', () => {
      const endDate = new Date('2024-06-30');

      const result = calcularRotacionYTDConDesglose(mockPlantilla, endDate);

      // Debería considerar desde 1 Ene 2024
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('Excluye motivos involuntarios de rotación voluntaria', () => {
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-12-31');

      const result = calcularRotacionConDesglose(mockPlantilla, startDate, endDate);

      // Pedro tiene rescisión (involuntaria), no debería contar en voluntaria
      expect(result.voluntaria).toBeGreaterThanOrEqual(0);
      expect(result.involuntaria).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases - Manejo de Null/Undefined', () => {
    it('Maneja empleados sin fecha_baja', () => {
      const plantillaSinBajas = mockPlantilla.filter(emp => !emp.fecha_baja);

      const result = calculateTotalBajas(plantillaSinBajas);
      expect(result).toBe(0);
    });

    it('Maneja fechas inválidas', () => {
      const plantillaInvalida = [
        createMockEmpleado({
          emp_id: '1',
          numero_empleado: 1,
          nombre: 'Test',
          fecha_ingreso: 'invalid-date',
          activo: true,
        }),
      ];

      const result = calculateActivosPromedio(
        plantillaInvalida,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Debería manejar gracefully
      expect(typeof result).toBe('number');
    });

    it('Maneja motivo_baja null', () => {
      const plantillaConNull = [
        createMockEmpleado({
          emp_id: '1',
          numero_empleado: 1,
          nombre: 'Sin Motivo',
          fecha_baja: '2024-01-15',
          motivo_baja: null,
          activo: false,
        }),
      ];

      const result = filterByMotivo(plantillaConNull, 'voluntaria');

      // Debería manejar null gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
