# 🧪 Testing Guide - HR KPI Dashboard

## 📋 Contenido

- [Setup Inicial](#setup-inicial)
- [Ejecutar Tests](#ejecutar-tests)
- [Escribir Tests](#escribir-tests)
- [Test Coverage](#test-coverage)
- [Best Practices](#best-practices)

---

## 🚀 Setup Inicial

### 1. Instalar Dependencias

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

### 2. Instalar Playwright Browsers

Para E2E tests con Playwright:

```bash
npm run playwright:install
```

---

## ▶️ Ejecutar Tests

### Unit & Integration Tests (Vitest)

```bash
# Modo watch (recomendado para desarrollo)
npm test

# Ejecutar todos los tests una vez
npm run test:run

# Con UI interactiva
npm run test:ui

# Con coverage report
npm run test:coverage

# Watch mode con coverage
npm run test:watch
```

### E2E Tests (Playwright)

```bash
# Ejecutar todos los E2E tests
npm run test:e2e

# Con UI interactiva
npm run test:e2e:ui

# Modo debug (paso a paso)
npm run test:e2e:debug

# Ver reporte HTML
npm run test:e2e:report
```

### Ejecutar Todos los Tests

```bash
npm run test:all
```

---

## 📝 Escribir Tests

### Unit Tests (Funciones y Lógica)

**Ubicación:** `src/lib/__tests__/`

**Ejemplo:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { KPICalculator } from '../kpi-calculator';
import { mockPlantilla } from '@/test/mockData';

describe('KPICalculator', () => {
  let calculator: KPICalculator;

  beforeEach(() => {
    calculator = new KPICalculator();
  });

  it('should calculate activos correctly', async () => {
    const kpis = await calculator['calculateKPIsFromData'](
      mockPlantilla,
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
  });
});
```

### Component Tests (UI)

**Ubicación:** `src/components/__tests__/`

**Ejemplo:**

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockKPI } from '@/test/utils';
import { KPICard } from '../kpi-card';

describe('KPICard', () => {
  it('should render KPI name and value', () => {
    const mockKPI = createMockKPI({
      name: 'Activos',
      value: 75,
    });

    renderWithProviders(<KPICard kpi={mockKPI} />);

    expect(screen.getByText('Activos')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });
});
```

### E2E Tests (User Flows)

**Ubicación:** `e2e/`

**Ejemplo:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test('user can filter by department', async ({ page }) => {
    await page.goto('/');

    // Open filters
    await page.click('button:has-text("Filtros")');

    // Select department
    await page.click('text=Departamento');
    await page.click('text=Ventas');

    // Verify results updated
    const activosCard = page.locator('text=Activos').first();
    await expect(activosCard).toBeVisible();
  });
});
```

---

## 📊 Test Coverage

### Ver Coverage Report

```bash
npm run test:coverage
```

Esto genera un reporte en:
- `coverage/index.html` - Reporte HTML interactivo
- `coverage/lcov.info` - Para integración con CI/CD

### Objetivos de Coverage

| Categoría | Objetivo | Actual |
|-----------|----------|--------|
| Líneas | 80% | - |
| Funciones | 80% | - |
| Branches | 75% | - |
| Statements | 80% | - |

---

## 🎯 Best Practices

### 1. Naming Conventions

**Tests:**
```typescript
// ✅ Bueno: Descriptivo y específico
it('should calculate activos promedio correctly')

// ❌ Malo: Genérico
it('works')
```

**Archivos:**
```
✅ kpi-calculator.test.ts
✅ kpi-card.test.tsx
❌ test.ts
❌ mytest.tsx
```

### 2. Usar Mock Data

Siempre usa los helpers de mock data:

```typescript
import { mockPlantilla, createMockEmpleado, createMockKPI } from '@/test/mockData';

// ✅ Usar mock data
const kpi = createMockKPI({ name: 'Activos', value: 75 });

// ❌ Crear data manualmente cada vez
const kpi = {
  name: 'Activos',
  category: 'headcount',
  value: 75,
  // ... muchos campos más
};
```

### 3. Testing Library Best Practices

```typescript
// ✅ Query por texto visible al usuario
screen.getByText('Activos');
screen.getByRole('button', { name: 'Filtros' });

// ❌ Query por clase o ID (frágil)
container.querySelector('.kpi-card');
```

### 4. Arrange-Act-Assert Pattern

```typescript
it('should update when filter changes', () => {
  // Arrange: Setup inicial
  const mockKPI = createMockKPI({ value: 75 });

  // Act: Ejecutar acción
  renderWithProviders(<KPICard kpi={mockKPI} />);

  // Assert: Verificar resultado
  expect(screen.getByText('75')).toBeInTheDocument();
});
```

### 5. Evitar Flaky Tests

```typescript
// ✅ Usar waitFor para operaciones asíncronas
await waitFor(() => {
  expect(screen.getByText('Cargando...')).not.toBeInTheDocument();
});

// ❌ Usar timeouts fijos
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 6. Limpiar Después de Tests

```typescript
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks(); // Limpiar mocks
  // El cleanup de React Testing Library es automático
});
```

---

## 🔧 Debugging Tests

### Vitest UI

```bash
npm run test:ui
```

Abre una interfaz web interactiva donde puedes:
- Ver todos los tests
- Ejecutar tests individuales
- Ver coverage en tiempo real
- Debug paso a paso

### Playwright Debug

```bash
npm run test:e2e:debug
```

Abre Playwright Inspector para:
- Ejecutar tests paso a paso
- Inspeccionar elementos
- Ver screenshots
- Modificar selectores en tiempo real

### Console Logs

```typescript
import { screen, debug } from '@testing-library/react';

// Imprimir el DOM actual
screen.debug();

// Imprimir un elemento específico
const element = screen.getByText('Activos');
debug(element);
```

---

## 🎨 Testing en VSCode

### Extensiones Recomendadas

1. **Vitest** - Testing inline en editor
2. **Playwright Test for VSCode** - Ejecutar E2E desde editor
3. **Coverage Gutters** - Ver coverage en el código

### Shortcuts

- `Ctrl/Cmd + Shift + P` → "Vitest: Run All Tests"
- `Ctrl/Cmd + Shift + P` → "Playwright: Show browser"

---

## 📚 Estructura de Archivos

```
apps/web/
├── src/
│   ├── lib/
│   │   └── __tests__/          # Tests de funciones
│   │       └── kpi-calculator.test.ts
│   ├── components/
│   │   └── __tests__/          # Tests de componentes
│   │       └── kpi-card.test.tsx
│   └── test/
│       ├── setup.ts            # Configuración global
│       ├── mockData.ts         # Mock data helpers
│       └── utils.tsx           # Test utilities
├── e2e/
│   └── dashboard.spec.ts       # Tests E2E
├── vitest.config.ts            # Config Vitest
├── playwright.config.ts        # Config Playwright
└── TESTING.md                  # Esta guía
```

---

## 🚨 CI/CD Integration

### GitHub Actions (Ejemplo)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run test:coverage
      - run: npm run playwright:install
      - run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📞 Ayuda y Recursos

### Documentación

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
- [Test Coverage Guide](../tabs/TEST_COVERAGE_EXHAUSTIVO.md)

### Comandos Útiles

```bash
# Ver todos los scripts disponibles
npm run

# Limpiar cache de Vitest
npx vitest --clearCache

# Actualizar snapshots
npm test -- -u

# Ejecutar un test específico
npm test -- kpi-calculator

# Watch mode solo para un archivo
npm test -- --watch kpi-calculator
```

---

**¡Happy Testing! 🎉**
