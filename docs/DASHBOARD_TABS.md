# 📊 Dashboard Tabs - HR KPI Analysis

Documentación detallada de cada pestaña del Dashboard MRM de RRHH con sus respectivos cálculos y funcionalidades.

## 🏠 Tab: Resumen (Home)

**Propósito**: Vista general de los KPIs principales con métricas clave del período actual.

### KPIs Mostrados

#### Principales
- **Activos**: Empleados activos al final del período
- **Activos Promedio**: Promedio de empleados durante el período
- **Días**: Días únicos con actividad registrada
- **Bajas**: Empleados dados de baja en el período

#### Retención  
- **Rotación Mensual**: (Bajas / Activos Promedio) × 100
- **Bajas Tempranas**: Empleados que trabajaron < 3 meses

#### Incidencias
- **Incidencias**: Total de incidencias en el período
- **Inc prom x empleado**: Incidencias / Activos Promedio
- **Días Laborados**: (Activos / 7) × 6 (estimación)
- **%incidencias**: (Incidencias / Días Laborados) × 100

### Fuente de Datos
- **KPI Cards**: `kpi-calculator.ts`
- **Período por Defecto**: Mensual
- **Actualización**: Real-time con filtros

---

## 👥 Tab: Personal

**Propósito**: Análisis de headcount, activos y evolución del personal.

### Visualizaciones

#### 1. Gráfico Activos por Mes (Líneas)
```javascript
// Datos: Últimos 12 meses
// X-Axis: Mes (MMM yyyy)
// Y-Axis: Número de activos
// Fuente: PLANTILLA (empleados al final del mes)
```

#### 2. Evolución de Personal (Área)
```javascript
// Series: Activos, Nuevos Ingresos
// Período: 12 meses móviles
// Cálculo: Headcount PLANTILLA por mes
```

### KPIs Específicos
- **Crecimiento Mensual**: Variación de activos mes a mes
- **Tasa de Ingreso**: Nuevos empleados / Activos Promedio
- **Estabilidad**: Desviación estándar de activos

### Fórmulas
```javascript
// Activos al final del mes
activos = empleados.filter(emp => 
  fechaIngreso <= finMes && 
  (!fechaBaja || fechaBaja > finMes)
).length;

// Nuevos ingresos del mes
nuevosIngresos = empleados.filter(emp =>
  fechaIngreso >= inicioMes && 
  fechaIngreso <= finMes
).length;
```

---

## ⚠️ Tab: Incidencias

**Propósito**: Análisis de incidencias, ausentismo y comportamiento laboral.

### Visualizaciones

#### 1. Incidencias por Mes (Barras)
```javascript
// X-Axis: Mes
// Y-Axis: Número de incidencias
// Fuente: Tabla INCIDENCIAS
```

#### 2. Tipos de Incidencias (Donut)
```javascript
// Categorías: Tardanza, Falta, Otros
// Valores: Count por tipo
// Período: Seleccionado por usuario
```

#### 3. %Incidencias Tendencia (Líneas)
```javascript
// Fórmula: (Incidencias / Días Laborados) × 100
// Tendencia: 12 meses móviles
// Meta: <5% mensual
```

### Métricas Clave
- **Inc prom x empleado**: Total incidencias / Activos Promedio
- **Tasa de Ausentismo**: % días con incidencias vs días laborables
- **Patrones**: Días de la semana con más incidencias

### Análisis Específico
```javascript
// Días laborados estimados
diasLaborados = Math.round((activos / 7) * 6); // 6 días laborables por semana

// Porcentaje de incidencias
porcentajeIncidencias = (totalIncidencias / diasLaborados) * 100;

// Incidencias por empleado
incPorEmpleado = totalIncidencias / activosPromedio;
```

---

## 🔄 Tab: Retención

**Propósito**: Análisis de rotación, bajas y retención de personal.

### Visualizaciones Principales

#### 1. Rotación Mensual por Mes (Líneas)
```javascript
// Fórmula: (Bajas del mes / Activos Promedio) × 100
// Período: Últimos 12 meses
// Y-Axis: Porcentaje de rotación
// Rango Normal: 5-15% mensual
```

#### 2. Rotación 12 Meses Móviles (Múltiples Líneas)
```javascript
// Series Múltiples:
// - Rotación % (Eje Izquierdo)
// - Bajas (Eje Derecho)  
// - Activos (Eje Derecho)
// Coordenadas: Dual Y-axis para mejor visualización
```

#### 3. Rotación por Temporalidad (Barras Apiladas)
```javascript
// Categorías:
// - < 3 meses (rojo): Rotación temprana
// - 3-6 meses (naranja): Rotación media-temprana
// - 6-12 meses (amarillo): Rotación media
// - +12 meses (verde): Rotación tardía
```

### Cálculos de Retención

#### Rotación Mensual (KPI Principal)
```javascript
// Empleados al inicio del mes
empleadosInicio = plantilla.filter(emp => 
  fechaIngreso <= inicioMes && 
  (!fechaBaja || fechaBaja > inicioMes)
).length;

// Empleados al final del mes
empleadosFin = plantilla.filter(emp => 
  fechaIngreso <= finMes && 
  (!fechaBaja || fechaBaja > finMes)  
).length;

// Activos promedio (denominador correcto)
activosPromedio = (empleadosInicio + empleadosFin) / 2;

// Bajas del período
bajas = plantilla.filter(emp => 
  fechaBaja >= inicioMes && 
  fechaBaja <= finMes
).length;

// Rotación mensual
rotacionMensual = (bajas / activosPromedio) * 100;
```

#### Clasificación por Temporalidad
```javascript
// Cálculo de meses trabajados
mesesTrabajados = (fechaBaja - fechaIngreso) / (1000 * 60 * 60 * 24 * 30);

// Clasificación:
if (mesesTrabajados < 3) → bajasMenor3m
else if (mesesTrabajados < 6) → bajas3a6m  
else if (mesesTrabajados < 12) → bajas6a12m
else → bajasMas12m
```

### Interpretación de Métricas
- **2-5%**: Rotación saludable
- **5-10%**: Rotación normal para la industria
- **10-15%**: Rotación alta, requiere atención
- **>15%**: Rotación crítica, requiere acción inmediata

---

## 📈 Tab: Tendencias

**Propósito**: Análisis histórico comparativo y proyecciones futuras.

### Visualizaciones Avanzadas

#### 1. Comparativo Anual (Líneas Múltiples)
```javascript
// Comparación: Año actual vs año anterior
// Métricas: Todos los KPIs principales
// Período: 12 meses completos
```

#### 2. Tendencias Estacionales (Heat Map)
```javascript
// X-Axis: Meses (1-12)
// Y-Axis: KPIs principales
// Color: Intensidad del valor
// Patrón: Identificación de estacionalidades
```

#### 3. Proyecciones (Área con Bandas de Confianza)
```javascript
// Algoritmo: Regresión lineal simple
// Confianza: 95% intervalo
// Horizon: 3-6 meses futuros
```

### Análisis Estadístico

#### Cálculo de Tendencias
```javascript
// Tendencia lineal (pendiente)
tendencia = (sumaXY - n*promedioX*promedioY) / 
           (sumaX2 - n*promedioX*promedioX);

// Interpretación:
// tendencia > 0: Creciente
// tendencia < 0: Decreciente  
// |tendencia| < 0.1: Estable
```

#### Variabilidad
```javascript
// Coeficiente de variación
CV = (desviacionEstandar / promedio) * 100;

// Estabilidad:
// CV < 15%: Muy estable
// 15% ≤ CV < 25%: Moderadamente estable  
// CV ≥ 25%: Inestable
```

---

## 🤖 Tab: IA Generativa

**Propósito**: Insights automáticos y recomendaciones basadas en IA.

### Motor de Análisis

#### Detección Automática
```javascript
// Algoritmos implementados:
1. Detección de tendencias (cambios >15%)
2. Identificación de anomalías (violación de reglas de negocio)
3. Generación de recomendaciones
4. Proyecciones futuras
```

#### Tipos de Insights
- **Tendencias**: Cambios significativos período a período
- **Anomalías**: Violaciones de umbrales críticos
- **Recomendaciones**: Sugerencias basadas en patrones
- **Proyecciones**: Estimaciones para períodos futuros

#### Clasificación por Impacto
```javascript
// Alto Impacto: Requiere acción inmediata
// Medio Impacto: Requiere monitoreo
// Bajo Impacto: Para información general

// Confidence Score: 0-100%
// Basado en: Calidad de datos, patrones históricos, correlaciones
```

---

## ⚙️ Tab: Ajustes

**Propósito**: Sistema de ajustes retroactivos con auditoría completa.

### Funcionalidades

#### 1. Selector de KPI Visual
- Interfaz para seleccionar KPI a ajustar
- Visualización del valor actual vs propuesto
- Impacto en KPIs relacionados

#### 2. Sistema de Auditoría
```javascript
// Registro obligatorio:
- Usuario que realiza el ajuste
- Fecha y hora del cambio
- Valor anterior vs nuevo valor
- Justificación detallada
- Nivel de impacto clasificado
```

#### 3. Historial de Cambios
- Lista cronológica de todos los ajustes
- Filtros por período, usuario, KPI
- Capacidad de revertir cambios
- Trazabilidad completa

### Validaciones
- Rangos permitidos por KPI
- Validación de consistencia con otros KPIs
- Aprobación requerida para cambios de alto impacto
- Respaldo automático antes de cambios

---

## 🔧 Configuración Técnica

### Arquitectura de Tabs
```javascript
// dashboard-page.tsx estructura:
<Tabs defaultValue="resumen">
  <TabsList>
    <TabsTrigger value="resumen">Resumen</TabsTrigger>
    <TabsTrigger value="personal">Personal</TabsTrigger>
    <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
    <TabsTrigger value="retencion">Retención</TabsTrigger>
    <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
    <TabsTrigger value="ai">IA Generativa</TabsTrigger>
    <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
  </TabsList>
  
  <TabsContent value="resumen">
    <KPICards + OverviewCharts />
  </TabsContent>
  <!-- Otros tabs -->
</Tabs>
```

### Componentes por Tab
| Tab | Componente Principal | Archivos Clave |
|-----|---------------------|-----------------|
| Resumen | KPICards | `kpi-card.tsx`, `kpi-calculator.ts` |
| Personal | PersonalCharts | `personal-charts.tsx` |
| Incidencias | IncidencesCharts | `incidences-charts.tsx` |
| Retención | RetentionCharts | `retention-charts.tsx` |
| Tendencias | TrendsCharts | `trends-charts.tsx` |
| IA | AIInsights | `ai-insights.tsx`, `ai-analyzer.ts` |
| Ajustes | RetroactiveAdjustment | `retroactive-adjustment.tsx` |

### Performance Considerations
- Lazy loading de tabs no activos
- Caching de datos pesados (12 meses)
- Debouncing en filtros
- Memoización de cálculos complejos
- Virtual scrolling para listas largas

---

## 📝 Notas de Desarrollo

### Cambios Recientes (Septiembre 2025)
1. ✅ Implementación de cálculo correcto de "Activos Promedio"
2. ✅ Corrección de fórmula de rotación mensual
3. ✅ Actualización de gráficos para usar datos de PLANTILLA
4. ✅ Cambio de período por defecto de 'alltime' a 'monthly'
5. ✅ Eliminación de metas hardcodeadas en KPI cards

### Próximas Mejoras
- [ ] Implementación de comparativos año vs año
- [ ] Agregación de filtros por departamento
- [ ] Exportación de reportes por tab
- [ ] Integración de notificaciones automáticas

---

*Documentación actualizada: Septiembre 2025*  
*Para referencia técnica, consultar: `apps/web/src/components/dashboard-page.tsx`*