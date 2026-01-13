import { describe, it, expect } from 'vitest';
import { applyFiltersWithScope } from '../filters';
import { createMockEmpleado } from '@/test/utils';
import type { PlantillaRecord } from '@/lib/supabase';
import type { RetentionFilterOptions } from '../filters';

describe('Filter System - Tab 1: Resumen', () => {
  const mockPlantillaForFilters: PlantillaRecord[] = [
    createMockEmpleado({
      emp_id: '1',
      numero_empleado: 1,
      nombre: 'Juan Pérez',
      activo: true,
      fecha_ingreso: '2024-01-15',
      departamento: 'Ventas',
      puesto: 'Vendedor',
      clasificacion: 'CONFIANZA',
      area: 'Comercial',
      empresa: 'MOTO REPUESTOS MONTERREY',
    }),
    createMockEmpleado({
      emp_id: '2',
      numero_empleado: 2,
      nombre: 'María García',
      activo: true,
      fecha_ingreso: '2023-06-10',
      departamento: 'Marketing',
      puesto: 'Analista',
      clasificacion: 'SINDICALIZADO',
      area: 'Comercial',
      empresa: 'MOTO TOTAL',
    }),
    createMockEmpleado({
      emp_id: '3',
      numero_empleado: 3,
      nombre: 'Pedro López',
      activo: false,
      fecha_ingreso: '2023-01-01',
      fecha_baja: '2024-12-31',
      departamento: 'Operaciones',
      puesto: 'Operador',
      clasificacion: 'SINDICALIZADO',
      area: 'Producción',
      empresa: 'MOTO REPUESTOS MONTERREY',
    }),
  ];

  describe('T5.3 - Filtro: Negocio (Empresa)', () => {
    it('T5.3.7: Filtra empleados por empresa correctamente', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: ['MOTO REPUESTOS MONTERREY'],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(2); // Juan y Pedro
      expect(filtered.every(emp => emp.empresa === 'MOTO REPUESTOS MONTERREY')).toBe(true);
    });

    it('T5.3.8: Combina filtro empresa con otros filtros (AND lógico)', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: ['Ventas'],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: ['MOTO REPUESTOS MONTERREY'],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(1); // Solo Juan (Ventas + MOTO REPUESTOS)
      expect(filtered[0].nombre).toBe('Juan Pérez');
    });
  });

  describe('T5.4 - Filtro: Área', () => {
    it('T5.4.7: Filtra empleados por área correctamente', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: ['Comercial'],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(2); // Juan y María
      expect(filtered.every(emp => emp.area === 'Comercial')).toBe(true);
    });

    it('T5.4.9: Combina con Negocio (jerarquía)', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: ['MOTO TOTAL'],
        areas: ['Comercial'],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(1); // Solo María
      expect(filtered[0].nombre).toBe('María García');
      expect(filtered[0].empresa).toBe('MOTO TOTAL');
      expect(filtered[0].area).toBe('Comercial');
    });
  });

  describe('T5.5 - Filtro: Departamento', () => {
    it('T5.5.8: Filtra plantilla correctamente por departamento', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: ['Ventas'],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(1);
      expect(filtered[0].departamento).toBe('Ventas');
    });

    it('T5.5.9: Actualiza todas las tablas cuando filtra', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: ['Marketing', 'Operaciones'],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(2); // María y Pedro
      expect(filtered.some(emp => emp.departamento === 'Marketing')).toBe(true);
      expect(filtered.some(emp => emp.departamento === 'Operaciones')).toBe(true);
    });
  });

  describe('T5.6 - Filtro: Puesto', () => {
    it('T5.6.8: Filtra empleados por puesto correctamente', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: ['Vendedor'],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(1);
      expect(filtered[0].puesto).toBe('Vendedor');
    });

    it('T5.6.9: Combina con departamento', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: ['Ventas'],
        puestos: ['Vendedor'],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(1);
      expect(filtered[0].nombre).toBe('Juan Pérez');
    });
  });

  describe('T5.7 - Filtro: Clasificación', () => {
    it('T5.7.8: Filtra empleados correctamente', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: ['SINDICALIZADO'],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      expect(filtered.length).toBe(2); // María y Pedro
      expect(filtered.every(emp => emp.clasificacion === 'SINDICALIZADO')).toBe(true);
    });
  });

  describe('T5.10 - Comportamiento Global de Filtros', () => {
    it('T5.10.1: Combina múltiples filtros (AND lógico)', () => {
      const filters: RetentionFilterOptions = {
        years: [2024],
        months: [1],
        departamentos: ['Ventas'],
        puestos: ['Vendedor'],
        clasificaciones: ['CONFIANZA'],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: ['MOTO REPUESTOS MONTERREY'],
        areas: ['Comercial'],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      // All filters should apply (AND logic)
      expect(filtered.length).toBe(1);
      expect(filtered[0].nombre).toBe('Juan Pérez');
    });

    it('T5.10.13: Maneja filtros vacíos (no filtra)', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      // Should return all active employees (no filters applied)
      expect(filtered.length).toBe(2); // Juan y María (activos)
    });

    it('T5.10.14: Maneja plantilla vacía', () => {
      const filters: RetentionFilterOptions = {
        years: [2024],
        months: [1],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope([], filters, 'specific');

      expect(filtered).toEqual([]);
      expect(filtered.length).toBe(0);
    });

    it('T5.10.15: includeInactive=true incluye empleados dados de baja', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
        includeInactive: true,
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      // Should include Pedro (inactivo)
      expect(filtered.length).toBe(3);
      expect(filtered.some(emp => emp.activo === false)).toBe(true);
    });

    it('T5.10.16: includeInactive=false excluye inactivos', () => {
      const filters: RetentionFilterOptions = {
        years: [],
        months: [],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
        includeInactive: false,
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      // Should only include activos (Juan, María)
      expect(filtered.length).toBe(2);
      expect(filtered.every(emp => emp.activo === true)).toBe(true);
    });
  });

  describe('T6 - applyFiltersWithScope - Scopes', () => {
    it('T6.45: scope="specific" filtra mes+año', () => {
      const filters: RetentionFilterOptions = {
        years: [2024],
        months: [1],
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'specific');

      // Should filter by year and month
      expect(filtered.every(emp => {
        const fecha = new Date(emp.fecha_ingreso);
        return fecha.getFullYear() === 2024 && fecha.getMonth() === 0;
      })).toBe(true);
    });

    it('T6.46: scope="year-only" ignora mes', () => {
      const filters: RetentionFilterOptions = {
        years: [2024],
        months: [1], // This should be ignored
        departamentos: [],
        puestos: [],
        clasificaciones: [],
        ubicaciones: [],
        ubicacionesIncidencias: [],
        empresas: [],
        areas: [],
      };

      const filtered = applyFiltersWithScope(mockPlantillaForFilters, filters, 'year-only');

      // Should filter by year only, ignore month
      expect(filtered.every(emp => {
        const fecha = new Date(emp.fecha_ingreso);
        return fecha.getFullYear() === 2024;
      })).toBe(true);
    });
  });
});
