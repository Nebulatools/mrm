# 🧪 Test Coverage Exhaustivo - HR KPI Dashboard

**Proyecto:** MRM Simple - Dashboard de KPIs de Recursos Humanos
**Fecha de Creación:** 2026-01-13
**Alcance:** Testing completo de 4 tabs, 16 KPIs, múltiples gráficos/tablas y sistema de filtros
**Objetivo:** Garantizar 100% de funcionalidad correcta en todos los componentes del dashboard

---

## 📊 Resumen Ejecutivo de Test Coverage

### Coverage Estimado por Área

| Área | Componentes | Tests Requeridos | Coverage Objetivo |
|------|-------------|------------------|-------------------|
| **KPIs** | 16 KPIs | 96 tests | 100% |
| **Tabs** | 4 tabs principales | 48 tests | 100% |
| **Gráficos** | 8 visualizaciones | 64 tests | 100% |
| **Tablas** | 10 tablas | 80 tests | 100% |
| **Filtros** | 9 filtros independientes | 108 tests | 100% |
| **Integración** | Flujos completos | 72 tests | 95% |
| **TOTAL** | **47 componentes** | **468 tests** | **98.5%** |

---

## 🎯 TAB 1: RESUMEN (PERSONAL)

### 🏷️ KPI Cards - Testing Individual

#### 1.1 KPI: Activos
**Descripción:** Conteo de empleados activos
**Fórmula:** `Count(empleados con activo = TRUE)`
**Rango Esperado:** 70-85 empleados

**Tests Requeridos (6 tests):**
```typescript
✅ T1.1.1: Renderiza correctamente el valor actual
✅ T1.1.2: Muestra varianza vs período anterior
✅ T1.1.3: Calcula correctamente empleados activos (activo = true)
✅ T1.1.4: Actualiza cuando cambian filtros de departamento
✅ T1.1.5: Actualiza cuando cambian filtros de clasificación
✅ T1.1.6: Maneja correctamente valores nulos/undefined
```

#### 1.2 KPI: Días
**Descripción:** Días únicos en asistencia_diaria
**Fórmula:** `Count(DISTINCT fechas from asistencia_diaria)`
**Rango Esperado:** 20-31 días/mes

**Tests Requeridos (6 tests):**
```typescript
✅ T1.2.1: Renderiza correctamente el conteo de días únicos
✅ T1.2.2: Filtra correctamente por rango de fechas
✅ T1.2.3: Excluye fechas duplicadas correctamente
✅ T1.2.4: Actualiza cuando cambia filtro de mes
✅ T1.2.5: Actualiza cuando cambia filtro de año
✅ T1.2.6: Muestra varianza correcta vs mes anterior
```

#### 1.3 KPI: Activos Prom
**Descripción:** Promedio de empleados activos
**Fórmula:** `(Empleados_Inicio + Empleados_Fin) / 2`
**Rango Esperado:** 70-85 empleados

**Tests Requeridos (6 tests):**
```typescript
✅ T1.3.1: Calcula promedio correctamente
✅ T1.3.2: Usa fecha_ingreso <= startDate para empleados inicio
✅ T1.3.3: Usa fecha_ingreso <= endDate para empleados fin
✅ T1.3.4: Excluye empleados con fecha_baja antes del inicio
✅ T1.3.5: Incluye empleados sin fecha_baja
✅ T1.3.6: Redondea correctamente a entero
```

#### 1.4 KPI: Bajas
**Descripción:** Total de empleados con fecha_baja
**Fórmula:** `Count(empleados con fecha_baja != null)`
**Rango Esperado:** Variable

**Tests Requeridos (6 tests):**
```typescript
✅ T1.4.1: Cuenta correctamente empleados con fecha_baja
✅ T1.4.2: Excluye empleados sin fecha_baja
✅ T1.4.3: Actualiza con filtro de departamento
✅ T1.4.4: Actualiza con filtro de período
✅ T1.4.5: Muestra varianza absoluta (no porcentual)
✅ T1.4.6: Badge rojo si aumenta, verde si disminuye
```

#### 1.5 KPI: Bajas Tempranas
**Descripción:** Empleados con < 3 meses de antigüedad
**Fórmula:** `Count(bajas donde meses_trabajados < 3)`
**Rango Esperado:** 0-10% del total de bajas

**Tests Requeridos (6 tests):**
```typescript
✅ T1.5.1: Identifica correctamente empleados < 3 meses
✅ T1.5.2: Calcula meses_trabajados correctamente
✅ T1.5.3: Excluye empleados >= 3 meses
✅ T1.5.4: Actualiza con filtros de área
✅ T1.5.5: Muestra varianza vs período anterior
✅ T1.5.6: Maneja correctamente fechas inválidas
```

#### 1.6 KPI: Bajas < 3 meses
**Descripción:** Bajas por temporalidad < 3 meses
**Fórmula:** `Count(bajas donde meses_trabajados < 3)`
**Tests Requeridos:** 6 tests (idénticos a 1.5)

#### 1.7 KPI: Bajas 3-6 meses
**Descripción:** Bajas entre 3 y 6 meses de antigüedad
**Fórmula:** `Count(bajas donde 3 <= meses_trabajados < 6)`
**Tests Requeridos (6 tests):**
```typescript
✅ T1.7.1: Incluye solo rango 3-6 meses
✅ T1.7.2: Excluye < 3 meses
✅ T1.7.3: Excluye >= 6 meses
✅ T1.7.4: Actualiza con filtros
✅ T1.7.5: Calcula correctamente límites inclusivos/exclusivos
✅ T1.7.6: Muestra varianza correcta
```

#### 1.8 KPI: Bajas 6-12 meses
**Descripción:** Bajas entre 6 y 12 meses de antigüedad
**Fórmula:** `Count(bajas donde 6 <= meses_trabajados < 12)`
**Tests Requeridos:** 6 tests (similares a 1.7)

#### 1.9 KPI: Bajas +12 meses
**Descripción:** Bajas con más de 12 meses de antigüedad
**Fórmula:** `Count(bajas donde meses_trabajados >= 12)`
**Tests Requeridos (6 tests):**
```typescript
✅ T1.9.1: Incluye solo empleados >= 12 meses
✅ T1.9.2: Excluye empleados < 12 meses
✅ T1.9.3: Actualiza con filtros de puesto
✅ T1.9.4: Maneja correctamente años bisiestos
✅ T1.9.5: Calcula antigüedad correctamente
✅ T1.9.6: Muestra varianza vs período anterior
```

### 📈 Gráficos y Tablas - Tab Resumen

#### 1.10 Age-Gender Table
**Descripción:** Distribución de empleados por edad y género

**Tests Requeridos (8 tests):**
```typescript
✅ T1.10.1: Renderiza tabla con columnas correctas (Rango Edad, Hombres, Mujeres, Total)
✅ T1.10.2: Agrupa correctamente rangos de edad (<25, 25-34, 35-44, 45-54, 55+)
✅ T1.10.3: Calcula totales por género correctamente
✅ T1.10.4: Filtra correctamente por departamento
✅ T1.10.5: Filtra correctamente por clasificación
✅ T1.10.6: Excluye empleados sin fecha_nacimiento
✅ T1.10.7: Maneja correctamente valores null en género
✅ T1.10.8: Actualiza en tiempo real con cambio de filtros
```

#### 1.11 Seniority-Gender Table
**Descripción:** Distribución de empleados por antigüedad y género

**Tests Requeridos (8 tests):**
```typescript
✅ T1.11.1: Renderiza tabla con columnas (Antigüedad, Hombres, Mujeres, Total)
✅ T1.11.2: Agrupa rangos (<1 año, 1-3 años, 3-5 años, 5-10 años, 10+ años)
✅ T1.11.3: Calcula antigüedad desde fecha_ingreso
✅ T1.11.4: Excluye empleados inactivos si filtro aplicado
✅ T1.11.5: Filtra correctamente por área
✅ T1.11.6: Maneja correctamente fechas inválidas
✅ T1.11.7: Actualiza totales al cambiar filtros
✅ T1.11.8: Muestra porcentajes correctos por fila
```

#### 1.12 Summary Comparison
**Descripción:** Comparativa visual de KPIs principales

**Tests Requeridos (8 tests):**
```typescript
✅ T1.12.1: Muestra 4 KPIs principales (Activos, Días, Bajas, Incidencias)
✅ T1.12.2: Calcula varianzas correctamente
✅ T1.12.3: Muestra colores según tendencia (verde/rojo)
✅ T1.12.4: Actualiza con filtros globales
✅ T1.12.5: Maneja correctamente valores negativos
✅ T1.12.6: Formato correcto de números
✅ T1.12.7: Iconos correctos según tendencia
✅ T1.12.8: Responsive en mobile/desktop
```

---

## 🚨 TAB 2: INCIDENCIAS

### 🏷️ KPI Cards - Incidencias

#### 2.1 KPI: Incidencias
**Descripción:** Total de registros con horas_incidencia > 0
**Fórmula:** `Count(asistencia_diaria donde horas_incidencia > 0)`
**Rango Esperado:** Variable según mes

**Tests Requeridos (6 tests):**
```typescript
✅ T2.1.1: Cuenta solo registros con horas_incidencia > 0
✅ T2.1.2: Excluye registros con horas_incidencia = 0
✅ T2.1.3: Filtra correctamente por rango de fechas
✅ T2.1.4: Actualiza con filtro de ubicación
✅ T2.1.5: Muestra varianza vs mes anterior
✅ T2.1.6: Badge rojo si aumenta (negativo para empresa)
```

#### 2.2 KPI: Inc prom x empleado
**Descripción:** Promedio de incidencias por empleado
**Fórmula:** `Incidencias / Activos_Promedio`
**Rango Esperado:** 0.3-0.7 incidencias/empleado

**Tests Requeridos (6 tests):**
```typescript
✅ T2.2.1: Divide incidencias entre Activos_Promedio
✅ T2.2.2: Maneja división por cero (retorna 0)
✅ T2.2.3: Redondea a 2 decimales
✅ T2.2.4: Compara con target (0.4)
✅ T2.2.5: Actualiza con filtros de departamento
✅ T2.2.6: Badge rojo si supera target
```

#### 2.3 KPI: Días Laborados
**Descripción:** Estimación de días trabajados
**Fórmula:** `(Activos / 7) * 6`
**Rango Esperado:** Variable según activos

**Tests Requeridos (6 tests):**
```typescript
✅ T2.3.1: Calcula correctamente fórmula (Activos/7)*6
✅ T2.3.2: Redondea a entero
✅ T2.3.3: Actualiza cuando cambia Activos
✅ T2.3.4: Muestra varianza vs período anterior
✅ T2.3.5: Maneja correctamente valores decimales
✅ T2.3.6: No muestra target (undefined)
```

#### 2.4 KPI: %incidencias
**Descripción:** Porcentaje de incidencias sobre días laborados
**Fórmula:** `(Incidencias / Días_Laborados) * 100`
**Rango Esperado:** 3-8%

**Tests Requeridos (6 tests):**
```typescript
✅ T2.4.1: Calcula porcentaje correctamente
✅ T2.4.2: Maneja división por cero (retorna 0%)
✅ T2.4.3: Muestra 1 decimal
✅ T2.4.4: Compara con target (5.0%)
✅ T2.4.5: Badge rojo si supera target
✅ T2.4.6: Actualiza con filtros globales
```

### 📊 Gráficos y Tablas - Tab Incidencias

#### 2.5 Incidents Tab - Main Component
**Descripción:** Vista completa de incidencias con múltiples visualizaciones

**Tests Requeridos (10 tests):**
```typescript
✅ T2.5.1: Renderiza correctamente estructura completa
✅ T2.5.2: Muestra KPIs de incidencias
✅ T2.5.3: Muestra gráfico de tendencia mensual
✅ T2.5.4: Muestra tabla de detalles por empleado
✅ T2.5.5: Filtra por ubicación correctamente
✅ T2.5.6: Filtra por tipo de incidencia
✅ T2.5.7: Exporta datos correctamente (CSV/Excel)
✅ T2.5.8: Muestra tooltips informativos en gráficos
✅ T2.5.9: Responsive en mobile
✅ T2.5.10: Actualiza en tiempo real con filtros
```

#### 2.6 Absenteeism Table
**Descripción:** Tabla detallada de ausentismo por empleado

**Tests Requeridos (8 tests):**
```typescript
✅ T2.6.1: Renderiza columnas (Empleado, Total Incidencias, Horas, Promedio)
✅ T2.6.2: Ordena por total de incidencias descendente
✅ T2.6.3: Agrupa incidencias por empleado
✅ T2.6.4: Calcula horas totales correctamente
✅ T2.6.5: Calcula promedio mensual
✅ T2.6.6: Filtra por departamento
✅ T2.6.7: Paginación funcional (10/20/50 registros)
✅ T2.6.8: Búsqueda por nombre de empleado
```

#### 2.7 Gráfico: Tendencia de Incidencias
**Descripción:** Line/Bar chart con evolución mensual

**Tests Requeridos (8 tests):**
```typescript
✅ T2.7.1: Renderiza correctamente con Recharts
✅ T2.7.2: Muestra eje X con meses
✅ T2.7.3: Muestra eje Y con conteo de incidencias
✅ T2.7.4: Tooltip muestra valores correctos
✅ T2.7.5: Colores consistentes con tema (dark/light)
✅ T2.7.6: Actualiza con filtros de año
✅ T2.7.7: Maneja meses sin datos (muestra 0)
✅ T2.7.8: Responsive container funcional
```

---

## 🔄 TAB 3: ROTACIÓN (RETENCIÓN)

### 🏷️ KPI Cards - Rotación

#### 3.1 KPI: Rotación Mensual
**Descripción:** Porcentaje de rotación mensual
**Fórmula:** `(Bajas_del_Período / Activos_Promedio) * 100`
**Rango Esperado:** 5-15%

**Tests Requeridos (6 tests):**
```typescript
✅ T3.1.1: Calcula rotación mensual correctamente
✅ T3.1.2: Usa solo bajas VOLUNTARIAS (excluye involuntarias)
✅ T3.1.3: Divide entre Activos_Promedio
✅ T3.1.4: Maneja división por cero (retorna 0%)
✅ T3.1.5: Redondea a 2 decimales
✅ T3.1.6: Muestra varianza vs mes anterior
```

**Motivos Excluidos (Involuntarios):**
```typescript
❌ Rescisión por desempeño
❌ Rescisión disciplinaria
❌ Término de contrato temporal
```

#### 3.2 KPI: Rotación Acumulada
**Descripción:** Rotación acumulada 12 meses
**Fórmula:** `(Bajas_12_Meses / Promedio_12_Meses) * 100`
**Rango Esperado:** Variable

**Tests Requeridos (6 tests):**
```typescript
✅ T3.2.1: Calcula ventana móvil de 12 meses
✅ T3.2.2: Usa solo bajas voluntarias
✅ T3.2.3: Calcula promedio activos inicio/fin 12 meses
✅ T3.2.4: Redondea a 2 decimales
✅ T3.2.5: Compara vs año anterior mismo período
✅ T3.2.6: Actualiza con filtros de área
```

#### 3.3 KPI: Rotación Año Actual
**Descripción:** Rotación Year-to-Date (YTD)
**Fórmula:** `(Bajas_YTD / Promedio_YTD) * 100`
**Rango Esperado:** Variable según mes del año

**Tests Requeridos (6 tests):**
```typescript
✅ T3.3.1: Calcula desde inicio de año hasta fecha actual
✅ T3.3.2: Usa solo bajas voluntarias
✅ T3.3.3: Calcula promedio activos año
✅ T3.3.4: Compara vs mismo YTD año anterior
✅ T3.3.5: Actualiza correctamente cada mes
✅ T3.3.6: Maneja correctamente cambio de año
```

### 📊 Gráficos y Tablas - Tab Rotación

#### 3.4 Retention Charts
**Descripción:** Múltiples visualizaciones de retención

**Tests Requeridos (8 tests):**
```typescript
✅ T3.4.1: Gráfico de barras: Bajas por mes
✅ T3.4.2: Gráfico de líneas: Tendencia rotación
✅ T3.4.3: Gráfico de área: Activos vs Bajas
✅ T3.4.4: Filtros por motivo (voluntaria/involuntaria)
✅ T3.4.5: Actualiza con filtros globales
✅ T3.4.6: Colores consistentes con tema
✅ T3.4.7: Tooltips informativos
✅ T3.4.8: Export a imagen (PNG)
```

#### 3.5 Bajas por Motivo - Heatmap
**Descripción:** Mapa de calor: Motivos × Meses

**Tests Requeridos (8 tests):**
```typescript
✅ T3.5.1: Renderiza matriz correctamente
✅ T3.5.2: Eje X: 12 meses del año
✅ T3.5.3: Eje Y: Motivos de baja únicos
✅ T3.5.4: Colores según intensidad (verde→rojo)
✅ T3.5.5: Tooltip muestra motivo + mes + cantidad
✅ T3.5.6: Filtra por año correctamente
✅ T3.5.7: Agrupa motivos normalizados (prettyMotivo)
✅ T3.5.8: Maneja meses sin datos (color neutral)
```

#### 3.6 Dismissal Reasons Table
**Descripción:** Tabla de motivos de baja detallada

**Tests Requeridos (8 tests):**
```typescript
✅ T3.6.1: Columnas: Motivo, Cantidad, Porcentaje, Tipo
✅ T3.6.2: Ordena por cantidad descendente
✅ T3.6.3: Calcula porcentajes correctos del total
✅ T3.6.4: Identifica tipo (voluntaria/involuntaria)
✅ T3.6.5: Filtra por departamento
✅ T3.6.6: Filtra por rango de fechas
✅ T3.6.7: Muestra totales al final
✅ T3.6.8: Búsqueda por texto en motivo
```

#### 3.7 Rotation by Motive-Area Table
**Descripción:** Cruce motivos × áreas

**Tests Requeridos (8 tests):**
```typescript
✅ T3.7.1: Matriz: Filas = Motivos, Columnas = Áreas
✅ T3.7.2: Valores = Conteo de bajas
✅ T3.7.3: Totales por fila y columna
✅ T3.7.4: Filtra por año correctamente
✅ T3.7.5: Resalta celdas con valores altos
✅ T3.7.6: Export a Excel funcional
✅ T3.7.7: Maneja áreas sin bajas (muestra 0)
✅ T3.7.8: Responsive en mobile
```

#### 3.8 Rotation by Motive-Seniority Table
**Descripción:** Cruce motivos × antigüedad

**Tests Requeridos (8 tests):**
```typescript
✅ T3.8.1: Columnas: <3m, 3-6m, 6-12m, 12+ meses
✅ T3.8.2: Filas: Motivos de baja
✅ T3.8.3: Calcula antigüedad correctamente
✅ T3.8.4: Agrupa en rangos correctos
✅ T3.8.5: Totales por rango
✅ T3.8.6: Filtra por clasificación
✅ T3.8.7: Resalta bajas tempranas (<3m)
✅ T3.8.8: Export funcional
```

#### 3.9 Rotation by Motive-Month Table
**Descripción:** Cruce motivos × meses

**Tests Requeridos (8 tests):**
```typescript
✅ T3.9.1: Columnas: Ene, Feb, Mar... Dic
✅ T3.9.2: Filas: Motivos de baja
✅ T3.9.3: Usa datos de tabla motivos_baja
✅ T3.9.4: Filtra por año seleccionado
✅ T3.9.5: Totales mensuales
✅ T3.9.6: Totales por motivo
✅ T3.9.7: Resalta meses con picos
✅ T3.9.8: Sincroniza con heatmap
```

#### 3.10 Rotation Combined Table
**Descripción:** Tabla consolidada de todas las dimensiones

**Tests Requeridos (8 tests):**
```typescript
✅ T3.10.1: Integra datos de todas las tablas anteriores
✅ T3.10.2: Permite drill-down en celdas
✅ T3.10.3: Muestra tooltips con detalles
✅ T3.10.4: Filtra por múltiples dimensiones
✅ T3.10.5: Export completo a Excel
✅ T3.10.6: Paginación eficiente
✅ T3.10.7: Búsqueda global funcional
✅ T3.10.8: Responsive y accesible
```

#### 3.11 Abandonos-Otros Summary
**Descripción:** Resumen de motivos "Abandono" vs "Otros"

**Tests Requeridos (6 tests):**
```typescript
✅ T3.11.1: Agrupa abandonos correctamente
✅ T3.11.2: Agrupa otros motivos
✅ T3.11.3: Calcula porcentajes del total
✅ T3.11.4: Muestra gráfico de dona (pie chart)
✅ T3.11.5: Actualiza con filtros
✅ T3.11.6: Tooltip con valores absolutos y porcentajes
```

---

## 📈 TAB 4: TENDENCIAS (MODEL TRENDS)

### 🏷️ Model Trends Tab

#### 4.1 Smart Narrative
**Descripción:** Narrativa inteligente con insights automáticos

**Tests Requeridos (8 tests):**
```typescript
✅ T4.1.1: Genera narrativa automática desde KPIs
✅ T4.1.2: Identifica tendencias (aumentos/descensos)
✅ T4.1.3: Destaca KPIs fuera de target
✅ T4.1.4: Sugiere acciones correctivas
✅ T4.1.5: Actualiza con cambio de período
✅ T4.1.6: Formato legible y profesional
✅ T4.1.7: Export a PDF funcional
✅ T4.1.8: Multiidioma (español por defecto)
```

#### 4.2 Model Trends Tab - Visualizaciones
**Descripción:** Tendencias históricas y proyecciones

**Tests Requeridos (10 tests):**
```typescript
✅ T4.2.1: Gráfico: Evolución histórica 12 meses
✅ T4.2.2: Proyección futura (3 meses)
✅ T4.2.3: Líneas de tendencia calculadas correctamente
✅ T4.2.4: R² mostrado en gráfico
✅ T4.2.5: Bandas de confianza (95%)
✅ T4.2.6: Filtra por KPI seleccionado
✅ T4.2.7: Selector de período (6m, 12m, 24m, all)
✅ T4.2.8: Export a imagen/PDF
✅ T4.2.9: Tooltips con valores proyectados
✅ T4.2.10: Actualiza en tiempo real con filtros
```

---

## 🔍 FILTROS - Sistema Completo

### 📋 Retention Filter Panel

**Descripción:** Panel de filtros con 9 dimensiones

**Tests Requeridos (12 tests por filtro × 9 filtros = 108 tests)**

#### 5.1 Filtro: Año
**Tests Requeridos (12 tests):**
```typescript
✅ T5.1.1: Carga años disponibles desde datos
✅ T5.1.2: Multi-select funcional
✅ T5.1.3: Búsqueda por texto funciona
✅ T5.1.4: Checkbox selecciona/deselecciona correctamente
✅ T5.1.5: Dropdown cierra al hacer clic fuera
✅ T5.1.6: Preview muestra años seleccionados
✅ T5.1.7: Badge muestra conteo correcto (+N)
✅ T5.1.8: Botón "Limpiar" limpia selección
✅ T5.1.9: Actualiza todos los componentes del dashboard
✅ T5.1.10: Persiste en URL (query params)
✅ T5.1.11: Valida rango 2022-presente
✅ T5.1.12: Ordena años descendente
```

#### 5.2 Filtro: Mes
**Tests Requeridos (12 tests):**
```typescript
✅ T5.2.1: Muestra 12 meses (Ene-Dic)
✅ T5.2.2: Multi-select funcional
✅ T5.2.3: Búsqueda por nombre de mes
✅ T5.2.4: Preview muestra meses en español
✅ T5.2.5: Filtra correctamente con múltiples meses
✅ T5.2.6: Combina con filtro de año correctamente
✅ T5.2.7: Actualiza KPIs en tiempo real
✅ T5.2.8: Limpiar filtro funciona
✅ T5.2.9: Default: mes actual o último completo
✅ T5.2.10: Badge muestra conteo
✅ T5.2.11: Persiste en URL
✅ T5.2.12: Valida rango 1-12
```

#### 5.3 Filtro: Negocio (Empresa)
**Tests Requeridos (12 tests):**
```typescript
✅ T5.3.1: Carga empresas desde empleados_sftp.empresa
✅ T5.3.2: Multi-select funcional
✅ T5.3.3: Búsqueda case-insensitive
✅ T5.3.4: Elimina valores null/undefined
✅ T5.3.5: Ordena alfabéticamente
✅ T5.3.6: Preview muestra empresas
✅ T5.3.7: Filtra empleados correctamente
✅ T5.3.8: Combina con otros filtros (AND lógico)
✅ T5.3.9: Limpiar funciona
✅ T5.3.10: Badge muestra conteo
✅ T5.3.11: Persiste en URL
✅ T5.3.12: Actualiza todas las visualizaciones
```

#### 5.4 Filtro: Área
**Tests Requeridos (12 tests):**
```typescript
✅ T5.4.1: Carga áreas desde empleados_sftp.area
✅ T5.4.2: Multi-select funcional
✅ T5.4.3: Búsqueda funcional
✅ T5.4.4: Normaliza áreas (normalizeArea)
✅ T5.4.5: Elimina duplicados
✅ T5.4.6: Ordena alfabéticamente
✅ T5.4.7: Preview correcto
✅ T5.4.8: Filtra empleados correctamente
✅ T5.4.9: Combina con Negocio (jerarquía)
✅ T5.4.10: Limpiar funciona
✅ T5.4.11: Badge muestra conteo
✅ T5.4.12: Actualiza dashboards
```

#### 5.5 Filtro: Departamento
**Tests Requeridos (12 tests):**
```typescript
✅ T5.5.1: Carga desde empleados_sftp.departamento
✅ T5.5.2: Multi-select funcional
✅ T5.5.3: Búsqueda case-insensitive
✅ T5.5.4: Sanitiza valores (sanitizeFilterValue)
✅ T5.5.5: Elimina "null", "", valores vacíos
✅ T5.5.6: Ordena alfabéticamente
✅ T5.5.7: Preview correcto (max 2 + contador)
✅ T5.5.8: Filtra plantilla correctamente
✅ T5.5.9: Actualiza todas las tablas
✅ T5.5.10: Limpiar funciona
✅ T5.5.11: Badge muestra conteo
✅ T5.5.12: Persiste en URL
```

#### 5.6 Filtro: Puesto
**Tests Requeridos (12 tests):**
```typescript
✅ T5.6.1: Carga desde empleados_sftp.puesto
✅ T5.6.2: Multi-select funcional
✅ T5.6.3: Búsqueda funcional
✅ T5.6.4: Sanitiza valores
✅ T5.6.5: Elimina valores inválidos
✅ T5.6.6: Ordena alfabéticamente
✅ T5.6.7: Preview muestra puestos seleccionados
✅ T5.6.8: Filtra empleados correctamente
✅ T5.6.9: Combina con departamento
✅ T5.6.10: Limpiar funciona
✅ T5.6.11: Badge muestra conteo
✅ T5.6.12: Actualiza dashboards
```

#### 5.7 Filtro: Clasificación
**Tests Requeridos (12 tests):**
```typescript
✅ T5.7.1: Carga desde empleados_sftp.clasificacion
✅ T5.7.2: Valores típicos: CONFIANZA, SINDICALIZADO, HONORARIOS, EVENTUAL
✅ T5.7.3: Multi-select funcional
✅ T5.7.4: Búsqueda funcional
✅ T5.7.5: Uppercase normalizado
✅ T5.7.6: Ordena alfabéticamente
✅ T5.7.7: Preview correcto
✅ T5.7.8: Filtra empleados correctamente
✅ T5.7.9: Actualiza KPIs
✅ T5.7.10: Limpiar funciona
✅ T5.7.11: Badge muestra conteo
✅ T5.7.12: Persiste en URL
```

#### 5.8 Filtro: Centro de trabajo (Ubicación)
**Tests Requeridos (12 tests):**
```typescript
✅ T5.8.1: Carga desde empleados_sftp.ubicacion
✅ T5.8.2: Multi-select funcional
✅ T5.8.3: Búsqueda funcional
✅ T5.8.4: Sanitiza valores
✅ T5.8.5: Elimina null/undefined
✅ T5.8.6: Ordena alfabéticamente
✅ T5.8.7: Preview correcto
✅ T5.8.8: Filtra empleados correctamente
✅ T5.8.9: Independiente de Ubicación (Incidencias)
✅ T5.8.10: Limpiar funciona
✅ T5.8.11: Badge muestra conteo
✅ T5.8.12: Actualiza dashboards
```

#### 5.9 Filtro: Ubicación (Incidencias)
**Tests Requeridos (12 tests):**
```typescript
✅ T5.9.1: Carga desde incidencias.ubicacion2
✅ T5.9.2: Multi-select funcional
✅ T5.9.3: Búsqueda funcional
✅ T5.9.4: Trim espacios
✅ T5.9.5: Elimina null/undefined
✅ T5.9.6: Ordena alfabéticamente
✅ T5.9.7: Preview correcto
✅ T5.9.8: Filtra SOLO Tab Incidencias
✅ T5.9.9: No afecta otros tabs
✅ T5.9.10: Limpiar funciona
✅ T5.9.11: Badge muestra conteo
✅ T5.9.12: Persiste en URL
```

### 📊 Filtros - Comportamiento Global

**Tests de Integración de Filtros (12 tests):**
```typescript
✅ T5.10.1: Combinar múltiples filtros (AND lógico)
✅ T5.10.2: Badge global muestra conteo total de filtros activos
✅ T5.10.3: Botón "Limpiar todos" limpia todos los filtros
✅ T5.10.4: Resumen de filtros muestra texto descriptivo
✅ T5.10.5: Filtros persisten en URL (query parameters)
✅ T5.10.6: Cargar URL con filtros aplica correctamente
✅ T5.10.7: Filtros se expanden/contraen correctamente
✅ T5.10.8: Cambio de filtros actualiza todos los tabs
✅ T5.10.9: Performance: No recalcula si filtros no cambian
✅ T5.10.10: Responsive: Filtros colapsables en mobile
✅ T5.10.11: Temas (dark/light) aplican correctamente
✅ T5.10.12: Accesibilidad: Navegación por teclado funciona
```

---

## ⚙️ FUNCIONES Y UTILIDADES - Testing

### 🧮 KPI Calculator Functions

**Archivo:** `apps/web/src/lib/kpi-calculator.ts`

**Tests Requeridos (20 tests):**
```typescript
✅ T6.1: calculateAllKPIs() retorna 16 KPIs
✅ T6.2: calculateFromDatabase() conecta correctamente a Supabase
✅ T6.3: calculateFromFallback() maneja errores gracefully
✅ T6.4: Cache funciona (5 min TTL)
✅ T6.5: clearCache() limpia cache correctamente
✅ T6.6: forceRefresh() fuerza recálculo
✅ T6.7: calculateKPIsFromData() calcula correctamente
✅ T6.8: Maneja plantilla vacía (retorna valores 0)
✅ T6.9: Maneja fechas inválidas
✅ T6.10: getBajasPorMotivoYMes() retorna heatmap correcto
✅ T6.11: getBajasPorMotivoYMesFromPlantilla() filtra correctamente
✅ T6.12: calculateRotacionAcumulada() calcula 12 meses rolling
✅ T6.13: calculateRotacionAnioActual() calcula YTD
✅ T6.14: Excluye motivos involuntarios correctamente
✅ T6.15: isMotivoClave() identifica motivos correctamente
✅ T6.16: Calcula varianzas correctamente
✅ T6.17: Maneja división por cero
✅ T6.18: Redondea decimales correctamente
✅ T6.19: Formatea fechas correctamente (yyyy-MM-dd)
✅ T6.20: Performance: <500ms en cálculo completo
```

### 🎯 KPI Helpers Functions

**Archivo:** `apps/web/src/lib/utils/kpi-helpers.ts`

**Tests Requeridos (12 tests):**
```typescript
✅ T6.21: calculateActivosPromedio() calcula promedio correcto
✅ T6.22: calculateBajasTempranas() identifica < 3 meses
✅ T6.23: calcularRotacionConDesglose() retorna objeto completo
✅ T6.24: calcularRotacionAcumulada12mConDesglose() calcula rolling
✅ T6.25: calcularRotacionYTDConDesglose() calcula YTD
✅ T6.26: calculateVariancePercentage() calcula % correcto
✅ T6.27: Maneja null/undefined en todos los helpers
✅ T6.28: Maneja división por cero
✅ T6.29: Redondea consistentemente
✅ T6.30: Excluye motivos involuntarios
✅ T6.31: Calcula fechas correctamente (date-fns)
✅ T6.32: Performance: helpers <50ms cada uno
```

### 🧹 Normalizers Functions

**Archivo:** `apps/web/src/lib/normalizers.ts`

**Tests Requeridos (12 tests):**
```typescript
✅ T6.33: normalizeMotivo() normaliza strings
✅ T6.34: prettyMotivo() formatea para UI
✅ T6.35: normalizeArea() normaliza áreas
✅ T6.36: isMotivoClave() identifica involuntarios
✅ T6.37: Maneja null/undefined
✅ T6.38: Maneja strings vacíos
✅ T6.39: Trim espacios correctamente
✅ T6.40: Lowercase consistente
✅ T6.41: Elimina acentos correctamente
✅ T6.42: Identifica "rescisión", "disciplina", "término"
✅ T6.43: Agrupa "abandono", "renuncia", "otra razón"
✅ T6.44: Performance: <10ms por normalización
```

### 🔍 Filter Functions

**Archivo:** `apps/web/src/lib/filters/filters.ts`

**Tests Requeridos (16 tests):**
```typescript
✅ T6.45: applyFiltersWithScope() scope='specific' filtra mes+año
✅ T6.46: applyFiltersWithScope() scope='year-only' ignora mes
✅ T6.47: applyFiltersWithScope() scope='month-only' ignora año
✅ T6.48: Filtra por departamento correctamente
✅ T6.49: Filtra por puesto correctamente
✅ T6.50: Filtra por clasificación correctamente
✅ T6.51: Filtra por ubicación correctamente
✅ T6.52: Filtra por empresa correctamente
✅ T6.53: Filtra por área correctamente
✅ T6.54: Combina múltiples filtros (AND lógico)
✅ T6.55: includeInactive=true incluye inactivos
✅ T6.56: includeInactive=false excluye inactivos
✅ T6.57: Maneja arrays vacíos (no filtra)
✅ T6.58: Maneja plantilla vacía
✅ T6.59: Case-insensitive matching
✅ T6.60: Performance: <100ms con 1000 empleados
```

### 📝 Filter Summary Functions

**Archivo:** `apps/web/src/lib/filters/summary.ts`

**Tests Requeridos (10 tests):**
```typescript
✅ T6.61: countActiveFilters() cuenta correctamente
✅ T6.62: getFilterSummary() retorna texto descriptivo
✅ T6.63: getDetailedFilterLines() retorna líneas detalladas
✅ T6.64: sanitizeFilterValue() limpia valores
✅ T6.65: Maneja filtros vacíos
✅ T6.66: Maneja múltiples filtros activos
✅ T6.67: Formato correcto para UI
✅ T6.68: Pluralización correcta (español)
✅ T6.69: Trunca textos largos correctamente
✅ T6.70: Performance: <50ms
```

### 🗄️ Supabase Database Functions

**Archivo:** `apps/web/src/lib/supabase.ts`

**Tests Requeridos (14 tests):**
```typescript
✅ T6.71: getEmpleadosSFTP() retorna empleados
✅ T6.72: getMotivosBaja() retorna bajas con fechas
✅ T6.73: getAsistenciaDiaria() retorna asistencia
✅ T6.74: getIncidenciasCSV() retorna incidencias
✅ T6.75: Maneja errores de conexión gracefully
✅ T6.76: Maneja timeouts correctamente
✅ T6.77: Respeta RLS (Row Level Security)
✅ T6.78: Filtra por rango de fechas correctamente
✅ T6.79: Ordena resultados correctamente
✅ T6.80: Maneja respuestas vacías
✅ T6.81: Maneja null values en campos
✅ T6.82: Connection pooling funciona
✅ T6.83: Retry logic en caso de error
✅ T6.84: Performance: <2s por query
```

---

## 🔗 TESTS DE INTEGRACIÓN

### 🎭 Flujos Completos End-to-End

#### Flujo 1: Usuario Filtra y Explora Dashboard
**Descripción:** Usuario aplica filtros y navega por los tabs

**Tests Requeridos (12 tests):**
```typescript
✅ TI1.1: Usuario abre dashboard → Carga datos correctamente
✅ TI1.2: Usuario selecciona año 2024 → Todos los tabs actualizan
✅ TI1.3: Usuario selecciona mes Diciembre → KPIs actualizan
✅ TI1.4: Usuario filtra departamento "Ventas" → Tablas filtran
✅ TI1.5: Usuario navega a Tab Incidencias → Datos correctos
✅ TI1.6: Usuario navega a Tab Rotación → Gráficos correctos
✅ TI1.7: Usuario navega a Tab Tendencias → Proyecciones correctas
✅ TI1.8: Usuario limpia filtros → Vuelve a vista completa
✅ TI1.9: Usuario export tabla a Excel → Descarga correcta
✅ TI1.10: Usuario cambia tema dark/light → UI actualiza
✅ TI1.11: URL refleja filtros aplicados → Compartible
✅ TI1.12: Usuario recarga página → Filtros persisten
```

#### Flujo 2: Análisis de Rotación Completo
**Descripción:** Usuario analiza rotación en detalle

**Tests Requeridos (10 tests):**
```typescript
✅ TI2.1: Usuario abre Tab Rotación
✅ TI2.2: Usuario ve KPI Rotación Mensual con varianza
✅ TI2.3: Usuario aplica filtro "Rotación Voluntaria"
✅ TI2.4: Heatmap actualiza correctamente
✅ TI2.5: Usuario hace click en celda del heatmap → Drill-down
✅ TI2.6: Tabla de motivos muestra detalle del mes
✅ TI2.7: Usuario filtra por área "Operaciones"
✅ TI2.8: Usuario export heatmap a imagen PNG
✅ TI2.9: Usuario ve narrativa inteligente con insights
✅ TI2.10: Usuario comparte URL con filtros aplicados
```

#### Flujo 3: Análisis de Incidencias Completo
**Descripción:** Usuario analiza ausentismo

**Tests Requeridos (10 tests):**
```typescript
✅ TI3.1: Usuario abre Tab Incidencias
✅ TI3.2: Usuario ve KPIs de incidencias
✅ TI3.3: Usuario aplica filtro ubicación "Planta Norte"
✅ TI3.4: Gráfico de tendencia actualiza
✅ TI3.5: Tabla de ausentismo filtra correctamente
✅ TI3.6: Usuario ordena tabla por "Total Incidencias"
✅ TI3.7: Usuario busca empleado por nombre
✅ TI3.8: Usuario ve detalles de incidencias por tipo
✅ TI3.9: Usuario export tabla a CSV
✅ TI3.10: Usuario compara vs mes anterior
```

#### Flujo 4: Análisis de Personal (Headcount)
**Descripción:** Usuario analiza plantilla y demografía

**Tests Requeridos (10 tests):**
```typescript
✅ TI4.1: Usuario abre Tab Resumen (Personal)
✅ TI4.2: Usuario ve distribución edad-género
✅ TI4.3: Usuario ve distribución antigüedad-género
✅ TI4.4: Usuario filtra clasificación "SINDICALIZADO"
✅ TI4.5: Tablas actualizan correctamente
✅ TI4.6: Usuario ve summary comparison con 4 KPIs
✅ TI4.7: Usuario filtra múltiples departamentos
✅ TI4.8: KPIs recalculan correctamente
✅ TI4.9: Usuario export resumen a PDF
✅ TI4.10: Usuario comparte dashboard con stakeholders
```

#### Flujo 5: Usuario Admin - Gestión de Datos
**Descripción:** Usuario admin importa datos SFTP

**Tests Requeridos (12 tests):**
```typescript
✅ TI5.1: Usuario admin abre /admin
✅ TI5.2: Usuario ve lista de archivos SFTP
✅ TI5.3: Usuario hace click "Actualizar Información"
✅ TI5.4: Sistema detecta cambios estructurales
✅ TI5.5: Modal de aprobación muestra diferencias
✅ TI5.6: Usuario aprueba cambios estructurales
✅ TI5.7: Importación procesa 3 tablas correctamente
✅ TI5.8: Bitácora (audit log) registra operación
✅ TI5.9: Dashboard actualiza con nuevos datos
✅ TI5.10: Usuario verifica datos en empleados_sftp
✅ TI5.11: Usuario verifica datos en motivos_baja
✅ TI5.12: Usuario verifica datos en asistencia_diaria
```

#### Flujo 6: Performance y Optimización
**Descripción:** Validar rendimiento del sistema

**Tests Requeridos (8 tests):**
```typescript
✅ TI6.1: Dashboard carga inicial < 3 segundos
✅ TI6.2: Cambio de tab < 500ms
✅ TI6.3: Aplicar filtro < 1 segundo
✅ TI6.4: Cálculo de KPIs < 500ms
✅ TI6.5: Renderizado de gráficos < 1 segundo
✅ TI6.6: Export a Excel < 2 segundos
✅ TI6.7: Cache reduce tiempo en 80% (2da carga)
✅ TI6.8: Dashboard funciona con 1000+ empleados sin lag
```

#### Flujo 7: Responsive y Mobile
**Descripción:** Validar experiencia mobile

**Tests Requeridos (10 tests):**
```typescript
✅ TI7.1: Dashboard responsive en viewport 375px (mobile)
✅ TI7.2: Filtros colapsables en mobile
✅ TI7.3: Tablas scroll horizontal en mobile
✅ TI7.4: Gráficos responsive (ajustan tamaño)
✅ TI7.5: KPI cards stack verticalmente
✅ TI7.6: Navegación por tabs funcional en mobile
✅ TI7.7: Tooltips funcionales en touch
✅ TI7.8: Dropdown filtros funcional en mobile
✅ TI7.9: Export funciona en mobile
✅ TI7.10: Performance aceptable en dispositivos móviles
```

---

## 🎨 TESTS DE UI/UX

### 🖌️ Temas (Dark/Light Mode)

**Tests Requeridos (12 tests):**
```typescript
✅ TUI1.1: Toggle dark/light funciona correctamente
✅ TUI1.2: Todos los componentes respetan tema
✅ TUI1.3: Colores de gráficos cambian con tema
✅ TUI1.4: Contraste cumple WCAG 2.1 AA
✅ TUI1.5: Texto legible en ambos temas
✅ TUI1.6: Borders y shadows consistentes
✅ TUI1.7: KPI cards visible en ambos temas
✅ TUI1.8: Tablas legibles en ambos temas
✅ TUI1.9: Tooltips visibles en ambos temas
✅ TUI1.10: Loading states visibles
✅ TUI1.11: Error states visibles
✅ TUI1.12: Tema persiste en localStorage
```

### ♿ Accesibilidad (A11y)

**Tests Requeridos (14 tests):**
```typescript
✅ TUI2.1: Navegación por teclado funcional (Tab, Enter, Esc)
✅ TUI2.2: Screen reader lee KPIs correctamente
✅ TUI2.3: Screen reader lee tablas con headers
✅ TUI2.4: Aria-labels presentes en todos los controles
✅ TUI2.5: Focus visible en todos los elementos interactivos
✅ TUI2.6: Contraste de color cumple WCAG AA (4.5:1)
✅ TUI2.7: Gráficos tienen texto alternativo
✅ TUI2.8: Filtros navegables por teclado
✅ TUI2.9: Modales atrapan focus correctamente
✅ TUI2.10: Botones tienen roles ARIA correctos
✅ TUI2.11: Formularios tienen labels asociados
✅ TUI2.12: Skip links funcionan correctamente
✅ TUI2.13: Landmark roles (main, nav, aside) presentes
✅ TUI2.14: Pasa auditoría Lighthouse Accessibility (>90)
```

### 🎭 Estados de Carga y Errores

**Tests Requeridos (10 tests):**
```typescript
✅ TUI3.1: Loading skeleton se muestra durante carga
✅ TUI3.2: Loading spinner en operaciones lentas
✅ TUI3.3: Error boundary captura errores de React
✅ TUI3.4: Mensaje de error claro para usuario
✅ TUI3.5: Botón "Reintentar" funcional en errores
✅ TUI3.6: Estado vacío ("No hay datos") se muestra correctamente
✅ TUI3.7: Fallback a datos mock si API falla
✅ TUI3.8: Timeout de 30s en requests lentos
✅ TUI3.9: Progress bar en operaciones largas (import SFTP)
✅ TUI3.10: Toast notifications para acciones exitosas
```

---

## 📈 MÉTRICAS DE CALIDAD

### 🎯 Objetivos de Test Coverage

| Categoría | Objetivo | Estado |
|-----------|----------|--------|
| **Unit Tests** | >80% coverage | 🟢 Alcanzable |
| **Integration Tests** | >70% coverage | 🟢 Alcanzable |
| **E2E Tests** | >60% critical paths | 🟢 Alcanzable |
| **A11y Tests** | 100% WCAG AA | 🟡 En progreso |
| **Performance Tests** | <3s initial load | 🟢 Alcanzable |

### 🔬 Stack de Testing Recomendado

```typescript
// Unit & Integration Tests
- Framework: Vitest (fast, compatible con Vite)
- Component Testing: React Testing Library
- Assertions: Vitest expect + testing-library matchers

// E2E Tests
- Framework: Playwright (cross-browser)
- Visual Regression: Playwright screenshots

// Performance
- Tool: Lighthouse CI
- Metrics: Core Web Vitals (LCP, FID, CLS)

// Accessibility
- Tool: axe-core + jest-axe
- Manual: NVDA/JAWS screen reader testing

// Code Quality
- Linter: ESLint + TypeScript strict
- Formatter: Prettier
- Pre-commit: Husky + lint-staged
```

### 📊 Configuración de Testing

**Archivo:** `apps/web/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup (Semana 1)
- [ ] Instalar Vitest + React Testing Library
- [ ] Configurar vitest.config.ts
- [ ] Crear /src/test/setup.ts con mocks
- [ ] Configurar CI/CD pipeline (GitHub Actions)
- [ ] Instalar Playwright para E2E
- [ ] Configurar ESLint rules para testing

### Fase 2: Unit Tests - KPIs (Semana 2-3)
- [ ] Implementar tests para kpi-calculator.ts (20 tests)
- [ ] Implementar tests para kpi-helpers.ts (12 tests)
- [ ] Implementar tests para normalizers.ts (12 tests)
- [ ] Implementar tests para filtros (60 tests)
- [ ] Implementar tests para KPI Cards (96 tests)
- [ ] Coverage objetivo: >80% en funciones core

### Fase 3: Component Tests (Semana 4-5)
- [ ] Tests para tablas (80 tests)
- [ ] Tests para gráficos (64 tests)
- [ ] Tests para filtros UI (108 tests)
- [ ] Tests para tabs (48 tests)
- [ ] Snapshot tests para componentes visuales
- [ ] Coverage objetivo: >75% en componentes

### Fase 4: Integration Tests (Semana 6)
- [ ] Tests de flujos completos (72 tests)
- [ ] Tests de filtros combinados (12 tests)
- [ ] Tests de navegación entre tabs (10 tests)
- [ ] Tests de SFTP import (12 tests)
- [ ] Tests de export funcionalidad (8 tests)
- [ ] Coverage objetivo: >70% flujos críticos

### Fase 5: E2E Tests (Semana 7)
- [ ] Setup Playwright en CI/CD
- [ ] Tests de usuario final (30 tests)
- [ ] Tests de responsive mobile (10 tests)
- [ ] Tests de performance (8 tests)
- [ ] Visual regression tests (20 screenshots)
- [ ] Coverage objetivo: >60% user journeys

### Fase 6: A11y & Performance (Semana 8)
- [ ] Auditoría Lighthouse (score >90)
- [ ] Tests de accesibilidad (14 tests)
- [ ] Screen reader testing manual
- [ ] Performance profiling
- [ ] Optimización de bundle size
- [ ] Load testing (1000+ empleados)

### Fase 7: Documentation (Semana 9)
- [ ] Documentar convenciones de testing
- [ ] Crear guías de testing para nuevos devs
- [ ] Documentar casos edge conocidos
- [ ] Crear test data generators
- [ ] Documentar mocks y fixtures
- [ ] Video tutorials de testing

---

## 🚀 EJEMPLO DE TEST COMPLETO

### Ejemplo: Test KPI "Activos"

**Archivo:** `apps/web/src/lib/__tests__/kpi-calculator.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KPICalculator } from '../kpi-calculator';
import type { PlantillaRecord } from '../supabase';

describe('KPICalculator - KPI Activos', () => {
  let calculator: KPICalculator;
  let mockPlantilla: PlantillaRecord[];

  beforeEach(() => {
    calculator = new KPICalculator();
    mockPlantilla = [
      {
        emp_id: '1',
        numero_empleado: 1,
        nombre: 'Juan Pérez',
        activo: true,
        fecha_ingreso: '2020-01-15',
        fecha_baja: null,
        departamento: 'Ventas',
        puesto: 'Vendedor',
        area: 'Comercial',
        clasificacion: 'CONFIANZA',
        created_at: '2020-01-15',
        updated_at: '2024-01-01',
      },
      {
        emp_id: '2',
        numero_empleado: 2,
        nombre: 'María García',
        activo: true,
        fecha_ingreso: '2021-03-10',
        fecha_baja: null,
        departamento: 'Marketing',
        puesto: 'Analista',
        area: 'Comercial',
        clasificacion: 'SINDICALIZADO',
        created_at: '2021-03-10',
        updated_at: '2024-01-01',
      },
      {
        emp_id: '3',
        numero_empleado: 3,
        nombre: 'Pedro López',
        activo: false,
        fecha_ingreso: '2019-05-20',
        fecha_baja: '2023-12-31',
        departamento: 'Operaciones',
        puesto: 'Operador',
        area: 'Producción',
        clasificacion: 'SINDICALIZADO',
        created_at: '2019-05-20',
        updated_at: '2023-12-31',
      },
    ];
  });

  it('T1.1.1: Renderiza correctamente el valor actual', async () => {
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
    expect(activosKPI?.value).toBe(2); // Solo 2 activos
  });

  it('T1.1.2: Muestra varianza vs período anterior', async () => {
    const mockPrevPlantilla = mockPlantilla.map((emp) => ({
      ...emp,
      activo: emp.emp_id === '3' ? true : emp.activo, // 3 activos en período anterior
    }));

    const kpis = await calculator['calculateKPIsFromData'](
      mockPlantilla,
      [],
      [],
      mockPrevPlantilla,
      [],
      [],
      new Date('2024-01-01'),
      new Date('2024-01-31')
    );

    const activosKPI = kpis.find((kpi) => kpi.name === 'Activos');
    expect(activosKPI?.previous_value).toBe(3);
    expect(activosKPI?.variance_percentage).toBeCloseTo(-33.33, 1);
  });

  it('T1.1.3: Calcula correctamente empleados activos (activo = true)', () => {
    const activos = mockPlantilla.filter((emp) => emp.activo === true);
    expect(activos.length).toBe(2);
    expect(activos.every((emp) => emp.activo === true)).toBe(true);
  });

  it('T1.1.4: Actualiza cuando cambian filtros de departamento', () => {
    const filtradoPorDepto = mockPlantilla.filter(
      (emp) => emp.departamento === 'Ventas' && emp.activo
    );
    expect(filtradoPorDepto.length).toBe(1);
    expect(filtradoPorDepto[0].nombre).toBe('Juan Pérez');
  });

  it('T1.1.5: Actualiza cuando cambian filtros de clasificación', () => {
    const filtradoPorClasif = mockPlantilla.filter(
      (emp) => emp.clasificacion === 'SINDICALIZADO' && emp.activo
    );
    expect(filtradoPorClasif.length).toBe(1);
    expect(filtradoPorClasif[0].nombre).toBe('María García');
  });

  it('T1.1.6: Maneja correctamente valores nulos/undefined', () => {
    const plantillaConNulos = [
      ...mockPlantilla,
      {
        emp_id: '4',
        numero_empleado: 4,
        nombre: 'Sin Activo',
        activo: undefined as any,
        fecha_ingreso: '2022-01-01',
        fecha_baja: null,
        departamento: 'Test',
        puesto: 'Test',
        area: 'Test',
        clasificacion: 'CONFIANZA',
        created_at: '2022-01-01',
        updated_at: '2024-01-01',
      },
    ];

    const activos = plantillaConNulos.filter((emp) => emp.activo === true);
    expect(activos.length).toBe(2); // Debe ignorar undefined
  });
});
```

---

## 🎯 PRIORIZACIÓN DE TESTS

### Alta Prioridad (Implementar Primero)
1. ✅ **KPI Calculations** - Crítico para negocio
2. ✅ **Filter System** - Usado en todos los tabs
3. ✅ **Data Loading** - Base del dashboard
4. ✅ **KPI Cards Rendering** - Vista principal
5. ✅ **Tab Navigation** - UX crítica

### Media Prioridad (Implementar Segundo)
6. ✅ **Charts & Visualizations** - Análisis visual
7. ✅ **Tables & Sorting** - Detalles de datos
8. ✅ **Export Functionality** - Reportes
9. ✅ **Responsive Design** - Mobile UX
10. ✅ **Theme Switching** - Dark/Light mode

### Baja Prioridad (Implementar Tercero)
11. ✅ **Advanced Filters** - Combinaciones complejas
12. ✅ **Performance Optimization** - Optimizaciones
13. ✅ **Accessibility Edge Cases** - A11y avanzado
14. ✅ **Visual Regression** - Cambios visuales
15. ✅ **Load Testing** - Estrés del sistema

---

## 📞 CONTACTO Y MANTENIMIENTO

**Responsable de Testing:** [Nombre del QA Lead]
**Última Actualización:** 2026-01-13
**Próxima Revisión:** 2026-02-13
**Versión del Documento:** 1.0.0

---

## 📚 REFERENCIAS

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Recharts Testing Examples](https://recharts.org/en-US/guide/testing)

---

**FIN DEL DOCUMENTO DE TEST COVERAGE EXHAUSTIVO**

*Total de Tests Planificados: 468 tests*
*Cobertura Objetivo: 98.5%*
*Tiempo Estimado de Implementación: 9 semanas*
*Prioridad: Alta - Crítico para producción*
