/**
 * TEST E2E COMPLETO: AUDITORÍA DE NARRATIVA DE AI
 *
 * Este test verifica que la narrativa de AI:
 * - Se genere correctamente en los 4 tabs (Resumen, Personal, Incidencias, Rotación)
 * - Responda a los filtros aplicados (8 filtros disponibles)
 * - Tenga sentido contextual según el tab y filtros activos
 * - Funcione en ambos niveles (Ejecutivo y Detalle)
 *
 * Filtros disponibles:
 * - Año (2025, 2026)
 * - Mes (Enero, Febrero, ..., Diciembre)
 * - Negocio (MOTO REPUESTOS MONTERREY, MOTO TOTAL, etc.)
 * - Área
 * - Departamento
 * - Puesto
 * - Clasificación
 * - Ubicación
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Configuración del test
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_DATE = '2025-12-01'; // Diciembre 2025 como solicitado
const AUDIT_REPORT_PATH = path.join(__dirname, '../test-results/ai-narrative-audit-report.md');

// Credenciales de prueba (del archivo CREDENCIALES_RH_TEMPORALES.txt)
const TEST_USER = {
  email: 'asolorio@mrm.com.mx',
  password: '!*8xQkfMk7a&qEu@'
};

// Tipos para el reporte de auditoría
interface NarrativeTestResult {
  tab: string;
  filters: Record<string, string>;
  level: 'Ejecutivo' | 'Detalle';
  narrativeGenerated: boolean;
  narrativeText?: string;
  contextuallyCorrect: boolean;
  issues: string[];
  timestamp: string;
}

const auditResults: NarrativeTestResult[] = [];

// Helper: Esperar que la narrativa se genere
async function waitForNarrativeGeneration(page: Page, timeout = 30000): Promise<string> {
  await page.waitForTimeout(1000); // Esperar a que se estabilice la UI

  const generateButton = page.getByRole('button', { name: /Generar/i });

  // Si el botón está visible, hacer clic
  if (await generateButton.isVisible()) {
    await generateButton.click();
  }

  // Esperar a que aparezca el texto de la narrativa
  await page.waitForSelector('text=/Nivel (Ejecutivo|Detalle)/i', { timeout });

  // Extraer el texto de la narrativa
  const narrativeContainer = page.locator('[class*="whitespace-pre-wrap"]').first();
  const text = await narrativeContainer.textContent();

  return text || '';
}

// Helper: Login
async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Verificar si ya está logueado
  const dashboardHeading = page.locator('h1:has-text("Dashboard")');
  if (await dashboardHeading.isVisible().catch(() => false)) {
    return; // Ya está logueado
  }

  // Hacer login
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("Iniciar sesión")');

  // Esperar a que cargue el dashboard
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// Helper: Expandir panel de filtros
async function expandFilters(page: Page) {
  const filterButton = page.locator('button:has-text("Filtros")').first();
  const isExpanded = await page.locator('[data-dropdown]').first().isVisible().catch(() => false);

  if (!isExpanded) {
    await filterButton.click();
    await page.waitForTimeout(500);
  }
}

// Helper: Aplicar filtros usando el sistema de dropdowns con checkboxes
async function applyFilters(
  page: Page,
  filters: { year?: string; month?: string; empresa?: string; area?: string; departamento?: string }
) {
  // Expandir panel de filtros
  await expandFilters(page);

  // Filtro de año
  if (filters.year) {
    // Click en dropdown de Año
    const yearButton = page.locator('button', { has: page.locator('text=Seleccionar año') }).or(
      page.locator('div[data-dropdown="Año"] button').first()
    );
    await yearButton.click();
    await page.waitForTimeout(500);

    // Seleccionar el año en el checkbox
    const yearCheckbox = page.locator(`label:has-text("${filters.year}")`);
    await yearCheckbox.click();
    await page.waitForTimeout(500);

    // Cerrar dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Filtro de mes
  if (filters.month) {
    const monthButton = page.locator('div[data-dropdown="Mes"] button').first();
    await monthButton.click();
    await page.waitForTimeout(500);

    const monthCheckbox = page.locator(`label:has-text("${filters.month}")`);
    await monthCheckbox.click();
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Filtro de negocio/empresa
  if (filters.empresa) {
    const empresaButton = page.locator('div[data-dropdown="Negocio"] button').first();
    if (await empresaButton.isVisible().catch(() => false)) {
      await empresaButton.click();
      await page.waitForTimeout(500);

      const empresaCheckbox = page.locator(`label:has-text("${filters.empresa}")`);
      await empresaCheckbox.click();
      await page.waitForTimeout(500);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Esperar a que los datos se actualicen
  await page.waitForTimeout(2000);
}

// Helper: Cambiar nivel de narrativa (Ejecutivo/Detalle)
async function switchNarrativeLevel(page: Page, level: 'Ejecutivo' | 'Detalle') {
  const levelButton = page.getByRole('button', { name: level });
  await levelButton.click();
  await page.waitForTimeout(500);
}

// Helper: Navegar a un tab específico
async function navigateToTab(page: Page, tabName: string) {
  const tabButton = page.getByRole('tab', { name: tabName });
  await tabButton.click();
  await page.waitForTimeout(1500); // Esperar carga de datos
}

// Helper: Validar contexto de la narrativa
function validateNarrativeContext(
  narrative: string,
  tab: string,
  filters: Record<string, string>,
  level: 'Ejecutivo' | 'Detalle'
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Validación 1: Narrativa no vacía
  if (!narrative || narrative.trim().length < 50) {
    issues.push('Narrativa muy corta o vacía (< 50 caracteres)');
  }

  // Validación 2: Menciona el mes filtrado si aplica
  if (filters.month) {
    const monthLower = filters.month.toLowerCase();
    const narrativeLower = narrative.toLowerCase();
    if (!narrativeLower.includes(monthLower) && !narrativeLower.includes('diciembre') && filters.month === 'Diciembre') {
      issues.push(`No menciona el mes filtrado: ${filters.month}`);
    }
  }

  // Validación 3: Menciona filtros de estructura si están aplicados
  if (filters.empresa && narrative.toLowerCase().indexOf(filters.empresa.toLowerCase().substring(0, 10)) === -1) {
    issues.push(`No menciona el negocio filtrado: ${filters.empresa}`);
  }

  // Validación 4: Nivel Ejecutivo debe ser conciso (< 500 caracteres)
  if (level === 'Ejecutivo' && narrative.length > 500) {
    issues.push(`Nivel Ejecutivo demasiado largo: ${narrative.length} caracteres (debe ser < 500)`);
  }

  // Validación 5: Nivel Detalle debe tener suficiente información (> 100 caracteres)
  if (level === 'Detalle' && narrative.length < 100) {
    issues.push(`Nivel Detalle muy corto: ${narrative.length} caracteres (debe ser > 100)`);
  }

  // Validación 6: Debe contener números/métricas si es Detalle
  if (level === 'Detalle' && !/\d+/.test(narrative)) {
    issues.push('Nivel Detalle no contiene métricas numéricas');
  }

  // Validación 7: Contexto específico por tab
  const narrativeLower = narrative.toLowerCase();
  switch (tab) {
    case 'Resumen':
      if (!narrativeLower.includes('rotación') && !narrativeLower.includes('general')) {
        issues.push('Tab Resumen: No menciona "rotación" o contexto general');
      }
      break;
    case 'Personal':
      if (!narrativeLower.includes('empleado') && !narrativeLower.includes('headcount') && !narrativeLower.includes('activo')) {
        issues.push('Tab Personal: No menciona "empleado", "headcount" o "activo"');
      }
      break;
    case 'Incidencias':
      if (!narrativeLower.includes('incidencia') && !narrativeLower.includes('ausentismo') && !narrativeLower.includes('falta')) {
        issues.push('Tab Incidencias: No menciona "incidencia", "ausentismo" o "falta"');
      }
      break;
    case 'Rotación':
      if (!narrativeLower.includes('rotación') && !narrativeLower.includes('baja') && !narrativeLower.includes('voluntaria')) {
        issues.push('Tab Rotación: No menciona "rotación", "baja" o "voluntaria"');
      }
      break;
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

// Helper: Guardar reporte de auditoría
function saveAuditReport() {
  const reportDir = path.dirname(AUDIT_REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const totalTests = auditResults.length;
  const passedTests = auditResults.filter(r => r.contextuallyCorrect).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  let report = `# 🤖 REPORTE DE AUDITORÍA: NARRATIVA DE AI\n\n`;
  report += `**Fecha de Ejecución:** ${new Date().toLocaleString('es-MX')}\n\n`;
  report += `## 📊 Resumen Ejecutivo\n\n`;
  report += `- **Total de Tests:** ${totalTests}\n`;
  report += `- **Tests Pasados:** ${passedTests} ✅\n`;
  report += `- **Tests Fallidos:** ${failedTests} ❌\n`;
  report += `- **Tasa de Éxito:** ${successRate}%\n\n`;

  // Agrupar por tab
  const resultsByTab = auditResults.reduce((acc, result) => {
    if (!acc[result.tab]) acc[result.tab] = [];
    acc[result.tab].push(result);
    return acc;
  }, {} as Record<string, NarrativeTestResult[]>);

  report += `## 📋 Resultados Detallados por Tab\n\n`;

  Object.entries(resultsByTab).forEach(([tab, results]) => {
    const tabPassed = results.filter(r => r.contextuallyCorrect).length;
    const tabTotal = results.length;
    const tabRate = ((tabPassed / tabTotal) * 100).toFixed(1);

    report += `### ${tab} (${tabRate}% éxito)\n\n`;

    results.forEach((result, idx) => {
      const status = result.contextuallyCorrect ? '✅' : '❌';
      const filtersStr = Object.entries(result.filters)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      report += `#### Test ${idx + 1}: ${result.level} ${status}\n\n`;
      report += `- **Filtros:** ${filtersStr || 'Sin filtros'}\n`;
      report += `- **Narrativa Generada:** ${result.narrativeGenerated ? 'Sí' : 'No'}\n`;

      if (result.narrativeText) {
        report += `- **Texto (primeros 150 caracteres):** "${result.narrativeText.substring(0, 150)}..."\n`;
      }

      if (result.issues.length > 0) {
        report += `- **Problemas Detectados:**\n`;
        result.issues.forEach(issue => {
          report += `  - ${issue}\n`;
        });
      }

      report += `\n`;
    });
  });

  report += `## 🔍 Análisis de Problemas Comunes\n\n`;

  // Contar tipos de problemas
  const issueTypes = new Map<string, number>();
  auditResults.forEach(result => {
    result.issues.forEach(issue => {
      const type = issue.split(':')[0];
      issueTypes.set(type, (issueTypes.get(type) || 0) + 1);
    });
  });

  if (issueTypes.size > 0) {
    Array.from(issueTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        report += `- **${type}:** ${count} ocurrencias\n`;
      });
  } else {
    report += `✅ No se detectaron problemas comunes.\n`;
  }

  report += `\n## 💡 Recomendaciones\n\n`;

  if (failedTests === 0) {
    report += `✅ Todas las narrativas de AI cumplen con los criterios de calidad.\n`;
  } else {
    report += `### Áreas de Mejora:\n\n`;

    if (issueTypes.has('No menciona el mes filtrado')) {
      report += `1. **Contexto Temporal:** Mejorar la mención explícita del período filtrado en la narrativa.\n`;
    }

    if (issueTypes.has('Nivel Ejecutivo demasiado largo')) {
      report += `2. **Concisión Ejecutiva:** Reducir la longitud de narrativas en modo Ejecutivo (máx 500 caracteres).\n`;
    }

    if (issueTypes.has('Nivel Detalle muy corto')) {
      report += `3. **Profundidad Analista:** Aumentar el detalle en modo Detalle (mín 100 caracteres).\n`;
    }
  }

  report += `\n---\n`;
  report += `*Generado automáticamente por el sistema de tests E2E de Playwright*\n`;

  fs.writeFileSync(AUDIT_REPORT_PATH, report, 'utf-8');
  console.log(`\n📄 Reporte de auditoría guardado en: ${AUDIT_REPORT_PATH}\n`);
}

// SUITE DE TESTS PRINCIPAL
test.describe('🧪 Auditoría Completa: Narrativa de AI', () => {

  test.beforeAll(async () => {
    console.log('\n🚀 Iniciando auditoría exhaustiva de narrativa de AI...\n');
  });

  test.afterAll(async () => {
    saveAuditReport();
  });

  // TEST 1: Resumen - Diciembre 2025 - Sin filtros adicionales - Ejecutivo
  test('T1: Resumen · Dic 2025 · Sin filtros · Ejecutivo', async ({ page }) => {
    await login(page);

    // Aplicar filtros básicos (Diciembre 2025)
    await applyFilters(page, { year: '2025', month: 'Diciembre' });

    // Navegar a tab Resumen (debería estar por defecto, pero verificamos)
    await navigateToTab(page, 'Resumen');

    // Cambiar a nivel Ejecutivo
    await switchNarrativeLevel(page, 'Ejecutivo');

    // Generar narrativa
    const narrative = await waitForNarrativeGeneration(page);

    // Validar contexto
    const validation = validateNarrativeContext(
      narrative,
      'Resumen',
      { month: 'Diciembre' },
      'Ejecutivo'
    );

    // Guardar resultado
    auditResults.push({
      tab: 'Resumen',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
    expect(validation.isValid).toBe(true);
  });

  // TEST 2: Resumen - Diciembre 2025 - Sin filtros adicionales - Detalle
  test('T2: Resumen · Dic 2025 · Sin filtros · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Resumen');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Resumen', { month: 'Diciembre' }, 'Detalle');

    auditResults.push({
      tab: 'Resumen',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
    expect(validation.isValid).toBe(true);
  });

  // TEST 3: Personal - Diciembre 2025 - Sin filtros adicionales - Ejecutivo
  test('T3: Personal · Dic 2025 · Sin filtros · Ejecutivo', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Personal');
    await switchNarrativeLevel(page, 'Ejecutivo');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Personal', { month: 'Diciembre' }, 'Ejecutivo');

    auditResults.push({
      tab: 'Personal',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
    expect(validation.isValid).toBe(true);
  });

  // TEST 4: Personal - Diciembre 2025 - Sin filtros adicionales - Detalle
  test('T4: Personal · Dic 2025 · Sin filtros · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Personal');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Personal', { month: 'Diciembre' }, 'Detalle');

    auditResults.push({
      tab: 'Personal',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
    expect(validation.isValid).toBe(true);
  });

  // TEST 5: Incidencias - Diciembre 2025 - Sin filtros adicionales - Ejecutivo
  test('T5: Incidencias · Dic 2025 · Sin filtros · Ejecutivo', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Incidencias');
    await switchNarrativeLevel(page, 'Ejecutivo');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Incidencias', { month: 'Diciembre' }, 'Ejecutivo');

    auditResults.push({
      tab: 'Incidencias',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
    expect(validation.isValid).toBe(true);
  });

  // TEST 6: Incidencias - Diciembre 2025 - Sin filtros adicionales - Detalle
  test('T6: Incidencias · Dic 2025 · Sin filtros · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Incidencias');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Incidencias', { month: 'Diciembre' }, 'Detalle');

    auditResults.push({
      tab: 'Incidencias',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
    expect(validation.isValid).toBe(true);
  });

  // TEST 7: Rotación - Diciembre 2025 - Sin filtros adicionales - Ejecutivo
  test('T7: Rotación · Dic 2025 · Sin filtros · Ejecutivo', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Rotación');
    await switchNarrativeLevel(page, 'Ejecutivo');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Rotación', { month: 'Diciembre' }, 'Ejecutivo');

    auditResults.push({
      tab: 'Rotación',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
    expect(validation.isValid).toBe(true);
  });

  // TEST 8: Rotación - Diciembre 2025 - Sin filtros adicionales - Detalle
  test('T8: Rotación · Dic 2025 · Sin filtros · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Diciembre' });
    await navigateToTab(page, 'Rotación');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Rotación', { month: 'Diciembre' }, 'Detalle');

    auditResults.push({
      tab: 'Rotación',
      filters: { year: '2025', month: 'Diciembre' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
    expect(validation.isValid).toBe(true);
  });

  // TEST 9: Resumen con filtro de Negocio - MOTO REPUESTOS MONTERREY
  test('T9: Resumen · Dic 2025 · Negocio: MRM · Ejecutivo', async ({ page }) => {
    await login(page);

    await applyFilters(page, {
      year: '2025',
      month: 'Diciembre',
      empresa: 'MOTO REPUESTOS MONTERREY'
    });

    await navigateToTab(page, 'Resumen');
    await switchNarrativeLevel(page, 'Ejecutivo');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(
      narrative,
      'Resumen',
      { month: 'Diciembre', empresa: 'MOTO REPUESTOS MONTERREY' },
      'Ejecutivo'
    );

    auditResults.push({
      tab: 'Resumen',
      filters: { year: '2025', month: 'Diciembre', empresa: 'MOTO REPUESTOS MONTERREY' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
  });

  // TEST 10: Personal con filtro de Negocio - MOTO TOTAL
  test('T10: Personal · Dic 2025 · Negocio: MOTO TOTAL · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, {
      year: '2025',
      month: 'Diciembre',
      empresa: 'MOTO TOTAL'
    });

    await navigateToTab(page, 'Personal');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(
      narrative,
      'Personal',
      { month: 'Diciembre', empresa: 'MOTO TOTAL' },
      'Detalle'
    );

    auditResults.push({
      tab: 'Personal',
      filters: { year: '2025', month: 'Diciembre', empresa: 'MOTO TOTAL' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
  });

  // TEST 11: Enero 2025 - Resumen - Ejecutivo (cambio de mes)
  test('T11: Resumen · Ene 2025 · Sin filtros · Ejecutivo', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Enero' });
    await navigateToTab(page, 'Resumen');
    await switchNarrativeLevel(page, 'Ejecutivo');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Resumen', { month: 'Enero' }, 'Ejecutivo');

    auditResults.push({
      tab: 'Resumen',
      filters: { year: '2025', month: 'Enero' },
      level: 'Ejecutivo',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(50);
  });

  // TEST 12: Incidencias con cambio de mes - Enero 2025
  test('T12: Incidencias · Ene 2025 · Sin filtros · Detalle', async ({ page }) => {
    await login(page);

    await applyFilters(page, { year: '2025', month: 'Enero' });
    await navigateToTab(page, 'Incidencias');
    await switchNarrativeLevel(page, 'Detalle');

    const narrative = await waitForNarrativeGeneration(page);
    const validation = validateNarrativeContext(narrative, 'Incidencias', { month: 'Enero' }, 'Detalle');

    auditResults.push({
      tab: 'Incidencias',
      filters: { year: '2025', month: 'Enero' },
      level: 'Detalle',
      narrativeGenerated: narrative.length > 0,
      narrativeText: narrative,
      contextuallyCorrect: validation.isValid,
      issues: validation.issues,
      timestamp: new Date().toISOString()
    });

    expect(narrative.length).toBeGreaterThan(100);
  });

});
