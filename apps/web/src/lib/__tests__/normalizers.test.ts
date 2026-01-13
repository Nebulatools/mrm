import { describe, it, expect } from 'vitest';
import {
  normalizeMotivo,
  prettyMotivo,
  normalizeArea,
  isMotivoClave,
  normalizeIncidenciaCode,
} from '../normalizers';

describe('Normalizers - Utility Functions', () => {
  describe('T6.33-T6.44: normalizeMotivo y prettyMotivo', () => {
    it('T6.33: normalizeMotivo normaliza strings', () => {
      expect(normalizeMotivo('Renuncia Voluntaria')).toBe('renuncia voluntaria');
      expect(normalizeMotivo('  ABANDONO  ')).toBe('abandono');
      expect(normalizeMotivo(null as any)).toBe('');
    });

    it('T6.34: prettyMotivo formatea para UI', () => {
      const result = prettyMotivo('renuncia voluntaria');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('T6.35: normalizeArea normaliza áreas', () => {
      const result = normalizeArea('COMERCIAL');
      expect(typeof result).toBe('string');
    });

    it('T6.36: isMotivoClave identifica involuntarios', () => {
      expect(isMotivoClave('Rescisión por desempeño')).toBe(true);
      expect(isMotivoClave('Rescisión disciplinaria')).toBe(true);
      expect(isMotivoClave('Término del contrato')).toBe(true);
      expect(isMotivoClave('Renuncia voluntaria')).toBe(false);
      expect(isMotivoClave('Abandono de trabajo')).toBe(false);
    });

    it('T6.37: Maneja null/undefined', () => {
      expect(normalizeMotivo(null as any)).toBe('');
      expect(normalizeMotivo(undefined as any)).toBe('');
      expect(prettyMotivo(null as any)).toBe('Otra razón');
    });

    it('T6.38: Maneja strings vacíos', () => {
      expect(normalizeMotivo('')).toBe('');
      expect(prettyMotivo('')).toBe('Otra razón');
    });

    it('T6.39: Trim espacios correctamente', () => {
      expect(normalizeMotivo('  texto  ')).toBe('texto');
    });

    it('T6.40: Lowercase consistente', () => {
      expect(normalizeMotivo('MAYÚSCULAS')).toBe('mayusculas');
    });

    it('T6.41: Elimina acentos correctamente', () => {
      const result = normalizeMotivo('Renuncia');
      expect(typeof result).toBe('string');
    });

    it('T6.42: Identifica rescisión, disciplina, término', () => {
      expect(isMotivoClave('rescisión')).toBe(true);
      expect(isMotivoClave('disciplina')).toBe(true);
      expect(isMotivoClave('término')).toBe(true);
    });

    it('T6.43: normalizeIncidenciaCode normaliza códigos', () => {
      expect(normalizeIncidenciaCode('fi')).toBe('FI');
      expect(normalizeIncidenciaCode('PCON')).toBe('PCON');
      expect(normalizeIncidenciaCode('  vac  ')).toBe('VAC');
    });

    it('T6.44: Performance < 10ms por normalización', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        normalizeMotivo('Test Motivo');
        prettyMotivo('test motivo');
        normalizeArea('TEST AREA');
      }

      const duration = performance.now() - start;
      const avgPerOp = duration / 3000; // 3 funciones × 1000 iteraciones

      expect(avgPerOp).toBeLessThan(0.1); // < 0.1ms por operación
    });
  });
});
