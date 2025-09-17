# 📋 Guía de Aplicación de Filtros

Esta guía documenta exactamente dónde se aplican y dónde NO se aplican los filtros en el dashboard.

## 🎯 DÓNDE SÍ SE APLICAN LOS FILTROS

### Tab "Personal" (Headcount)
✅ **Todos los gráficos y métricas utilizan filtros**
- Distribución por género
- Distribución por edad
- Headcount por departamento
- Headcount por área
- Antigüedad por área
- **Razón**: Análisis específico del personal filtrado

### Tab "Incidencias"
✅ **Todas las tablas y gráficos utilizan filtros**
- Tabla de incidencias por empleado
- Gráfico de incidencias vs empleados
- Tendencias mensuales de incidencias y permisos
- **Razón**: Análisis específico de incidencias del grupo filtrado

### Tab "Tendencias"
✅ **Todas las métricas utilizan filtros**
- KPIs históricos por período
- Análisis de tendencias
- **Razón**: Análisis de tendencias del grupo específico filtrado

### KPIs del Header Principal
✅ **Algunos KPIs utilizan filtros, otros NO**
- **CON FILTROS**: Activos Promedio, Bajas, Rotación Mensual
- **SIN FILTROS**: Rotación Acumulada (siempre datos generales de empresa)

## 🚫 DÓNDE NO SE APLICAN LOS FILTROS

### Tab "Retención"
❌ **Los gráficos de tendencias generales NO utilizan filtros**
- Gráfico de rotación mensual histórica
- Gráfico de rotación acumulada 12 meses
- Gráfico de comparación año actual vs anterior
- **Razón**: Son métricas generales de toda la empresa para análisis de tendencias

### Rotación Acumulada en Header
❌ **Siempre muestra datos de toda la empresa**
- Esta métrica específica ignora todos los filtros
- **Razón**: Es un KPI general de empresa, no departamental

## 🔧 CONFIGURACIÓN TÉCNICA

### Funciones de Filtrado

```typescript
// Para datos CON filtros (departamental)
const filterPlantilla = (plantillaData: PlantillaRecord[]) => {
  return applyRetentionFilters(plantillaData, retentionFilters);
};

// Para datos SIN filtros (empresa general)
const noFiltersForGeneralRotation = (plantillaData: PlantillaRecord[]) => {
  return plantillaData; // Usa TODOS los empleados
};

// Para datos sin restricción de mes (12 meses móviles)
const filterPlantilla12mNoMonth = (plantillaData: PlantillaRecord[]) => {
  const filtersWithoutMonth = {
    ...retentionFilters,
    months: [] // Remove month restriction
  };
  return applyRetentionFilters(plantillaData, filtersWithoutMonth);
};
```

### Archivos Principales

- `dashboard-page.tsx`: Lógica principal de filtros
- `filter-panel.tsx`: Panel de control de filtros
- `incidents-tab.tsx`: Tab de incidencias (CON filtros)
- `retention-charts.tsx`: Tab de retención (SIN filtros en gráficos generales)

## 📊 LÓGICA DE NEGOCIO

### ¿Por qué algunos no usan filtros?

1. **Rotación Acumulada**: Es una métrica de benchmarking de toda la empresa
2. **Gráficos de Retención**: Muestran tendencias históricas generales para contexto
3. **Comparaciones Anuales**: Necesitan datos completos para ser significativas

### ¿Por qué otros sí usan filtros?

1. **Análisis Departamental**: Para ver KPIs específicos de equipos
2. **Incidencias**: Para analizar problemas de grupos específicos
3. **Personal**: Para análisis demográfico de departamentos