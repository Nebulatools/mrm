import test from 'node:test';
import assert from 'node:assert/strict';
import { endOfMonth } from 'date-fns';

import { calculateMonthlyRetention, parseSupabaseDate } from '../src/lib/retention-calculations';
import type { PlantillaRecord } from '../src/lib/types/records';

const makeEmpleado = (overrides: Partial<PlantillaRecord>): PlantillaRecord => ({
  id: 0,
  emp_id: '0',
  numero_empleado: 0,
  nombre: 'Test',
  departamento: 'Operaciones',
  activo: true,
  fecha_ingreso: '2025-01-01',
  fecha_baja: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

test('parseSupabaseDate normalizes YYYY-MM-DD strings to local midnight', () => {
  const date = parseSupabaseDate('2025-10-01');
  assert.ok(date, 'date should be parsed');
  const iso = date!.toISOString();
  assert.ok(iso.startsWith('2025-10-01'), `expected ISO string to keep calendar date, received ${iso}`);
});

test('calculateMonthlyRetention counts bajas on first and last day of the month', async () => {
  const plantilla: PlantillaRecord[] = [
    makeEmpleado({
      id: 1,
      emp_id: '1',
      numero_empleado: 1,
      activo: false,
      fecha_ingreso: '2025-07-15',
      fecha_baja: '2025-10-01',
      motivo_baja: 'Abandono'
    }),
    makeEmpleado({
      id: 2,
      emp_id: '2',
      numero_empleado: 2,
      activo: false,
      fecha_ingreso: '2025-07-15',
      fecha_baja: '2025-10-31',
      motivo_baja: 'Abandono'
    }),
    makeEmpleado({
      id: 3,
      emp_id: '3',
      numero_empleado: 3,
      activo: true,
      fecha_ingreso: '2025-05-01'
    })
  ];

  const monthStart = new Date(2025, 9, 1);
  const monthEnd = endOfMonth(monthStart);

  const result = await calculateMonthlyRetention(monthStart, monthEnd, plantilla, 'all');

  assert.equal(result.bajas, 2);
  assert.equal(result.bajasVoluntarias + result.bajasInvoluntarias, 2);
  assert.equal(result.month, 10);
});
