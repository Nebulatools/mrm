# Análisis de datos – mrm_simple

## 1. Panorama general de las fuentes (public schema)

| Tabla / Vista | Registros | Cobertura temporal clave | Uso principal (según contenido) |
| --- | --- | --- | --- |
| `empleados_sftp` | 1 011 | Ingresos: 2001-06-16 a 2025-10-27. Bajas: 2016-04-01 a 2025-10-31. | Maestro de personal con estado (`activo`), fechas de ingreso/baja, jerarquías (`área`, `departamento`, `puesto`), clasificación (`Sindicalizados` 68%, `Confianza` 32%), empresa, ubicación, etc. |
| `motivos_baja` | 628 | 2023-01-02 a 2025-10-31 | Histórico de bajas (único `tipo=Baja`). Predominan motivos “Abandono / No regresó” (222), “Otra razón” (129) y “Término del contrato” (129). |
| `incidencias` | 7 180 | 2025-01-01 a 2025-12-31 | Incidencias de asistencia con código (`inci`). Solo hay datos 2025: vacaciones (`VAC`) 55%, faltas (`FI`) 12%, enfermedad (`ENFE`) 9%, permisos sin goce (`PSIN`) 9%, etc. |
| `asistencia_diaria` | 2 597 | 2025-10-16 a 2025-10-22 (7 días) | Registro de horas trabajadas/incidencia por día. 371 empleados con marcaje; dataset aún muy parcial. |
| Vistas `ml_*_features` | derivadas | Construidas sobre `empleados_sftp`, `incidencias`, `motivos_baja` | Tablas de características para analítica/predictivo (rotación, ausentismo, productividad, etc.). No almacenan históricos por fecha. |

## 2. KPIs del tablero (corte octubre 2025, filtros abiertos)

Los cálculos siguientes usan únicamente datos disponibles en Supabase.

- **Empleados activos (348 en UI)**  
  - Empleados con `fecha_ingreso ≤ 2025-09-30` y `sin fecha_baja antes de 2025-10-31`: 348.  
  - Si se incluyen altas durante octubre el total sube a 361. La UI parece usar el headcount al inicio del mes (sin las altas del mismo mes).

- **Rotación mensual (4.6%)**  
  - Bajas octubre 2025: 16 (`motivos_baja`) → 16 / 348 ≈ 4.6%.  
  - Octubre 2024 tuvo 25 bajas con headcount inicial 327 ⇒ 7.6%.

- **Rotación acumulada (64.2%)**  
  - Bajas ene–oct 2025: 207.  
  - Headcount al 1-ene-2025: 322.  
  - 207 / 322 = 64.3% → coincide con KPI.  
  - Para ene–oct 2024: 202 bajas y 284 empleados al 1-ene-2024 ⇒ 71.1%.

- **Rotación Año Actual (62.3%)**  
  - Mismo numerador (207).  
  - Denominador implícito ≈ 332 (207 / 0.623). Corresponde al promedio de headcount entre ene-2024 y oct-2025 (332.5).  
  - Sugerencia: documentar/confirmar si el KPI debe usar promedio móvil de 22 meses o solo del año en curso.  
  - Valor comparable esperado para oct 2024: 202 bajas ÷ promedio ene-2023–oct-2024 (288.6) ⇒ 70.0%.

- **Incidencias (54) y Permisos (262)**  
  - Octubre 2025: `incidencias` registra 331 eventos totales (272 permisos: códigos `VAC`, `PCON`, `MAT3`, `MAT1`, `PATER`, `JUST`).  
  - Septiembre 2025: 645 totales / 468 permisos.  
  - No existe información 2024 en `incidencias`, por lo que comparativos vs mismo mes año anterior devolverán 0 por falta de base.

## 3. Qué debería mostrar cada sección

- **Resumen**  
  - KPIs principales anteriores.  
  - Tarjetas vs mes anterior deberían usar comparativos reales (p.ej. Rotación mensual sep 2025 = 4.96%).  
  - Para comparativo interanual, validar fuentes: rotación tiene histórico 2023+, incidencias/permisos no.

- **Personal**  
  - Segmentación por `clasificación` (Sindicalizados 683 vs Confianza 328), género (revisar nulos), área (47% “Desconocido”: limpiar catálogo), ubicación, empresa (318 en “MOTO REPUESTOS MONTERREY”).  
  - Curva de antigüedad: 207 bajas en 2025 y altas 2025 (243) permiten analizar churn neto.  
  - Atención a empleados sin `área/puesto` definidos que impactan filtros.

- **Incidencias**  
  - Series mensuales 2025 (enero-julio con >750 incidencias, octubre cae por dataset parcial?).  
  - Distribución de códigos (`VAC`, `FI`, `ENFE`, `PSIN`).  
  - Dado que no hay registros 2024, comparativos interanuales deben manejarse como “sin datos” en lugar de 0.

- **Rotación**  
  - Tendencias de bajas: 17→22→24... hasta 16 en octubre 2025.  
  - Motivos principales (abandono, término contrato, otra razón).  
  - KPIs trimestrales / rolling 12 meses: ene-oct 2025 = 207 bajas; nov-2024–oct-2025 = 245 bajas.  
  - Comparativo 2024 disponible: ene-oct = 202 bajas; rolling nov-2023–oct-2024 = 216.

- **Tendencias**  
  - Para asistencia, solo hay datos 16–22 oct 2025 (2597 registros). Necesario poblar resto del histórico antes de mostrar análisis de ausentismo o puntualidad.  
  - Incidencias posteriores a oct 2025 (nov-dic) casi vacías (39/40 registros) → revisar pipeline de carga.

## 4. Diagnóstico del “+100% vs mismo mes año anterior”

1. **Valores reales octubre 2025**  
   - Rotación acumulada: 64.3% (207 bajas / 322 headcount inicial).  
   - Rotación año actual: 62.3% (207 / promedio 332.5).  
2. **Valores esperados octubre 2024**  
   - Rotación acumulada: 71.1% (202 bajas / 284 headcount inicial).  
   - Rotación año actual: ≈70.0% (202 / promedio 288.6).  
3. **Por qué la UI muestra 0.0%**  
   - El comparativo v.s. año anterior parece recuperar 0 porque la consulta de referencia no encuentra datos; sin embargo `motivos_baja` sí contiene 2024.  
   - Posibles causas a validar en el código/API:  
     - Filtro de año aplica sobre `asistencia_diaria` o `incidencias` (que no tienen 2024), y la rotación se calcula después de un `JOIN` sin matching, dejando 0.  
     - La vista/fuente utilizada para “mismo mes año anterior” utiliza el headcount del año actual pero no las bajas 2024 (por ejemplo, tomando `SELECT ... WHERE anio = :anio_actual` y luego intentando localizar `anio - 1`, que no existe en la subconsulta).  
     - Normalización de fechas: si se guarda `anio` como texto y la UI envía `2025`, el cálculo del año anterior podría traducirse a `2024` pero la query trabaja con `YEAR(fecha_baja)` y la columna está nula en la fuente seleccionada.
4. **Recomendación**  
   - Ejecutar la misma consulta backend para oct 2024 y verificar joins o filtros; en ausencia de datos, mostrar mensaje “sin histórico” en lugar de 0.0% y evitar el incremento forzado a +100%.  
   - Garantizar que la fuente del comparativo sea `motivos_baja` y el denominador documentado (inicio de año o promedio elegido).

## 5. Próximos pasos sugeridos

1. Revisar ETL para completar históricos 2024 en `incidencias` y toda la serie en `asistencia_diaria`; sin ello los módulos “Incidencias” y “Tendencias” quedan truncos.  
2. Documentar fórmulas de KPIs (especialmente “Rotación Año Actual”) y sincronizar denominadores en frontend/backend.  
3. Normalizar catálogos (`área`, `departamento`, `ubicación`) para reducir registros “Desconocido” que afectan filtros.  
4. Validar que los comparativos interanuales trabajen con datasets que realmente tienen información del año previo; de lo contrario, exponer advertencia visual.

---

_Fuente: consultas directas vía MCP Supabase (`public.empleados_sftp`, `motivos_baja`, `incidencias`, `asistencia_diaria`). Corte generado el 2025-11-03._
