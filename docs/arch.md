# Como Funciona la App MRM - Guia Completa

> **Audiencia:** Desarrolladores que necesitan entender el proyecto de cero.
> **Ultima actualizacion:** Marzo 2026

---

## 1. Que es MRM?

Es un **Dashboard de KPIs de Recursos Humanos**. Sirve para que el area de RH vea metricas como:
- Cuantos empleados hay activos
- Cuantos se fueron (bajas/rotacion)
- Incidencias (faltas, vacaciones, permisos, etc.)
- Tendencias y comparaciones mes a mes

Los datos vienen de archivos Excel que se suben por **SFTP** y se guardan en **Supabase** (PostgreSQL).

---

## 2. Stack Tecnologico

| Capa | Tecnologia | Para que |
|------|-----------|----------|
| Frontend | Next.js 14 (App Router) | La app web |
| UI | shadcn/ui + Tailwind CSS | Componentes y estilos |
| Graficas | Recharts | Visualizaciones |
| Base de datos | Supabase (PostgreSQL) | Almacenamiento + Auth |
| Auth | Supabase Auth + Middleware | Login + roles (admin/user) |
| AI | Google Gemini | Narrativas inteligentes de los KPIs |
| Ingestion | SFTP + Excel parsing | Importar datos de RH |

---

## 3. Estructura del Monorepo

```
mrm/
├── apps/
│   └── web/                          # <-- TODA la app vive aqui
│       ├── src/
│       │   ├── app/                   # Rutas (Next.js App Router)
│       │   ├── components/            # Componentes React
│       │   ├── hooks/                 # Custom hooks (logica de estado)
│       │   ├── lib/                   # Logica de negocio
│       │   ├── context/               # React Context
│       │   └── test/                  # Mock data para tests
│       ├── e2e/                       # Tests end-to-end (Playwright)
│       └── tests/                     # Tests unitarios (Vitest)
│
├── packages/
│   └── shared/                        # Tipos TypeScript compartidos
│       └── src/types.ts
│
├── docs/                              # Documentacion
└── package.json                       # Workspaces (monorepo root)
```

---

## 4. Flujo de Datos (de principio a fin)

Este es el camino que sigue la informacion desde los archivos Excel hasta que el usuario ve un numero en pantalla:

```
                    ┌─────────────────────┐
                    │   Archivos Excel    │
                    │   (Servidor SFTP)   │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   API de Importacion │  POST /api/import-sftp-real-data
                    │   (sftp-client.ts)   │  Parsea Excel, limpia datos
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   Supabase (DB)      │  4 tablas principales:
                    │   PostgreSQL         │  empleados_sftp, motivos_baja,
                    │                      │  incidencias, prenomina_horizontal
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   supabase.ts        │  db.getEmpleadosSFTP()
                    │   (capa de datos)    │  db.getIncidenciasCSV()
                    │                      │  db.getMotivosBaja()
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   use-dashboard-data │  Hook que carga TODO
                    │   (hook principal)   │  al iniciar el dashboard
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼──────┐ ┌──────▼─────────┐
    │ use-plantilla  │ │ use-       │ │ kpi-calculator  │
    │ -filters       │ │ retention  │ │                 │
    │ (4 variantes)  │ │ -kpis      │ │ Calcula KPIs   │
    └─────────┬──────┘ └─────┬──────┘ └──────┬─────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼───────────┐
                    │   dashboard-page    │  Componente principal
                    │   + Tabs            │  que orquesta todo
                    └─────────┬───────────┘
                              │
           ┌──────────┬───────┼────────┬──────────┐
           │          │       │        │          │
      ┌────▼───┐ ┌───▼──┐ ┌──▼───┐ ┌──▼────┐
      │Resumen │ │Perso-│ │Inci- │ │Rota-  │
      │  Tab   │ │nal   │ │denci-│ │cion   │
      │        │ │Tab   │ │as Tab│ │Tab    │
      └────────┘ └──────┘ └──────┘ └───────┘
```

---

## 5. Las 4 Tablas Principales de la DB

Estos son los datos crudos que alimentan todo:

| Tabla | Registros | Que guarda | Ejemplo |
|-------|-----------|------------|---------|
| `empleados_sftp` | ~1,051 | Datos maestros de cada empleado | Nombre, puesto, depto, fecha_ingreso, fecha_baja, activo |
| `motivos_baja` | ~676 | Historial de bajas (terminaciones) | Empleado #123 se fue el 2025-03-15 por "Baja Voluntaria" |
| `incidencias` | ~8,880 | Registro diario de incidencias | Empleado #456 tuvo "VAC" (vacaciones) el 2025-06-10 |
| `prenomina_horizontal` | ~374 | Horas trabajadas por semana | Empleado #789: lun=8h, mar=8h, mie=10h (2h extras)... |

**Relacion entre tablas:**
- `motivos_baja.numero_empleado` → `empleados_sftp.numero_empleado`
- `incidencias.emp` → `empleados_sftp.numero_empleado`
- `prenomina_horizontal.numero_empleado` → `empleados_sftp.numero_empleado`

---

## 6. Paginas/Rutas de la App

| Ruta | Archivo | Que hace | Acceso |
|------|---------|----------|--------|
| `/` | `app/page.tsx` | Dashboard principal con 4 tabs | Autenticado |
| `/login` | `app/login/page.tsx` | Pantalla de login | Publico |
| `/admin` | `app/admin/page.tsx` | Panel de importacion SFTP y usuarios | Solo admin |
| `/setup` | `app/setup/page.tsx` | Setup inicial | Publico |
| `/perfil/cambiar-contrasena` | `app/perfil/...` | Cambio de password | Autenticado |

**API Routes importantes:**

| Ruta API | Que hace |
|----------|----------|
| `POST /api/import-sftp-real-data` | Importa archivos Excel desde SFTP a la DB |
| `POST /api/import-real-sftp-force` | Importacion forzada (sin verificar estructura) |
| `GET /api/sftp` | Lista archivos en el servidor SFTP |
| `POST /api/sftp/approve` | Aprobar cambios estructurales en archivos |
| `POST /api/narrative` | Genera narrativa AI con Gemini |
| `GET /api/kpis` | Calcula y retorna KPIs |
| `POST /api/cron/sync-sftp` | Sincronizacion automatica programada |

---

## 7. Autenticacion y Seguridad

```
Usuario entra a /
       │
       ▼
middleware.ts intercepta TODAS las requests
       │
       ├── Es ruta publica (/login, /api/)? → Deja pasar
       │
       ├── No tiene sesion? → Redirect a /login
       │
       ├── Es /admin? → Verifica que sea admin (role='admin' o admin@mrm.com)
       │
       └── Todo bien → Deja pasar
```

**Archivos clave:**
- `middleware.ts` - Intercepta requests, verifica auth
- `lib/supabase.ts` - Cliente browser (con RLS)
- `lib/supabase-server.ts` - Cliente server-side
- `lib/supabase-admin.ts` - Cliente con service_role (bypasa RLS)
- `hooks/use-auth.ts` - Hook de autenticacion en componentes

---

## 8. Los 4 Tabs del Dashboard (detallados)

### Tab 1: Resumen
**Componente:** `components/resumen/summary-comparison.tsx`
**Que muestra:** KPIs generales del mes + comparacion con mes anterior
**Datos que usa:** `plantillaFiltered` (scope: mes especifico)
**KPIs:** Activos, Bajas, Rotacion Mensual, Incidencias

### Tab 2: Personal
**Componente:** `components/personal/personal-tab.tsx`
**Que muestra:** Demografia de empleados (edad, genero, antiguedad)
**Datos que usa:** `plantillaFiltered` (scope: mes especifico)
**Tablas:** `age-gender-table.tsx`, `seniority-gender-table.tsx`

### Tab 3: Incidencias
**Componente:** `components/incidencias/incidents-tab.tsx`
**Que muestra:** Analisis de asistencia (faltas, vacaciones, permisos)
**Datos que usa:** `plantillaFilteredYearScope` (scope: todo el ano)
**Tabla:** `absenteeism-table.tsx`

### Tab 4: Rotacion
**Componente:** `components/rotacion/rotacion-tab.tsx`
**Que muestra:** Analisis de rotacion de personal (quien se va y por que)
**Datos que usa:** `plantillaRotacionYearScope` (scope: ano con inactivos)
**Sub-componentes:** 8 tablas de rotacion + heatmap + charts

---

## 9. Sistema de Filtros (pieza clave)

Los filtros son una de las partes mas complejas. Hay **4 variantes** porque cada tab necesita datos diferentes:

| Variante | Nombre en codigo | Incluye | Usa |
|----------|-----------------|---------|-----|
| `specific` | `plantillaFiltered` | Solo activos del mes+ano | Tab Resumen, Personal |
| `year` | `plantillaFilteredYearScope` | Activos del ano (sin mes) | Tab Incidencias |
| `year-only` | `plantillaRotacionYearScope` | Todos del ano (con bajas) | Tab Rotacion |
| `general` | `plantillaFilteredGeneral` | Todos sin filtro temporal | Historicos |

**Filtros disponibles para el usuario:**
- Empresa
- Area
- Departamento
- Puesto
- Clasificacion
- Ubicacion

**Archivos:**
- `lib/filters/core/filter-engine.ts` → Motor de filtrado (la logica pura)
- `hooks/use-plantilla-filters.ts` → Hook que aplica las 4 variantes
- `components/shared/filter-panel.tsx` → UI de filtros

---

## 10. Sistema de KPIs (como se calculan los numeros)

### Formulas principales:

```
Activos = empleados con fecha_baja = NULL (o fecha_baja > hoy)

Activos Promedio = (Activos al inicio del mes + Activos al fin del mes) / 2

Bajas del mes = empleados cuya fecha_baja cae en el mes seleccionado

Rotacion Mensual = (Bajas del mes / Activos Promedio) × 100

Rotacion Voluntaria = bajas donde isMotivoClave = false (renuncia, abandono, etc.)
Rotacion Involuntaria = bajas donde isMotivoClave = true (rescision, termino contrato)
```

**Archivos clave:**
- `lib/utils/kpi-helpers.ts` → **ARCHIVO MAS IMPORTANTE** - todas las formulas de calculo
  - `calculateActivosPromedio()` - Promedio de activos
  - `calcularRotacionConDesglose()` - Rotacion mensual (vol/invol)
  - `calcularRotacionAcumulada12mConDesglose()` - Rotacion 12 meses rolling
  - `calcularRotacionYTDConDesglose()` - Rotacion year-to-date
- `lib/kpi-calculator.ts` → Orquesta los calculos usando las funciones de arriba
- `hooks/use-retention-kpis.ts` → Hook que conecta formulas con el dashboard
- `lib/normalizers.ts` → Clasifica motivos de baja (voluntaria vs involuntaria)

---

## 11. Normalizers: Limpieza de Datos Sucios

Los datos del SFTP vienen con encoding corrupto (acentos rotos). El archivo `normalizers.ts` arregla eso:

```
Dato crudo del Excel:    "Otra raz?n"
Despues de normalizar:   "Otra razon"  (para comparar)
Display al usuario:      "Otra razón"  (bonito)
```

**Funciones principales:**
- `normalizeMotivo(raw)` → Limpia y mapea motivos de baja
- `isMotivoClave(raw)` → `true` si es baja involuntaria (rescision/termino)
- `normalizeDepartamento(raw)` → Limpia nombres de departamentos
- `normalizeArea(raw)` → Limpia nombres de areas

---

## 12. AI / Narrativas Inteligentes

La app usa **Google Gemini** para generar resumen en lenguaje natural de los KPIs.

```
KPIs calculados → gemini-ai.ts → "La rotacion subio 3% este mes,
                                    principalmente por bajas voluntarias
                                    en el area de produccion..."
```

**Archivos:**
- `lib/gemini-ai.ts` → Cliente de Google Gemini
- `lib/ai-analyzer.ts` → Prepara los datos para el prompt
- `components/shared/smart-narrative.tsx` → Componente que muestra la narrativa
- `app/api/narrative/route.ts` → API route que ejecuta el analisis

---

## 13. SFTP: Como entran los datos

```
Servidor SFTP (archivos Excel)
       │
       ▼
Admin va a /admin y hace click en "Importar"
       │
       ▼
sftp-client.ts se conecta al servidor SFTP
       │
       ▼
sftp-structure-comparator.ts compara estructura
       │
       ├── Cambio en columnas? → Pide aprobacion al admin
       │
       └── Sin cambios? → Importa automaticamente
              │
              ▼
       import-sftp-real-data/route.ts
       parsea Excel → INSERT/UPSERT en Supabase
              │
              ▼
       Tablas actualizadas (empleados, motivos, incidencias, prenomina)
```

**Archivos:**
- `lib/sftp-client.ts` → Conexion SFTP
- `lib/sftp-importer.ts` → Logica de importacion
- `lib/sftp-structure-comparator.ts` → Detecta cambios en columnas
- `app/api/import-sftp-real-data/route.ts` → API que ejecuta la importacion
- `components/admin/sftp-import-admin.tsx` → UI del admin

---

## 14. Los 3 Hooks Principales (el corazon del frontend)

| Hook | Archivo | Responsabilidad |
|------|---------|-----------------|
| `useDashboardData` | `hooks/use-dashboard-data.ts` | Carga TODOS los datos de Supabase al iniciar. Retorna: plantilla, bajasData, incidenciasData |
| `usePlantillaFilters` | `hooks/use-plantilla-filters.ts` | Toma los datos crudos + filtros del usuario → produce las 4 variantes filtradas |
| `useRetentionKPIs` | `hooks/use-retention-kpis.ts` | Toma datos filtrados → calcula TODOS los KPIs de rotacion (mensual, acumulada, YTD, variaciones) |

**Flujo:**
```
useDashboardData (carga datos)
       │
       ▼
usePlantillaFilters (filtra segun seleccion del usuario)
       │
       ▼
useRetentionKPIs (calcula metricas)
       │
       ▼
Componentes de cada Tab (muestran resultados)
```

---

## 15. Componentes Compartidos

| Componente | Archivo | Que hace |
|------------|---------|----------|
| `KPICard` | `shared/kpi-card.tsx` | Tarjeta individual de KPI (valor + variacion + icono) |
| `SmartNarrative` | `shared/smart-narrative.tsx` | Narrativa AI generada por Gemini |
| `FilterPanel` | `shared/filter-panel.tsx` | Panel de filtros (empresa, area, depto, etc.) |
| `VisualizationContainer` | `shared/visualization-container.tsx` | Wrapper con fullscreen + export para graficas |
| `ErrorBoundary` | `shared/error-boundary.tsx` | Captura errores de React |
| `UserMenu` | `shared/user-menu.tsx` | Menu del usuario (perfil, logout) |
| `ThemeToggle` | `shared/theme-toggle.tsx` | Switch dark/light mode |

---

## 16. Comandos Utiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Build de produccion
npm run lint         # Revisar codigo con ESLint
npm run type-check   # Verificar tipos TypeScript

# Tests
npm test                    # Tests en modo watch
npm run test:run            # Correr todos los tests una vez
npm run test:coverage       # Tests con reporte de cobertura
npm run test:e2e            # Tests end-to-end
```

---

## 17. Bug Conocido Importante: Timezones

**NUNCA** uses `new Date("2025-12-01")` para parsear fechas de la DB.

```typescript
// MAL - puede dar mes equivocado por timezone
const fecha = new Date("2025-12-01");
fecha.getMonth(); // Puede dar 10 (noviembre!) en vez de 11 (diciembre)

// BIEN - parsear el string directamente
const [year, month, day] = "2025-12-01".split('-');
const mes = parseInt(month, 10) - 1; // 11 = diciembre (0-indexed)
```

Esto pasa porque `new Date("2025-12-01")` crea la fecha en UTC medianoche, y en Mexico (UTC-6) eso es 30 nov a las 6pm.

---

## 18. Resumen Visual: Donde vive cada cosa

```
¿Necesitas...?                    → Ve a este archivo:
─────────────────────────────────────────────────────────
Formulas de KPIs                  → lib/utils/kpi-helpers.ts
Carga de datos de Supabase        → lib/supabase.ts
Filtros del dashboard             → lib/filters/core/filter-engine.ts
Clasificar motivos de baja        → lib/normalizers.ts
Logica de importacion SFTP        → lib/sftp-client.ts + sftp-importer.ts
Dashboard principal               → components/dashboard-page.tsx
Tab de rotacion                   → components/rotacion/rotacion-tab.tsx
Tab de incidencias                → components/incidencias/incidents-tab.tsx
Tab de personal                   → components/personal/personal-tab.tsx
Tab de resumen                    → components/resumen/summary-comparison.tsx
Auth/middleware                   → middleware.ts
AI narrativas                     → lib/gemini-ai.ts + lib/ai-analyzer.ts
Tipos compartidos                 → packages/shared/src/types.ts
Tipos de registros DB             → lib/types/records.ts
```

---

## 19. Diagrama de Dependencias Simplificado

```
                    Supabase (PostgreSQL)
                         │
                    supabase.ts (capa de datos)
                         │
                  use-dashboard-data.ts (carga todo)
                    │         │         │
              plantilla   bajasData   incidenciasData
                    │         │         │
              use-plantilla-filters.ts (filtra)
                    │
         ┌─────────┼─────────┬──────────┐
         │         │         │          │
    plantilla  plantilla  plantilla  plantilla
    Filtered   YearScope  RotYear    General
         │         │         │          │
         │    use-retention-kpis.ts     │
         │         │                    │
         ▼         ▼                    ▼
    ┌─────────────────────────────────────┐
    │         dashboard-page.tsx          │
    │    ┌────┬────┬────┬────────┐       │
    │    │Res │Pers│Inci│Rotacion│       │
    │    │umen│onal│den │        │       │
    │    └────┴────┴────┴────────┘       │
    └─────────────────────────────────────┘
```
