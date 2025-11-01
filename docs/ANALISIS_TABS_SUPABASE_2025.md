# Análisis funcional de las tabs principales del dashboard (Supabase)

**Fecha de análisis:** 2025-10-31  
**Tablas analizadas:** `public.empleados_sftp`, `public.asistencia_diaria`, `public.incidencias`, `public.motivos_baja`  
**Cobertura actual de datos:**

- `empleados_sftp`: 1,011 registros (361 activos / 650 inactivos). Altas desde 2001-06-16 hasta 2025-10-27.
- `asistencia_diaria`: 2,597 registros entre 2025-10-16 y 2025-10-22 (promedio 6.29 h trabajadas, 0 ausencias registradas).
- `incidencias`: 7,180 registros de 2025-01-01 a 2025-12-31 (473 empleados involucrados; códigos dominantes: VAC 55%, FI 12%).
- `motivos_baja`: 628 registros de 2023-01-02 a 2025-10-31 (622 empleados únicos; principales motivos: “Abandono / No regresó” 26%, “Término del contrato” 21%*).

> \*Existen variantes con caracteres mal codificados (por ejemplo `Otra raz?n`). Conviene normalizar acentos en carga para asegurar agregaciones consistentes.

## Filtros globales y prácticas actuales

- `apps/web/src/lib/filters/filters.ts` centraliza la lógica (`applyRetentionFilters`).  
  - Filtra por Año, Mes, Empresa, Área, Departamento, Puesto, Clasificación y Ubicación.  
  - Normaliza valores (minúsculas, sin acentos) antes de comparar.  
  - El filtro de mes se ignora de forma controlada en gráficos de series largas (12M, YTD) como se especifica en `docs/FILTROS_Y_FORMULAS_POR_TAB.md`.
- RLS activo en las cuatro tablas: lectura para `anon/authenticated` limitada por `user_empresa()` salvo en `incidencias` y `motivos_baja`, donde existe política global pero también una variante filtrada por empresa.
- No hay llaves foráneas declaradas entre tablas; las relaciones se resuelven a nivel de aplicación (por ejemplo, `asistencia_diaria.numero_empleado → empleados_sftp.numero_empleado`). Recomendado agregar FKs cuando la limpieza de datos lo permita.
- Índices disponibles cubren id, campos de búsqueda (empresa, fecha, tipo). Evitar duplicados (`idx_asistencia_numero` replica `idx_asistencia_numero_empleado`); podría consolidarse para mantener solo un índice por campo.

---

## Tab Resumen

### Dataset base
- `empleados_sftp`: determina headcount, antigüedad y atributos organizacionales.
- `motivos_baja`: clasifica bajas voluntarias/involuntarias (aporta contexto para desgloses).
- `incidencias`: alimenta KPIs de incidencias/permisos y series de 12M.
- `asistencia_diaria`: calcula activos promedio y días laborados mediante horas registradas.

### KPIs

| Indicador | Fórmula (campo origen) | Ventana temporal | Filtros aplicados |
|-----------|------------------------|------------------|-------------------|
| **Empleados Activos** | Conteo de `empleados_sftp.activo = true` al cierre del periodo | Mes seleccionado (o actual por defecto) | 🟢 Año, Mes, Empresa, Área, Depto, Puesto, Clasificación, Ubicación |
| **Rotación Mensual** | `(BajasMes ÷ ActivosPromMes) × 100`; bajas = `fecha_baja` dentro del mes | Mes seleccionado | 🟢 |
| **Rotación Acumulada 12M** | `(Bajas últimos 12 meses ÷ Promedio activos 12M) × 100` (`calculateRotacionAcumulada`) | 12 meses hasta mes seleccionado | 🟡 Ignora filtro de mes explícito, respeta resto |
| **Rotación Año Actual** | `(Bajas desde enero ÷ Promedio activos YTD) × 100` (`calculateRotacionAnioActual`) | Enero → mes seleccionado | 🟡 |
| **Incidencias** | Conteo `incidencias` con códigos FI, SUS, PSIN, ENFE | Periodo seleccionado | 🟢 |
| **Permisos** | Conteo `incidencias` con códigos VAC, PCON, MAT3, MAT1, JUST | Periodo seleccionado | 🟢 |

Los KPIs comparan contra el mes previo (o el mismo periodo anterior en acumulados) y muestran variación porcentual salvo en headcount, donde la variación es absoluta.

### Gráficas y tablas

- **Activos por antigüedad** (barras apiladas): buckets 0-3m, 3-6m, 6-12m, 1-3a, +3a. Filtrado 🟢, calcula antigüedad con `fecha_ingreso`.
- **Rotación Mensual / 12M / YTD** (líneas): comparan negocios, ignoran el filtro de mes (🟡) para mostrar ventanas móviles completas. Usa `bajas` y `activos` del dataset filtrado.
- **Incidencias y Permisos 12M** (líneas): agrega `incidencias` según código; ignora mes (🟡) para mostrar tendencia anual.
- **Tabla de Ausentismo**: combina `asistencia_diaria` (horas_incidencia > 0) para total, permisos, faltas. Filtrado 🟢.

### Foto actual de datos relevantes
- Headcount activo (sin filtros adicionales): 361 personas (185 sindicalizados, 176 confianza).
- Principales áreas activas: Empaque (43), Surtido (35), Supermoto (34), Reabasto (27), Recibo (26).
- Promedio de horas trabajadas registradas en la semana 2025-10-16→2025-10-22: 6.29 h (revisar si faltan registros de jornada completa).

### Observaciones y mejores prácticas
- Validar que `asistencia_diaria` represente días hábiles completos; hoy no se registran ausencias (`presente = true` en 100%).  
- Recomendar FK `asistencia_diaria.numero_empleado → empleados_sftp.numero_empleado` para reforzar integridad.
- Unificar valores de `motivos_baja` (acentos) para evitar separar “Otra razón” en múltiples claves.

---

## Tab Personal

### Dataset base
- `empleados_sftp` (principal) con join opcional a `asistencia_diaria` para métricas de días/activos promedio.
- No consume `incidencias` ni `motivos_baja` salvo para mostrar bajas históricas.

### KPIs

| Indicador | Fórmula | Filtros |
|-----------|---------|---------|
| **Empleados Activos** | Conteo `activo = true` | 🟢 |
| **Bajas Totales** | Conteo `fecha_baja IS NOT NULL` (histórico) | 🟢 |
| **Ingresos Históricos** | Conteo `fecha_ingreso <= hoy` | 🟢 |
| **Ingresos del Mes** | Conteo `fecha_ingreso` dentro del mes filtrado | 🟢 |
| **Antigüedad Promedio** | Promedio `NOW() - fecha_ingreso` (solo activos filtrados) | 🟢 |
| **Activos Promedio** | Promedio de activos inicio/fin de periodo (usa helper `calculateActivosPromedio`) | 🟢 |
| **Empleados < 3 meses** | Conteo `antigüedad < 90 días` (solo activos) | 🟢 |

### Visualizaciones

- **Distribución por Clasificación / Área / Ubicación** (barras o pie): agrupan `empleados_sftp` tras aplicar filtros normalizados.  
- **Antigüedad por Área**: buckets definidos en helpers (`TENURE_COLORS`).  
- **Tabla detalle de empleados** (si la tab la expone): respeta filtros 🟢 y muestra información de identificación básica.

### Foto actual de datos relevantes
- Clasificación activa: Sindicalizados 185 (51%), Confianza 176 (49%).
- Ingresos recientes: últimos ingresos registrados hasta 2025-10-27.
- Altas y bajas en 2025 deben revisarse con el filtro de mes para asegurar que el pipeline ETL capture movimientos recientes.

### Observaciones y mejores prácticas
- Añadir validaciones de integridad para `fecha_baja >= fecha_ingreso`.  
- Considerar índice compuesto `(empresa, activo)` para acelerar conteos frecuentes (ya existen índices independientes; verificar sobrecarga).
- Normalizar campos de texto (`departamento`, `area`, `puesto`) para reducir duplicidades (“Empaque” vs “Empaque ”).

---

## Tab Incidencias

### Dataset base
- `incidencias`: registros CSV enriquecidos con datos de `empleados_sftp` en el frontend (`EnrichedIncidencia`).  
- No se filtra por `activo`; se muestran incidencias históricas de cualquier empleado.  
- Paginación implementada en `getIncidenciasCSV()` para traer >1,000 filas.

### KPIs

| Indicador | Fórmula | Filtro de datos |
|-----------|---------|-----------------|
| **# de Activos (referencia)** | Conteo de plantilla filtrada (`countActivosEnFecha`) | 🟢 |
| **Empleados con Incidencias** | `COUNT(DISTINCT emp)` en incidencias filtradas por código | 🔵 (sin filtro de activos) |
| **Incidencias** | Conteo incidencias con códigos FI, SUS, PSIN, ENFE | 🔵 |
| **Permisos** | Conteo con códigos VAC, PCON, MAT3, MAT1, JUST | 🔵 |
| **Incidencias promedio por empleado** | Incidencias ÷ Activos promedio (usa KPI de referencia) | KPIs mezclan datos 🔵/🟢 |
| **% Incidencias** | Incidencias ÷ Días laborados estimados | 🔵 incidencias, 🟢 asistencia |

Leyenda: 🔵 = histórico completo (sin filtrar por `activo`), 🟢 = respeta todos los filtros.

### Visualizaciones

- **Tendencia mensual 12M** (línea): agrupa por mes, ignora filtro de mes para mostrar todo el año.  
- **Incidencias por empleado** (histograma): buckets según número de incidencias por empleado.  
- **Tabla por tipo**: `count(*)` y `count(distinct emp)` por `inci`.  
- **Pie Incidencias vs Permisos**: dos categorías con etiquetas internas/externas personalizadas.  
- **Tabla completa de incidencias**: paginada, incluye fecha, código, turnos, horario y observaciones.

### Foto actual de datos relevantes

- Total incidencias 2025: 7,180 (55% vacaciones, 12% faltas FI, 9% enfermedad ENFE).  
- Permisos predominantes: VAC (3,938), PCON (334), MAT3 (426).  
- 473 empleados con al menos una incidencia; revisar concentración por departamento para planes de acción.

### Observaciones y mejores prácticas

- Persistir `normalizeIncidenciaCode` en base de datos para evitar duplicados en agregaciones.  
- Revisar valores `status` y `turno` (índices existen, asegurarse de que se usen en consultas analíticas).  
- Considerar FK `incidencias.emp → empleados_sftp.numero_empleado` para evitar registros huérfanos.

---

## Tab Rotación

### Dataset base
- `empleados_sftp`: fuente de altas/bajas y atributos.  
- `motivos_baja`: razones y clasificación (voluntaria/involuntaria).  
- `asistencia_diaria`: aporta headcount promedio (vía `calculateActivosPromedio`).  
- `incidencias`: solo para contextualizar si se cruzan métricas (no directamente en gráficas principales).

### KPIs principales

| Indicador | Fórmula | Ventana | Filtros |
|-----------|---------|---------|---------|
| **Activos Promedio** | `(Activos inicio + Activos fin) ÷ 2` | Mes seleccionado | 🟢 |
| **Bajas Totales** | Conteo `fecha_baja IS NOT NULL` (con filtros) | Mes y acumulados | 🟢 |
| **Bajas Tempranas (<3m)** | Conteo `DATEDIFF(fecha_baja, fecha_ingreso) < 90` | Mes seleccionado | 🟢 |
| **Rotación Mensual** | `(Bajas del mes ÷ Activos Promedio) × 100` | Mes seleccionado | 🟢 |
| **Rotación 12M** | `(Bajas últimos 12M ÷ Promedio activos 12M) × 100` | Ventana móvil | 🟡 |
| **Rotación Año Actual** | `(Bajas enero→mes ÷ Promedio activos YTD) × 100` | YTD | 🟡 |
| **Rotación Voluntaria/Involuntaria** | Separa motivos (`isMotivoClave`) antes de agrupar | Igual que métrica base | 🟢 |

### Visualizaciones

- **Series de Rotación** (mensual, 12M, YTD): comparan contra año previo, ignoran filtro de mes (🟡).  
- **Bajas por temporalidad**: usa `plantilla` filtrada para segmentar <3, 3-6, 6-12, >12 meses.  
- **Tabla de Rotación**: compara periodos (mes actual vs previo / año actual vs año anterior) con variaciones coloreadas.  
- **Motivos de baja**: barras o tablas utilizando `motivos_baja`; requiere normalizar texto para agrupar correctamente.

### Foto actual de datos relevantes

- Bajas registradas en 2025: 628 (motivos con mayor frecuencia: Abandono/No regresó 168, Término del contrato 129*).  
- La ventana 12M se alimenta correctamente hasta 2025-10-31; garantizar carga mensual de `motivos_baja` para no romper comparativos.

> \*Se sumaron variantes mal codificadas (`T?rmino`) para estimar el total real.

### Observaciones y mejores prácticas

- Incorporar una tabla de motivos normalizados (`motivos_catalogo`) para mapear texto → categoría.  
- Implementar FK `motivos_baja.numero_empleado → empleados_sftp.numero_empleado`.  
- Considerar triggers o cron jobs que validen consistencia (por ejemplo, empleados con `activo = true` y `fecha_baja NOT NULL`).

---

## Recomendaciones transversales

- **Integridad referencial:** ya existen llaves foráneas entre `asistencia_diaria`, `incidencias`, `motivos_baja` y `empleados_sftp` (ON UPDATE CASCADE / ON DELETE RESTRICT); monitorear cargas futuras para evitar rechazos.  
- **Calidad de datos:** se normalizan automáticamente códigos de incidencias (uppercase/trim) y motivos de baja mediante trigger (`normalize_motivo_text`). Mantener actualizado el catálogo cuando surjan variantes nuevas.  
- **Auditoría de asistencia:** los registros recientes muestran 0 ausencias y horas medias de 6.3; habilitar validaciones para capturar jornadas completas y distinguir permisos vs incidencias reales.  
- **Documentación viva:** mantener sincronizados `docs/FILTROS_Y_FORMULAS_POR_TAB.md` y este resumen al introducir nuevas métricas o cambios de filtro, idealmente con automatización post-deploy.

### Checklist de cargas futuras (SFTP → Supabase)

1. **Sincronizar empleados (`empleados_sftp`) primero.** Las altas o cambios de `numero_empleado` se propagan a tablas hijas gracias al `ON UPDATE CASCADE`.  
2. **Insertar asistencia, incidencias y motivos de baja después** de que exista el empleado padre; si llega un registro huérfano la FK lo rechazará (alerta temprana).  
3. **Permitir deletes solo desde `empleados_sftp`** cuando realmente se quiera depurar histórico. Las FKs con `ON DELETE RESTRICT` exigen retirar primero los registros dependientes.  
4. **Confiar en los triggers de normalización:** no es necesario sanitizar manualmente motivos o códigos; los triggers se encargan de upper-case y corrección de acentos antes de guardar.  
5. **Monitorear fallas de carga:** cualquier error de FK se debe registrar en logs del importador para poder corregir la fuente y reintentar sin intervención manual en la base.
