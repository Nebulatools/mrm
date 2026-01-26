import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { expect } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider';

/**
 * Custom render function que incluye providers necesarios
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      {children}
    </ThemeProvider>
  );
}

/**
 * Custom render con providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Helper para simular cambios en filtros
 */
export function mockFilterChange(filters: any) {
  return {
    years: filters.years || [],
    months: filters.months || [],
    departamentos: filters.departamentos || [],
    puestos: filters.puestos || [],
    clasificaciones: filters.clasificaciones || [],
    ubicaciones: filters.ubicaciones || [],
    ubicacionesIncidencias: filters.ubicacionesIncidencias || [],
    empresas: filters.empresas || [],
    areas: filters.areas || [],
  };
}

/**
 * Helper para esperar por loading states
 */
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    const loadingElements = document.querySelectorAll('[aria-busy="true"]');
    expect(loadingElements.length).toBe(0);
  });
}

/**
 * Helper para verificar accesibilidad
 */
export async function checkAccessibility(container: HTMLElement) {
  const axe = (await import('axe-core')).default;
  const results = await axe.run(container);
  return results;
}

/**
 * Helper para simular usuario escribiendo
 */
export async function typeInInput(input: HTMLElement, text: string) {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  await user.clear(input);
  await user.type(input, text);
}

/**
 * Helper para simular clicks
 */
export async function clickElement(element: HTMLElement) {
  const { userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  await user.click(element);
}

/**
 * Helper para obtener fecha formateada para tests
 */
export function getTestDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Helper para crear rango de fechas de prueba
 */
export function getTestDateRange() {
  return {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
  };
}

/**
 * Re-export everything from testing library
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

/**
 * Re-export mock data helpers
 */
export { createMockKPI, createMockEmpleado, createMockAsistencia, mockMotivosBaja } from './mockData';
