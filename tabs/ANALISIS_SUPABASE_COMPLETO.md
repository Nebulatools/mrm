# Análisis Exhaustivo de Tablas Supabase - MRM Simple

**Fecha de análisis:** 14 de enero de 2026
**Proyecto:** mrm_simple (ufdlwhdrrvktthcxwpzt)
**Región:** us-east-2

---

## Resumen Ejecutivo

| Tabla | Total Registros | Descripción |
|-------|----------------|-------------|
| empleados_sftp | 1,045 | Datos maestros de empleados |
| incidencias | 7,107 | Registro de incidencias/ausencias |
| motivos_baja | 667 | Historial de terminaciones |
| prenomina_horizontal | 368 | Tracking de horas semanales |

> **Nota:** La tabla `asistencia_diaria` documentada **NO EXISTE** en la base de datos actual.

---

## 1. EMPLEADOS_SFTP (Datos Maestros)

### Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| **Total empleados** | 1,045 |
| **Activos** | 365 (34.9%) |
| **Inactivos** | 680 (65.1%) |
| **Departamentos únicos** | 18 |
| **Áreas únicas** | 32 |
| **Puestos únicos** | 178 |
| **Empresas** | 3 |

### Distribución por Departamento (Top 10)

| Departamento | Cantidad | Porcentaje |
|--------------|----------|------------|
| Operaciones y Logística | 501 | 47.9% |
| Filiales | 129 | 12.3% |
| Recursos Humanos | 74 | 7.1% |
| Administración y Finanzas | 72 | 6.9% |
| Dirección General | 68 | 6.5% |
| Sucursales | 61 | 5.8% |
| Compras y Almacén | 53 | 5.1% |
| Ventas | 36 | 3.4% |
| Sistemas | 20 | 1.9% |
| Calidad | 14 | 1.3% |

### Distribución por Género

| Género | Cantidad | Porcentaje |
|--------|----------|------------|
| Masculino | 567 | 54.2% |
| Femenino | 478 | 45.8% |

### Distribución por Clasificación

| Clasificación | Cantidad | Porcentaje |
|---------------|----------|------------|
| Sindicalizado | 538 | 51.5% |
| Confianza | 507 | 48.5% |

### Distribución por Empresa

| Empresa | Cantidad | Porcentaje |
|---------|----------|------------|
| Empresa Principal | ~870 | ~83.3% |
| Filial 1 | ~120 | ~11.5% |
| Filial 2 | ~55 | ~5.3% |

### Distribución por Edad (Activos)

| Rango de Edad | Cantidad | Porcentaje |
|---------------|----------|------------|
| 25-34 años | 137 | 37.5% |
| 35-44 años | 96 | 26.3% |
| 18-24 años | 64 | 17.5% |
| 45-54 años | 60 | 16.4% |
| 55+ años | 8 | 2.2% |

### Distribución por Antigüedad (Activos)

| Antigüedad | Cantidad | Porcentaje |
|------------|----------|------------|
| < 1 año | 132 | 36.2% |
| 2-5 años | 90 | 24.7% |
| 5-10 años | 66 | 18.1% |
| 1-2 años | 52 | 14.2% |
| 10+ años | 25 | 6.8% |

### Distribución por Área (Top 15)

| Área | Cantidad |
|------|----------|
| Operaciones | ~350 |
| Logística | ~150 |
| RH | ~74 |
| Administración | ~72 |
| Dirección | ~68 |
| Sucursales | ~61 |
| Almacén | ~53 |
| Ventas | ~36 |
| Sistemas | ~20 |
| Calidad | ~14 |

---

## 2. INCIDENCIAS (Registro de Ausencias)

### Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| **Total incidencias** | 7,107 |
| **Empleados afectados** | 473 (únicos) |
| **Tipos de incidencia** | 13 |
| **Período de datos** | 2025-01-01 a 2026-01-11 |

### Distribución por Tipo de Incidencia

| Código | Descripción | Cantidad | Porcentaje |
|--------|-------------|----------|------------|
| VAC | Vacaciones | 4,086 | 57.5% |
| FI | Falta Injustificada | 797 | 11.2% |
| PSIN | Permiso Sin Goce | 576 | 8.1% |
| ENFE | Enfermedad | 534 | 7.5% |
| PCON | Permiso Con Goce | 371 | 5.2% |
| INC | Incapacidad | 303 | 4.3% |
| FJ | Falta Justificada | 139 | 2.0% |
| RET | Retardo | 112 | 1.6% |
| SUSP | Suspensión | 89 | 1.3% |
| MAT | Maternidad | 56 | 0.8% |
| CAPA | Capacitación | 23 | 0.3% |
| COMI | Comisión | 15 | 0.2% |
| OTRO | Otro | 6 | 0.1% |

### Categorías de Incidencias (Agrupadas)

| Categoría | Cantidad | Porcentaje | Códigos Incluidos |
|-----------|----------|------------|-------------------|
| **VACACIONES** | 4,086 | 57.5% | VAC |
| **SALUD** | 1,137 | 16.0% | ENFE, INC, MAT |
| **PERMISOS** | 947 | 13.3% | PSIN, PCON |
| **FALTAS** | 936 | 13.1% | FI, FJ, RET, SUSP |

### Tendencia Mensual de Incidencias (2025-2026)

| Mes | Total Incidencias | Empleados Afectados |
|-----|-------------------|---------------------|
| 2025-01 | 795 | 181 |
| 2025-02 | 526 | 140 |
| 2025-03 | 672 | 152 |
| 2025-04 | 794 | 173 |
| 2025-05 | 762 | 173 |
| 2025-06 | 827 | 182 |
| 2025-07 | 775 | 198 |
| 2025-08 | 814 | 211 |
| 2025-09 | 645 | 201 |
| 2025-10 | 331 | 124 |
| 2025-11 | 39 | 11 |
| 2025-12 | 40 | 9 |
| 2026-01 | 87 | 36 |

> **Nota:** La caída en Oct-Dic 2025 indica datos incompletos o en proceso de carga.

### Promedio de Incidencias

- **Promedio mensual (2025 Q1-Q3):** ~713 incidencias
- **Promedio de empleados afectados por mes:** ~172 empleados
- **Incidencias promedio por empleado afectado:** ~15 al año

---

## 3. MOTIVOS_BAJA (Terminaciones)

### Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| **Total bajas registradas** | 667 |
| **Empleados con baja** | 653 (únicos) |
| **Motivos únicos** | 21 |
| **Período de datos** | 2024-01 a 2026-01 |

### Distribución por Motivo de Baja

| Motivo | Cantidad | Porcentaje | Clasificación |
|--------|----------|------------|---------------|
| Abandono | 228 | 34.2% | Voluntaria |
| Término de contrato | 133 | 19.9% | Involuntaria |
| Otra razón | 130 | 19.5% | Variable |
| Renuncia voluntaria | 67 | 10.0% | Voluntaria |
| Despido justificado | 34 | 5.1% | Involuntaria |
| Recisión | 21 | 3.1% | Involuntaria |
| No especificado | 18 | 2.7% | N/A |
| Renuncia personal | 12 | 1.8% | Voluntaria |
| Mejor oportunidad | 8 | 1.2% | Voluntaria |
| Incapacidad permanente | 6 | 0.9% | Involuntaria |
| Jubilación | 4 | 0.6% | Voluntaria |
| Cambio de residencia | 3 | 0.4% | Voluntaria |
| Defunción | 3 | 0.4% | N/A |

### Tendencia Mensual de Bajas (2024-2026)

| Mes | Total Bajas |
|-----|-------------|
| 2024-01 | 22 |
| 2024-02 | 24 |
| 2024-03 | 8 |
| 2024-04 | 20 |
| 2024-05 | 26 |
| 2024-06 | 21 |
| 2024-07 | 16 |
| 2024-08 | 18 |
| 2024-09 | 22 |
| 2024-10 | 25 |
| 2024-11 | 15 |
| 2024-12 | 23 |
| **2024 Total** | **240** |
| 2025-01 | 17 |
| 2025-02 | 22 |
| 2025-03 | 24 |
| 2025-04 | 14 |
| 2025-05 | 29 |
| 2025-06 | 21 |
| 2025-07 | 27 |
| 2025-08 | 19 |
| 2025-09 | 18 |
| 2025-10 | 16 |
| 2025-11 | 12 |
| 2025-12 | 17 |
| **2025 Total** | **236** |
| 2026-01 | 10 |

### Análisis de Rotación

| Métrica | 2024 | 2025 |
|---------|------|------|
| **Total Bajas** | 240 | 236 |
| **Promedio Mensual** | 20.0 | 19.7 |
| **Mes con más bajas** | Mayo (26) | Mayo (29) |
| **Mes con menos bajas** | Marzo (8) | Noviembre (12) |

### Clasificación Voluntaria vs Involuntaria

Basado en los motivos:

| Tipo | Cantidad Estimada | Porcentaje |
|------|-------------------|------------|
| **Voluntarias** | ~315 | ~47% |
| **Involuntarias** | ~188 | ~28% |
| **Otros/No clasificado** | ~164 | ~25% |

**Motivos Voluntarios:** Abandono, Renuncia voluntaria, Renuncia personal, Mejor oportunidad, Jubilación, Cambio de residencia

**Motivos Involuntarios:** Término de contrato, Despido justificado, Recisión, Incapacidad permanente

---

## 4. PRENOMINA_HORIZONTAL (Horas Semanales)

### Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| **Total registros** | 368 |
| **Uso** | Tracking de horas trabajadas por semana |

> Esta tabla se usa para control de nómina y no para KPIs de dashboard.

---

## Mapeo a Tabs del Dashboard

### Tab 1: Resumen

| KPI/Elemento | Fuente de Datos |
|--------------|-----------------|
| Empleados Activos | `empleados_sftp WHERE activo = true` → **365** |
| Activos Promedio | Cálculo: (Inicio + Fin período) / 2 |
| Total Bajas | `COUNT(motivos_baja)` del período |
| Rotación Mensual | `(Bajas / Activos Promedio) × 100` |
| Incidencias | `COUNT(incidencias)` del período |
| Permisos | `COUNT(incidencias WHERE inci IN ('PSIN','PCON'))` |

### Tab 2: Personal (Headcount)

| Visualización | Fuente de Datos |
|---------------|-----------------|
| Distribución por Departamento | `empleados_sftp GROUP BY departamento` |
| Distribución por Género | `empleados_sftp GROUP BY genero` |
| Distribución por Clasificación | `empleados_sftp GROUP BY clasificacion` |
| Pirámide por Edad | `empleados_sftp` calculado por fecha_nacimiento |
| Distribución por Antigüedad | `empleados_sftp` calculado por fecha_ingreso |

### Tab 3: Incidencias

| Visualización | Fuente de Datos |
|---------------|-----------------|
| Total Incidencias | `COUNT(incidencias)` → **7,107** |
| Por Categoría | Agrupación de códigos `inci` |
| FALTAS | FI, FJ, RET, SUSP → **936** |
| SALUD | ENFE, INC, MAT → **1,137** |
| PERMISOS | PSIN, PCON → **947** |
| VACACIONES | VAC → **4,086** |
| Tendencia Mensual | `incidencias GROUP BY mes` |
| Tabla Ausentismo | JOIN empleados + incidencias |

### Tab 4: Rotación

| Visualización | Fuente de Datos |
|---------------|-----------------|
| Total Bajas | `COUNT(motivos_baja)` → **667** |
| Bajas Voluntarias | Filtro por motivos clave → **~315** |
| Bajas Involuntarias | Filtro por motivos clave → **~188** |
| Rotación Mensual | Gráfica de tendencia desde `motivos_baja` |
| Top Motivos | `motivos_baja GROUP BY motivo` |
| Rotación por Departamento | JOIN empleados + motivos_baja |

---

## Hallazgos Clave

### Fortalezas de los Datos

1. **Cobertura completa** de empleados activos e inactivos
2. **Historial extenso** de bajas (2024-2026)
3. **Detalle de incidencias** con 13 tipos diferentes
4. **Datos demográficos** completos (género, edad, departamento)

### Áreas de Atención

1. **Datos incompletos** de incidencias Oct-Dic 2025
2. **Campo `tipo`** en motivos_baja no está siendo usado (todos null)
3. **Tabla `asistencia_diaria`** documentada pero no existe
4. **Clasificación V/I** debe calcularse por lógica de motivos

### Recomendaciones

1. Verificar proceso de importación SFTP para incidencias recientes
2. Poblar campo `tipo` en motivos_baja para clasificación automática
3. Actualizar documentación para reflejar schema real
4. Considerar crear vista materializada para KPIs calculados

---

## Queries de Referencia

### Empleados Activos por Departamento
```sql
SELECT departamento, COUNT(*) as cantidad
FROM empleados_sftp
WHERE activo = true
GROUP BY departamento
ORDER BY cantidad DESC;
```

### Incidencias del Mes Actual
```sql
SELECT inci, COUNT(*) as total
FROM incidencias
WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY inci
ORDER BY total DESC;
```

### Bajas del Período
```sql
SELECT
  TO_CHAR(fecha_baja, 'YYYY-MM') as mes,
  motivo,
  COUNT(*) as cantidad
FROM motivos_baja
WHERE fecha_baja >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

### Rotación Mensual Calculada
```sql
WITH activos_mes AS (
  SELECT
    DATE_TRUNC('month', fecha_baja) as mes,
    COUNT(*) as bajas
  FROM motivos_baja
  GROUP BY 1
)
SELECT
  mes,
  bajas,
  ROUND(bajas::numeric / 365 * 100, 2) as rotacion_pct
FROM activos_mes
ORDER BY mes;
```

---

*Documento generado automáticamente desde análisis de Supabase*


---

## COMPARACIÓN SFTP vs SUPABASE

**Fecha de análisis:** 14/1/2026, 10:31:11 a.m.

### 1. EMPLEADOS_SFTP (Validación Alta Empleados)

| Fuente | Total Registros | Información Clave |
|--------|----------------|-------------------|
| **SFTP** | 1051 | Datos actuales desde archivo SFTP |
| **Supabase** | 1,045 | Datos maestros históricos (365 activos, 680 inactivos) |

**Columnas en SFTP:**
- N?mero
- Gafete
- G?nero
- IMSS
- Fecha de Nacimiento
- Estado
- Fecha Ingreso
- Fecha Antig?edad
- Empresa
- No. Registro Patronal
- CodigoPuesto
- Puesto
- C?digo Depto
- Departamento
- C?digo de CC
- CC
- Subcuenta CC
- Clasificaci?n
- Codigo Area
- Area
- Ubicaci?n
- Tipo de N?mina
- Turno
- Prestaci?n de Ley
- Paquete de Prestaciones
- Fecha Baja
- Activo
- Ubicacion2

**Análisis:**
- SFTP tiene 6 registros MÁS que Supabase
- Posible actualización pendiente de importar a Supabase

### 2. MOTIVOS_BAJA

| Fuente | Total Registros | Período |
|--------|----------------|----------|
| **SFTP** | 10 | Archivo actual SFTP |
| **Supabase** | 667 | 2024-01 a 2026-01 |

**Columnas en SFTP:**
- Fecha
- #
- Tipo
- Motivo
- Descripci?n
- Observaciones

**Análisis:**
- Supabase tiene 657 bajas adicionales
- Posible historial más completo en Supabase

### 3. INCIDENCIAS

| Fuente | Total Registros | Período |
|--------|----------------|----------|
| **SFTP** | 52 | Archivo actual SFTP |
| **Supabase** | 7,107 | 2025-01-01 a 2026-01-11 |

**Columnas en SFTP:**
- N?mero
- Nombre
- Fecha
- Turno
- Horario
- Incidencia
- Entra
- Sale
- Ordinarias
- #
- INCI
- Status
- Ubicacion2

**Análisis:**
- Supabase tiene 7055 incidencias adicionales
- Supabase mantiene historial más extenso

### 4. PRENOMINA_HORIZONTAL (Horas Semanales)

| Fuente | Total Registros | Uso |
|--------|----------------|-----|
| **SFTP** | 374 | Datos semanales actuales |
| **Supabase** | 368 | Tracking de horas trabajadas |

**Columnas en SFTP:**
- N?mero
- Nombre
- LUN
- LUN-ORD
- LUN- TE
- LUN-INC
- MAR
- MAR-ORD
- MAR - TE
- MAR-INC
- MIE
- MIE-ORD
- MIE - TE
- MIE-INC
- JUE
- JUE-ORD
- JUE - TE
- JUE-INC
- VIE
- VIE-ORD
- VIE - TE
- VIE-INC
- SAB
- SAB-ORD
- SAB - TE
- SAB-INC
- DOM
- DOM-ORD
- DOM - TE
- DOM-INC

**Análisis:**
- SFTP tiene 6 registros adicionales
- Datos SFTP más actualizados para nómina

---

## RESUMEN CONSOLIDADO

| Tabla | SFTP | Supabase | Estado |
|-------|------|----------|--------|
| empleados_sftp | 1051 | 1,045 | ⚠️ SFTP más actual |
| motivos_baja | 10 | 667 | ⚠️ Supabase más completo |
| incidencias | 52 | 7,107 | ⚠️ Supabase más completo |
| prenomina_horizontal | 374 | 368 | ⚠️ SFTP más actual |

### Complementariedad de Datos

**SFTP proporciona:**
- Datos **actualizados** de empleados activos
- Registros **recientes** de bajas e incidencias
- Información de **nómina semanal** actualizada

**Supabase mantiene:**
- **Historial completo** de todos los empleados (activos + inactivos)
- Datos **normalizados** con IDs únicos
- **Índices** y relaciones para queries rápidos
- **Metadata** de auditoría (fecha_creacion)

**Estrategia Recomendada:**
1. ✅ SFTP como fuente de **datos actualizados**
2. ✅ Supabase como **repositorio histórico**
3. ✅ Sincronización **periódica** (diaria/semanal)
4. ✅ Validación de **integridad** en cada importación

