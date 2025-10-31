# Resumen ejecutivo del dashboard (fuentes Supabase y fórmulas)

Este documento sintetiza cómo se alimenta y calcula cada vista principal del dashboard a partir de las tablas de Supabase. Los cálculos se describen en términos funcionales (no en código) y se indica la información relevante que explota cada tab.

## Tab: Resumen (Overview)
- **Tablas Supabase involucradas**
  - `empleados_sftp`: base maestra de empleados con campos de empresa, área, fecha de ingreso y baja, motivo, clasificación, etc.
  - `motivos_baja`: se utiliza para clasificar las bajas voluntarias e involuntarias con fechas exactas.
  - `incidencias`: alimenta el conteo de incidencias y permisos por mes.
  - `asistencia_diaria`: provee días trabajados y soporte para calcular promedios de activos.
- **KPIs**
  - *Empleados Activos*: número de registros `empleados_sftp` marcados como activos al final del mes filtrado.
  - *Rotación mensual*: bajas del mes ÷ promedio de activos del mismo mes × 100.
  - *Rotación acumulada (12M)*: bajas de los últimos 12 meses ÷ promedio de activos en el mismo periodo × 100.
  - *Rotación año actual (YTD)*: bajas desde enero hasta el mes filtrado ÷ promedio de activos YTD × 100.
  - *Incidencias* y *Permisos*: conteo de registros en `incidencias` con códigos normalizados para incidencias (FI, AC CI, ENFE, etc.) y permisos (VAC, PCON, MAT, PAT, FEST, etc.) dentro del periodo activo.
- **Visualizaciones clave**
  - *Comparativo por negocio/área/departamento*: utiliza `empleados_sftp` filtrado por la selección actual y presenta rotación mensual/12M/YTD desglosada voluntaria vs involuntaria.
  - *Activos por antigüedad*: clasifica a los empleados activos en buckets 0-3, 3-6, 6-12 meses, 1-3 y +3 años usando fecha de ingreso.
  - *Series temporales de rotación*: la rotación mensual, 12M y YTD se trazan por negocio usando los mismos cálculos anteriores, comparando con el mismo mes del año previo para los indicadores acumulados.
  - *Incidencias y permisos 12M*: series mensuales de conteos provenientes de `incidencias`.

## Tab: Personal (Headcount)
- **Tablas**
  - Principalmente `empleados_sftp`.
  - `asistencia_diaria` para estimar activos promedio y días trabajados.
- **KPIs**
  - *Activos*, *Activos promedio*, *Altas/Bajas recientes*, *Días laborados*, etc.
  - Variaciones expresadas en valores absolutos para *Activos Prom* y *Bajas*, comparando contra el mes anterior.
- **Gráficas**
  - *Clasificación (Confianza/Sindicalizado)*, *Distribución de género*, *Antigüedad por área/departamento*, *Headcount por departamento/área*, etc. Todos los conteos se derivan de campos categóricos en `empleados_sftp`.
  - Filtros de UI (empresa, área, departamento, puesto, clasificación, ubicación) se aplican para generar subconjuntos antes de agrupar y contar.

## Tab: Incidencias
- **Tablas**
  - `incidencias` (histórico de incidencias con código `inci`, descripción, fecha y número de empleado).
  - `empleados_sftp` para enriquecer con datos de negocio, área, puesto y clasificación.
- **KPIs**
  - *Total de incidencias* y *permisos* del periodo seleccionado.
  - *Incidencias promedio por empleado*: incidencias ÷ activos promedio del periodo.
  - *% de incidencias*: incidencias ÷ días laborados estimados (derivados de `asistencia_diaria`).
- **Visualizaciones y tablas**
  - Barras apiladas por tipo de incidencia/permisos (códigos normalizados: VAC, PCON, ENFE, FI, FEST, PATER, ACCI, etc.).
  - Línea de tendencia 12M para incidencias + permisos.
  - Pie chart “Incidencias vs Permisos”: usa los códigos normalizados; nombre dentro del segmento y conteo fuera.
  - Tabla detallada de incidencias por empleado (sin columna de nombre para salvaguardar privacidad).

## Tab: Rotación
- **Tablas**
  - `empleados_sftp`: determina altas/bajas, antigüedad y atributos organizacionales.
  - `motivos_baja`: clasifica bajas voluntarias vs involuntarias y permite agrupar por motivo.
  - `asistencia_diaria`: soporte para calcular promedios de activos por mes.
- **KPIs**
  - *Rotación mensual*, *Rotación acumulada 12M*, *Rotación año actual* (con comparativo contra el mismo mes del año anterior).
  - Desglose voluntaria vs involuntaria mediante `motivos_baja` normalizados.
  - *Bajas por temporalidad* (<3 meses, 3-6, 6-12, +12) calculadas con la diferencia entre fecha de ingreso y fecha de baja.
- **Gráficas y tablas**
  - Líneas de rotación mensual y acumulada por año (legend reformateada, tooltips compactos).
  - Barras apiladas por temporalidad.
  - Tablas comparativas (Rotación acumulada 12M y Rotación mensual) mostrando años lado a lado y variación con gradientes rojo/verde según signo e intensidad.
  - Colorimetría alineada al resto del dashboard (paleta índigo/cyan/violeta en lugar de semáforo).

## Tab: Tendencias (Trends, sólo para administradores)
- **Tablas**
  - Al combinar `empleados_sftp`, `asistencia_diaria`, `incidencias` y `motivos_baja` se generan matrices de correlación y análisis exploratorios.
- **Elementos**
  - *Correlation Matrix*: correlaciones entre rotación, incidencias, headcount y atributos organizacionales.
  - *AI Insights*: llamadas a modelos generativos para interpretar tendencias (usa datos agregados de las tablas anteriores).
  - La lógica interna reutiliza las funciones compartidas de cálculo (helpers en `lib/utils/kpi-helpers.ts`).

## Tab: Ajustes
- Principalmente herramientas administrativas:
  - Importadores SFTP/CSV (`empleados_sftp`, `incidencias`).
  - Reprocesamiento de KPI y recálculo de métricas.
  - No expone métricas nuevas, pero documenta qué tablas se tocan en cada acción.

### Notas generales
- **Normalización de códigos de incidencias**: se expandió el mapeo para cubrir `FEST` (día festivo), `ACCI` (accidente) y `PATER` (permiso paternal), tratándolos como permisos o incidencias según corresponda.
- **Comparativos**: la rotación acumulada y año actual ahora comparan contra el mismo mes del año previo en todas las vistas (Resumen y Rotación).
- **Filtros**: los filtros globales de año/mes/empresa/área/departamento/puesto/clasificación/ubicación se procesan vía `applyFiltersWithScope` antes de alimentar cada visual.

Este resumen brinda una vista ejecutiva de los cálculos y las fuentes de datos que soportan cada módulo del dashboard, facilitando el entendimiento funcional y la trazabilidad hacia las tablas de Supabase.
