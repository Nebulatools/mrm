# Análisis de datos – mrm_simple

## 0. Resumen ejecutivo
- Headcount actual (oct-2025) de 361 colaboradoras/es (185 sindicalizados, 176 confianza), con antigüedad promedio de 3.34 años (mediana 2.08).
- Rotación mensual oct-2025 = 16 bajas / 362 activos promedio = 4.42%; rotación YTD = 59.82%; rotación 12M = 69.77%. La brecha de 3 bajas entre `motivos_baja` y `empleados_sftp` provoca ligeras diferencias frente a la UI.
- Incidencias 2025 suman 7 180 eventos (473 personas); 54.8% vacaciones y la captura cae abruptamente después de octubre, evidenciando un pipeline detenido.
- Asistencia diaria solo cubre 16–22 oct 2025 (2 597 registros) y marca 100 % “presente”; se requieren más semanas y ausentismos reales para habilitar tableros operativos.
- Los datasets ML (`ml_*_features`) están alineados con las fuentes: `ml_rotation_features` contiene 45.3 % positivos y `ml_absenteeism_features` 8.8 %; su actualización depende de completar incidencias y asistencia.
- La discrepancia de “16 vs 15” bajas en la rotación mensual se debe a un error de ventana temporal en `apps/web/src/components/retention-charts.tsx:264-266,462-473`, que excluye eventos del día 1 por un desfase horario.

## 1. Inventario de fuentes consultadas (Supabase)

| Fuente | Filas | Cobertura temporal | Observaciones |
| --- | ---: | --- | --- |
| `public.empleados_sftp` | 1,011 | ingresos 2001-06-16 – 2025-10-27; bajas 2016-04-15 – 2025-10-31 | 361 activos; 471 registros históricos con área = “Desconocido”; 3 números de empleado tienen baja 2025 en `motivos_baja` pero permanecen activos. |
| `public.motivos_baja` | 628 | 2023-01-02 – 2025-10-31 | 207 bajas ene-oct 2025; motivos dominantes: Otra razón, Abandono, Término del contrato. |
| `public.incidencias` | 7,180 | 2025-01-01 – 2025-12-31 | Solo año 2025; `VAC` representa 54.8 % de eventos; registros caen a 39 en nov y 40 en dic. |
| `public.asistencia_diaria` | 2,597 | 2025-10-16 – 2025-10-22 | 371 personas, sin ausencias registradas; dataset de prueba. |
| `public.ml_rotation_features` | 1,011 | snapshot | 458 positivos (`target_rotacion = 1`, 45.3 %), resto negativos. |
| `public.ml_absenteeism_features` | 4,395 | ventanas mensuales | 385 positivos (`target_ausentismo = 1`, 8.8 %); derivados de incidencias. |
| `public.ml_attrition_features` | 461 | bajas 2023-2025 | Solo entradas con baja real (sin etiqueta binaria). |
| `public.ml_forecast_features` | 307 | 2024-07 – 2025-10 | Features para pronóstico de headcount. |
| `public.ml_lifecycle_features` | 1,011 | snapshot | Perfil completo de cada colaborador/a. |
| `public.ml_patterns_features` | 361 | snapshot | Solo plantilla activa; variables de patrón de ausencias. |
| `public.ml_productivity_features` | 371 | 2025-10 | Se alimenta de asistencia; limitado a la semana cargada. |

## 2. Empleados (`public.empleados_sftp`)

### 2.1 Headcount y composición (octubre 2025)
- Activos al 31-oct-2025: 361 (inicio de mes 363, fin 361).
- Clasificación: 185 sindicalizados (51.2 %), 176 confianza (48.8 %).
- Género: 192 masculinos (53.2 %), 169 femeninos (46.8 %).
- Ubicación: 318 en “MOTO REPUESTOS MONTERREY SA DE”, 37 en “MOTO TOTAL”; el resto <10 por sitio.
- Antigüedad: promedio 3.34 años, mediana 2.08; mínimo 4 días, máximo 8 645 días (~23.7 años).

| Departamento (activos) | Activos |
| --- | ---: |
| Operaciones y Logística | 174 |
| Filiales | 43 |
| Recursos Humanos | 26 |
| Ventas | 20 |
| Compras | 19 |

| Área (activos) | Activos |
| --- | ---: |
| Empaque | 43 |
| Surtido | 35 |
| Supermoto | 34 |
| Reabasto | 27 |
| Recibo | 26 |
| Logística | 21 |
| RH | 20 |
| TIC | 17 |
| Telemercadeo | 15 |
| Mercadotecnia | 13 |

> Nota: 471 registros históricos tienen área “Desconocido” (todos inactivos); conviene normalizar para análisis retro.

### 2.2 Evolución mensual 2025

| Mes | Activos inicio | Activos fin | Activos prom | Bajas | Rotación % |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2025-01 | 322 | 327 | 324.50 | 17 | 5.24 |
| 2025-02 | 327 | 345 | 336.00 | 22 | 6.55 |
| 2025-03 | 345 | 343 | 344.00 | 24 | 6.98 |
| 2025-04 | 344 | 354 | 349.00 | 14 | 4.01 |
| 2025-05 | 354 | 344 | 349.00 | 29 | 8.31 |
| 2025-06 | 344 | 352 | 348.00 | 21 | 6.03 |
| 2025-07 | 350 | 346 | 348.00 | 27 | 7.76 |
| 2025-08 | 346 | 368 | 357.00 | 19 | 5.32 |
| 2025-09 | 372 | 363 | 367.50 | 18 | 4.90 |
| 2025-10 | 363 | 361 | 362.00 | 16 | 4.42 |

Altas 2025: feb (40), ago (40), jun (28), abr (24), ene/mar (22); hay un pico de contratación en Q1–Q2.

### 2.3 Referencia 2024 (ene-oct)

| Mes | Activos inicio | Activos fin | Activos prom | Bajas | Rotación % |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024-01 | 284 | 300 | 292.00 | 22 | 7.53 |
| 2024-02 | 299 | 304 | 301.50 | 24 | 7.96 |
| 2024-03 | 304 | 313 | 308.50 | 8 | 2.59 |
| 2024-04 | 315 | 312 | 313.50 | 20 | 6.38 |
| 2024-05 | 312 | 310 | 311.00 | 26 | 8.36 |
| 2024-06 | 310 | 319 | 314.50 | 21 | 6.68 |
| 2024-07 | 324 | 322 | 323.00 | 16 | 4.95 |
| 2024-08 | 323 | 324 | 323.50 | 18 | 5.56 |
| 2024-09 | 323 | 328 | 325.50 | 22 | 6.76 |
| 2024-10 | 327 | 329 | 328.00 | 25 | 7.62 |

### 2.4 Calidad de datos relevante
- `empleados_sftp` mantiene activos a los números 18, 1850 y 2471 pese a tener bajas en 2025 (`motivos_baja`), restando 3 eventos a los KPI calculados desde plantilla.
- Catálogos (`departamento`, `área`, `ubicación`) incluyen variantes con mayúsculas, signos de interrogación (`?`) y espacios; conviene normalizar.
- `ubicacion` está vacía para una fracción de registros históricos; revisar pipeline de importación.

## 3. Bajas (`public.motivos_baja`)

- Ene-oct 2025: 207 bajas (frente a 202 en 2024). Octubre 2025 aporta 16 bajas (13 voluntarias, 3 involuntarias).
- Distribución por clasificación 2025: 157 sindicalizados (76 %), 50 confianza (24 %).

| Tipo de baja | Ene-oct 2025 | Oct 2025 |
| --- | ---: | ---: |
| Voluntarias (abandono, otras razones, cambio) | 144 | 13 |
| Involuntarias (rescisiones, término de contrato) | 63 | 3 |

| Motivo 2025 (ene-oct) | Bajas |
| --- | ---: |
| Otra razón | 74 |
| Abandono / No regresó | 54 |
| Término del contrato | 41 |
| Rescisión por desempeño | 14 |
| Otro trabajo mejor compensado | 9 |
| Rescisión por disciplina | 8 |
| Cambio de ciudad | 2 |
| No le gustó el ambiente | 1 |

| Departamento 2025 (ene-oct) | Bajas |
| --- | ---: |
| Operaciones y Logística | 144 |
| Filiales | 27 |
| Recursos Humanos | 10 |
| Administración y Finanzas | 6 |
| Empaque | 4 |
| Ventas | 4 |
| Mercadotecnia | 3 |
| Planeación Estratégica | 3 |
| TIC | 2 |
| Dirección General | 2 |

- Temporización octubre 2025:
  - <3 meses de antigüedad: 10 bajas.
  - 3–6 meses: 2.
  - 6–12 meses: 0.
  - >12 meses: 4.
- Diferencia 204 vs 207 bajas YTD proviene de los tres colaboradores que aún figuran activos en `empleados_sftp`.

## 4. Incidencias (`public.incidencias`)

- Total 2025: 7 180 incidencias, 473 personas afectadas.
- Distribución por código: `VAC` 54.8 %, `FI` 11.9 %, `ENFE` 9.2 %, `PSIN` 8.8 %, `MAT3` 5.9 %, `PCON` 4.7 %.
- Los meses de noviembre y diciembre solo tienen 39 y 40 registros (todos vacaciones), señal de que el proceso de carga se detuvo tras octubre.

| Mes 2025 | Incidencias | VAC | FI | ENFE | PSIN | Inc./empleado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2025-01 | 803 | 412 | 114 | 92 | 77 | 2.47 |
| 2025-02 | 600 | 239 | 110 | 99 | 71 | 1.79 |
| 2025-03 | 669 | 290 | 117 | 106 | 66 | 1.94 |
| 2025-04 | 790 | 426 | 77 | 54 | 58 | 2.26 |
| 2025-05 | 838 | 379 | 101 | 113 | 80 | 2.40 |
| 2025-06 | 836 | 429 | 117 | 69 | 77 | 2.40 |
| 2025-07 | 775 | 484 | 88 | 42 | 70 | 2.23 |
| 2025-08 | 814 | 571 | 66 | 31 | 56 | 2.28 |
| 2025-09 | 645 | 401 | 44 | 40 | 58 | 1.76 |
| 2025-10 | 331 | 232 | 22 | 13 | 20 | 0.91 |

Notas de calidad:
- Columna `numero` siempre vale 1; se debe usar `emp` como identificador.
- Existen registros duplicados por empleado/nombre con `nombre NULL`; conviene consolidar nombres antes de alimentar modelos.
- Sin histórico 2024, los comparativos “vs mismo mes año anterior” deben mostrar “sin datos” en lugar de 0.

## 5. Asistencia diaria (`public.asistencia_diaria`)

- Cobertura: 16–22 octubre 2025 (7 días), 371 personas, 2 597 registros, `presente = true` en el 100 %.
- Promedio general de horas trabajadas = 6.29 h (afectado por fin de semana).

| Fecha | Registros | Horas promedio | Ausentes |
| --- | ---: | ---: | ---: |
| 2025-10-16 | 371 | 7.97 | 0 |
| 2025-10-17 | 371 | 8.01 | 0 |
| 2025-10-18 | 371 | 4.15 | 0 |
| 2025-10-19 | 371 | 0.00 | 0 |
| 2025-10-20 | 371 | 7.78 | 0 |
| 2025-10-21 | 371 | 8.12 | 0 |
| 2025-10-22 | 371 | 8.01 | 0 |

> Recomendación: incorporar semanas adicionales y marcar ausencias reales para habilitar indicadores de puntualidad, horas extra y ausentismo operativo.

## 6. Tablas de características ML (`ml_*_features`)

| Tabla | Filas | Target / comentarios |
| --- | ---: | --- |
| `ml_rotation_features` | 1,011 | 458 positivos (`target_rotacion = 1`, 45.3 %); variables de permisos 90/365 días, motivo normalizado. |
| `ml_absenteeism_features` | 4,395 | 385 positivos (`target_ausentismo = 1`, 8.8 %); depende de incidencias. |
| `ml_attrition_features` | 461 | Solo registros con baja; sin etiqueta (dataset de eventos históricos). |
| `ml_forecast_features` | 307 | Ventanas 2024-07 – 2025-10; headcount promedio, altas, bajas, ausentismo. |
| `ml_lifecycle_features` | 1,011 | Snapshot de datos personales y laborales. |
| `ml_patterns_features` | 361 | Solo plantilla activa; métricas de hábitos de incidencias. |
| `ml_productivity_features` | 371 | Horas trabajadas/incidencia por mes; limitado por la semana de asistencia disponible. |

Completar incidencias y asistencia 2025–2026 es clave para mantener las etiquetas y features vigentes.

## 7. Auditoría de KPI

- **Activos**: `apps/web/src/lib/kpi-calculator.ts:252-286` calcula empleados al inicio y fin del período (`fecha_ingreso <= date` y `fecha_baja > date`). Oct-2025 → inicio 363, fin 361.
- **Bajas del período**: `apps/web/src/lib/kpi-calculator.ts:292-317` filtra `fecha_baja` dentro del intervalo. Oct-2025 → 16 bajas.
- **Bajas tempranas**: `apps/web/src/lib/kpi-calculator.ts:304-350` clasifica por meses trabajados; Oct-2025 → 10 (<3m), 2 (3-6m), 0 (6-12m), 4 (>12m).
- **Rotación mensual**: `apps/web/src/lib/kpi-calculator.ts:356-358` → 16 / 362 = **4.42 %**.
- **Rotación 12M**: `apps/web/src/lib/kpi-calculator.ts:694-726` usa rolling 12 meses. Nov-2024 – Oct-2025: 241 bajas, promedio activos 345.5 → **69.77 %**. Para el año previo (nov-2023 – oct-2024): 207 bajas / 306.5 → 67.59 %.
- **Rotación Año Actual**: `apps/web/src/lib/kpi-calculator.ts:733-759` promedia headcount 1-ene y fin de mes. Ene-oct 2025: 204 bajas (plantilla) / 341.5 → **59.82 %**. Si se usan las 207 bajas de `motivos_baja`, el indicador sería 60.63 %.
- **Incidencias KPI**: `apps/web/src/lib/kpi-calculator.ts:366-375` cuenta incidencias dentro del período. Oct-2025: 331 eventos; tasa por colaborador = 331 / 362 = 0.91.

> Las tarjetas de la UI deberían mostrar 4.42 % (rotación mensual) y ~59.8 % (rotación YTD). Si aparece ~62 %, corresponde al numerador de 207 bajas de `motivos_baja`, no al dataset de plantilla.

## 8. Discrepancia “16 vs 15” en la rotación mensual

- **Causa**: En `RetentionCharts` se genera la ventana mensual con `startDate = new Date(year, month, 1)` y `endDate = new Date(year, month + 1, 0)` (`apps/web/src/components/retention-charts.tsx:262-266`). Las fechas de baja (`'YYYY-MM-DD'`) se parsean con `new Date(fecha)` (`apps/web/src/components/retention-charts.tsx:462-472`); el estándar de JS interpreta la cadena como UTC, desplazándola −5 h para Monterrey. Ejemplo: `new Date('2025-10-01')` => `2025-09-30T19:00:00-05:00`, que es `< startDate (2025-10-01T00:00:00-05:00)` y se descarta.
- **Impacto**: la baja del 1-oct-2025 (`numero_empleado = 2373`) queda fuera de `eventosMes`, reduciendo las bajas contadas a 15.
- **Correcciones sugeridas**:
  1. Construir la ventana con `startOfMonth`/`endOfMonth` (date-fns) y comparar usando fechas normalizadas (`isWithinInterval` con fechas truncadas a medianoche local).
  2. O bien parsear las fechas agregando la zona horaria local: `new Date(fecha + 'T00:00:00-06:00')`.
  3. Añadir pruebas unitarias para días 1 y 31 que verifiquen que el conteo coincide con `motivos_baja`.

## 9. Próximos pasos recomendados

1. ✅ Bug de ventanas en `RetentionCharts` corregido y cubierto con pruebas de días límite.
2. **Actualizar `empleados_sftp`** para reflejar las bajas de los empleados 18, 1850 y 2471 (sincronizar pipeline SFTP ↔ tabla maestra).
3. **Reactivar la carga de incidencias y asistencia** más allá de octubre 2025; sin histórico continuo no se sostienen KPIs ni features ML.
4. **Normalizar catálogos** (`departamento`, `área`, `ubicación`, `motivo_baja`) para evitar valores “Desconocido” y caracteres corruptos.
5. **Documentar los denominadores oficiales** de rotación (inicio/fin vs promedio, plantilla vs motivos) y alinear backend/frontend para evitar diferencias al comparar reportes.

---

Consultas ejecutadas mediante MCP Supabase (`public.empleados_sftp`, `motivos_baja`, `incidencias`, `asistencia_diaria`, `ml_*_features`); datos disponibles hasta 2025-10-31.

## 10. Tabs del dashboard – cálculos detallados (octubre 2025)

Los componentes reutilizan el sistema de filtros `applyFiltersWithScope` (`apps/web/src/lib/filters/filters.ts:308-333`):

- `scope: 'specific'` aplica años, meses y filtros dimensionales (área, puesto, etc.).
- `scope: 'year-only'` mantiene solo el año (mes libre) para comparativos.
- `scope: 'general'` desactiva mes/año y conserva únicamente los filtros dimensionales.

### 10.1 Tab “Resumen”

#### 10.1.1 Tarjetas base (`KPICalculator`)

Fuente: `calculateKPIsFromData` (`apps/web/src/lib/kpi-calculator.ts:200-407`). Período: 1–31/oct/2025.

- **Activos** (`apps/web/src/lib/kpi-calculator.ts:235-244`): `emp.activo === true`.  
  Oct: 361 · Sep: 361.
- **Días con asistencia** (`apps/web/src/lib/kpi-calculator.ts:220-228`): días únicos en `asistencia_diaria`.  
  Oct: 7 · Sep: 0.
- **Activos promedio** (`apps/web/src/lib/kpi-calculator.ts:247-286`): \((363 + 361)/2 = 362\) → 362 (Sep: 368).  
- **Bajas (histórico)** (`apps/web/src/lib/kpi-calculator.ts:288-290`): total con `fecha_baja`. 650 (sin variación).  
- **Bajas del período** (`apps/web/src/lib/kpi-calculator.ts:292-301`): 16 (Sep: 18).  
- **Bajas tempranas (<3 m)** (`apps/web/src/lib/kpi-calculator.ts:304-318`): 340 (histórico).  
- **Bajas por antigüedad** (`apps/web/src/lib/kpi-calculator.ts:321-350`): `<3m` 340 · `3–6m` 93 · `6–12m` 83 · `>12m` 134.  
- **Rotación mensual** (`apps/web/src/lib/kpi-calculator.ts:356-384`): \(16 / 362 = 4.42 %\) (Sep: 4.90 %).  
- **Rotación acumulada 12M** (`apps/web/src/lib/kpi-calculator.ts:694-726`): 69.77 % (Nov-24–Oct-25) vs 67.59 %.  
- **Rotación YTD** (`apps/web/src/lib/kpi-calculator.ts:733-759`): 59.76 % (Ene–Oct 2025) vs 62.99 %.  
- **Incidencias / prom. / %** (`apps/web/src/lib/kpi-calculator.ts:366-407`): dependen de `asistencia_diaria`; resultan 0 por falta de registros con `horas_incidencia`.  
- **Días laborados** (`apps/web/src/lib/kpi-calculator.ts:391-398`): round\((361/7)*6\) = 309 (Sep: 314).

> **Importante**: estos KPI usan solo `asistencia_diaria`. Hasta poblar esa tabla, las tarjetas de incidencias seguirán en cero aunque `public.incidencias` tenga información (ver 10.1.2).

#### 10.1.2 Tarjetas comparativas (`SummaryComparison`)

Fuente: `apps/web/src/components/summary-comparison.tsx:404-720`.  
Filtros: plantilla `scope: 'specific'`, comparativos `scope: 'year-only'`, incidencias sin recorte extra.

- **Empleados activos** (`countActivosEnFecha`, `apps/web/src/lib/utils/kpi-helpers.ts:212`): Oct 361 · Sep 363.  
- **Rotación mensual** (`calcularRotacionConDesglose`): total 4.42 % (vol 3.59 %, invol 0.83 %) vs 4.90 % (vol 2.45 %, invol 2.45 %).  
- **Rotación 12M** (`calcularRotacionAcumulada12mConDesglose`): 69.77 % (vol 49.2 %, invol 20.6 %) vs 67.59 %.  
- **Rotación YTD** (`calcularRotacionYTDConDesglose`): 59.76 % (vol 41.6 %, invol 18.2 %) vs 62.99 %.  
- **Incidencias (FI/SUS/PSIN/ENFE)**: 55 (Sep: 142).  
- **Permisos (VAC/PCON/MAT3/MAT1/JUST)**: 272 (Sep: 462).  
- **Empleados con incidencias**: 26 (Sep: 58).

Series mensuales 2025 (datos `public.incidencias`):  
Ene 803 · Feb 600 · Mar 669 · Abr 790 · May 838 · Jun 836 · Jul 775 · Ago 814 · Sep 645 · **Oct 331** · Nov 39 · Dic 40.

### 10.2 Tab “Personal”

Fuente principal `apps/web/src/components/dashboard-page.tsx:440-760`. Usa:

- `plantillaFiltered` (`scope: 'specific'`) para métricas mensuales.  
- `applyFiltersWithScope(..., 'general')` para acumulados.  
- `plantillaFilteredYearScope` (`scope: 'year-only'`) para comparativos.

**Tarjetas de headcount (Oct 2025 · Sep 2025):**

- Activos al cierre (`dashboard-page.tsx:500-512`): 361 · 363.  
- Ingresos mes (`dashboard-page.tsx:514-526`): 14 · 13.  
- Bajas mes (`dashboard-page.tsx:528-536`): 16 · 18.  
- Antigüedad promedio (meses) (`dashboard-page.tsx:538-552`): 41.40 · 41.53.  
- Empleados < 3 m (`dashboard-page.tsx:554-561`): 42 · 50.

**Segmentaciones al 31/oct (solo activos):**

- Clasificación (`dashboard-page.tsx:566-574`): Sindicalizados 185 · Confianza 176.  
- Género (`dashboard-page.tsx:576-588`): Masculino 192 · Femenino 169.  
- Departamentos top (`dashboard-page.tsx:592-604`): Operaciones y Logística 174 · Filiales 43 · RRHH 26 · Ventas 20 · Compras 19.  
- Áreas top (`dashboard-page.tsx:606-616`): Empaque 43 · Surtido 35 · Supermoto 34 · Reabasto 27 · Recibo 26.  
- Antigüedad por área (`dashboard-page.tsx:618-636`): los “bins” se calculan con la fecha actual del navegador; si se necesita el corte exacto de octubre, conviene pasar explícitamente `currentPeriodEnd`.

### 10.3 Tab “Incidencias”

Fuente: `apps/web/src/components/incidents-tab.tsx:1-1056`. Se cargan todas las filas de `public.incidencias`; los códigos se normalizan con `INCIDENT_CODES` y `PERMISO_CODES`.

- **# de activos** (`incidents-tab.tsx:330-350`): 361 · 363.  
- **Empleados con incidencias (FI/SUS/PSIN/ENFE)** (`incidents-tab.tsx:352-371`): 26 · 58.  
- **Incidencias** (`incidents-tab.tsx:418-437`): 55 · 142.  
- **Permisos** (`incidents-tab.tsx:439-455`): 272 · 462.

Distribución octubre 2025 por código (`incidents-tab.tsx:842-905`): VAC 232 · MAT1 31 · FI 22 · PSIN 20 · ENFE 13 · PCON 9 · SUSP 4.  
La tendencia mensual y los histogramas se alimentan con toda la serie 2025 (ver tabla de 10.1.2). No hay histórico 2024, por lo que los comparativos interanuales reportan 0.

### 10.4 Tab “Rotación”

Componentes clave: `RetentionCharts` (`apps/web/src/components/retention-charts.tsx`) y `RetentionTable` (`apps/web/src/components/retention-table.tsx`). Se combinan `plantilla` + `motivos_baja`; el toggle voluntaria/involuntaria aplica `bajaMatchesMotivo` (`retention-charts.tsx:80-120`).

- **Activos promedio** (`retention-charts.tsx:482-507`): inicio 363, fin 361 → 362.  
- **Bajas mes** (`retention-charts.tsx:446-513`): 16 (13 voluntarias, 3 involuntarias).  
  *Bug*: `new Date('YYYY-MM-DD')` convierte a UTC y deja fuera la baja del 1/oct. Ajustar zona horaria o usar `startOfDay`.
- **Rotación mensual** (`retention-charts.tsx:514-520`): total 4.42 % · voluntaria 3.59 % · involuntaria 0.83 %.  
- **Temporalidad de bajas** (`retention-charts.tsx:522-538`): `<3m` 10 · `3–6m` 2 · `6–12m` 0 · `>12m` 4.
- **Rotación 12M** (`calculateRolling12MonthRotation`, `retention-charts.tsx:349-415`): 69.77 % (vol 49.2 %, invol 20.6 %) vs 67.59 %.  
- **Rotación YTD**: 59.76 % (vol 41.6 %, invol 18.2 %) vs 62.99 %.  
- **Tabla comparativa** (`apps/web/src/components/retention-table.tsx:1-120`): consume los mismos `KPIResult` del cálculo base (4.42 %, 69.77 %, 59.76 %).

Además, `RetentionCharts` genera comparativos año a año (`apps/web/src/components/retention-charts.tsx:901-1109`) alimentados por `allMonthlyData`. La lógica garantiza que voluntaria % + involuntaria % = total %, reutilizando el mismo denominador (`calcularRotacionConDesglose`).

---

Esta desagregación enlaza cada número de la UI con su fórmula, tabla de origen en Supabase y alcance de filtros. Con los valores de octubre 2025 se pueden reproducir o auditar los cálculos directamente desde las consultas SQL mostradas en este documento.

## 11. Actualización técnica – flujo de rotación (corrección bug de zona horaria)

### 11.1 Flujo actualizado de datos
- **Extracción**: el componente `RetentionCharts` solicita `empleados_sftp` y `motivos_baja` vía `db.getEmpleadosSFTP` y `db.getMotivosBaja`, respetando filtros RLS y los filtros dimensionales (`applyFiltersWithScope`, alcance `general`).
- **Normalización de fechas**: todas las fechas provenientes de Supabase (`fecha_ingreso`, `fecha_baja`) se convierten con `parseSupabaseDate` (`apps/web/src/lib/retention-calculations.ts:32`), que fija la hora en medianoche local evitando desfases UTC al comparar rangos.
- **Construcción de ventanas**: cada mes se delimita con `startOfMonth`/`endOfMonth`; la ventana móvil de 12 meses usa `startOfDay(subMonths(...))` para alinear inicios de periodo con las fechas normalizadas.
- **Cálculo**: `calculateMonthlyRetention` consolida bajas tanto de `plantilla` como de `motivos_baja`, elimina duplicados por empleado/día y clasifica voluntarias vs involuntarias con `bajaMatchesMotivo`.
- **Agregación**: los resultados devuelven bajas, promedios de activos y temporalidad; el mismo helper alimenta las series mensuales, la tabla y los indicadores rolling.

### 11.2 Correcciones aplicadas
- Se extrajo la lógica de fechas/rotación a `apps/web/src/lib/retention-calculations.ts` y el componente pasó a reutilizarla (`apps/web/src/components/retention-charts.tsx`).
- La nueva función `parseSupabaseDate` concatena `T00:00:00` antes de parsear, preservando el día calendario (ej. una baja del 1/oct ya no se interpreta como 30/sep 19:00).
- `RetentionCharts` genera las ventanas mensuales con `startOfMonth`/`endOfMonth`, y la rotación 12M usa fechas truncadas para evitar excluir eventos límite.
- Se añadieron pruebas unitarias (`apps/web/tests/retention-calculations.test.ts`) con `node:test` que validan que las bajas del 1 y 31 del mes cuenten correctamente.
- Se incorporó el script `npm run test --workspace=apps/web` para ejecutar la batería de pruebas sin requerir credenciales de Supabase.

### 11.3 Impacto
- La discrepancia “16 vs 15” bajas desaparece; la UI ahora coincide con `motivos_baja` para días límite.
- El pipeline de datos queda documentado y centralizado, facilitando nuevas validaciones o cálculos derivados sin duplicar lógica de fechas.
- Los tests sirven como guardia ante futuras regresiones cuando se actualicen pipelines de SFTP o normalizadores de motivos.
- Comando recomendado de validación rápida: `npm run test --workspace=apps/web` (no requiere credenciales).

### 11.4 Pendientes asociados
- Reactivar los pipelines de SFTP/incidencias para que los datasets (`empleados_sftp`, `incidencias`, `asistencia_diaria`) sostengan los cálculos corregidos.
- Atender la deuda de `lint`/`type-check` existente (tipos `any`, operaciones con strings numéricas) antes de ampliar análisis derivados sobre incidencias/ausentismo.
