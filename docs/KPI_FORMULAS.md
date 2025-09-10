# 📊 KPI Formulas & Calculations - HR Dashboard

Documentación completa de todas las fórmulas de KPIs utilizadas en el Dashboard MRM de RRHH.

## 📋 Índice

1. [KPIs Principales](#kpis-principales)
2. [KPIs de Retención](#kpis-de-retención)
3. [KPIs de Incidencias](#kpis-de-incidencias)
4. [Diferencias Entre Componentes](#diferencias-entre-componentes)
5. [Fuentes de Datos](#fuentes-de-datos)
6. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## 📈 KPIs Principales

### 1. **Activos**
```javascript
// Usando el campo 'activo' de empleados_sftp
Activos = Count(empleados WHERE activo = TRUE)

// Ejemplo: Empleados activos en septiembre 2025
Activos = Empleados con campo activo = TRUE
```

### 2. **Activos Promedio** 
```javascript
// En cards KPI (promedio del período)
Activos_Promedio = (Empleados_Inicio_Período + Empleados_Fin_Período) / 2

// Ejemplo septiembre 2025:
// Inicio: 87 empleados, Fin: 79 empleados
Activos_Promedio = (87 + 79) / 2 = 83 empleados
```

**❓ ¿Por qué son diferentes?**
- **Activos (79)**: Empleados al final del mes (para visualización de tendencias)
- **Activos Promedio (83)**: Promedio del período (para cálculos de rotación precisos)

### 3. **Días**
```javascript
// Días únicos con actividad registrada en asistencia_diaria
Días = Count(DISTINCT fecha FROM asistencia_diaria WHERE fecha BETWEEN inicio_período AND fin_período)

// Ejemplo: 22 días laborables en septiembre
```

---

## 🔄 KPIs de Retención

### 4. **Bajas**
```javascript
// TOTAL de empleados con fecha_baja (histórico)
Bajas_Totales = Count(empleados WHERE fecha_baja IS NOT NULL)

// Bajas del período específico
Bajas_Periodo = Count(empleados WHERE fecha_baja BETWEEN inicio_período AND fin_período)

// Ejemplo: Total histórico vs bajas de septiembre 2025
```

### 5. **Rotación Mensual** ⭐
```javascript
// Fórmula corregida (2025)
Rotación_Mensual = (Bajas_del_Período / Activos_Promedio) * 100

// Ejemplo septiembre 2025:
Rotación_Mensual = (8 / 83) * 100 = 9.64%
```

**📝 Nota**: Esta es la fórmula estándar de RRHH. Valores normales: 2-15% mensual.

### 6. **Rotación Acumulada 12 Meses Móviles** ⭐⭐
```javascript
// VENTANA MÓVIL: Cada mes calcula con los últimos 12 meses
// Ejemplo: Para marzo 2025, usa datos de abril 2024 → marzo 2025

Rotación_Acumulada_12m = (Bajas_en_12_meses / Promedio_Activos_12m) * 100

Donde:
- Bajas_en_12_meses = Count(empleados WHERE fecha_baja BETWEEN (mes_actual - 12) AND mes_actual)
- Promedio_Activos_12m = (Activos_inicio_12m + Activos_fin_12m) / 2

// Ejemplo marzo 2025:
// Período: abril 2024 → marzo 2025
// Bajas_12m = 15 empleados dados de baja en esos 12 meses
// Activos_inicio = 85 empleados (abril 2024)  
// Activos_fin = 79 empleados (marzo 2025)
// Promedio = (85 + 79) / 2 = 82
// Rotación = (15 / 82) * 100 = 18.29%
```

**📝 ¿Por qué "móviles"?**: Porque la ventana de 12 meses se desplaza cada mes. En abril 2025, calculará mayo 2024 → abril 2025, y así sucesivamente.

### 7. **Bajas Tempranas**
```javascript
// Empleados que trabajaron menos de 3 meses
Bajas_Tempranas = Count(empleados WHERE 
    fecha_baja BETWEEN inicio_período AND fin_período 
    AND DATEDIFF(fecha_baja, fecha_ingreso) < 90 días
)
```

### 8. **Bajas por Temporalidad**
```javascript
// Clasificación por tiempo trabajado
Bajas_<3m = empleados con (fecha_baja - fecha_ingreso) < 3 meses
Bajas_3-6m = empleados con 3 ≤ (fecha_baja - fecha_ingreso) < 6 meses  
Bajas_6-12m = empleados con 6 ≤ (fecha_baja - fecha_ingreso) < 12 meses
Bajas_+12m = empleados con (fecha_baja - fecha_ingreso) ≥ 12 meses
```

---

## ⚠️ KPIs de Incidencias

### 8. **Incidencias**
```javascript
// Total de incidencias desde asistencia_diaria
Incidencias = Count(asistencia_diaria WHERE horas_incidencia > 0 AND fecha BETWEEN inicio_período AND fin_período)
```

### 9. **Inc prom x empleado**
```javascript
// Incidencias promedio por empleado
Inc_Prom_x_Empleado = Incidencias / Activos_Promedio

// Ejemplo: 41 incidencias / 83 empleados = 0.49 incidencias por empleado
```

### 10. **Días Laborados**
```javascript
// Estimación de días trabajados
Días_Laborados = (Activos / 7) * 6  // 6 días laborables por semana

// Ejemplo: (79 / 7) * 6 = 67.7 ≈ 68 días laborados
```

### 11. **% Incidencias**
```javascript
// Porcentaje de incidencias sobre días laborados
Porcentaje_Incidencias = (Incidencias / Días_Laborados) * 100

// Ejemplo: (41 / 68) * 100 = 60.29%
```

---

## 🔍 Diferencias Entre Componentes

### **Cards KPI vs Gráficos**

| Componente | Cards KPI | Gráficos Retención |
|------------|-----------|-------------------|
| **Activos** | `Activos Promedio` (83) | `Activos` (79) |
| **Período** | Mensual por defecto | 12 meses históricos |
| **Propósito** | Cálculos precisos | Visualización de tendencias |
| **Fuente** | kpi-calculator.ts | retention-charts.tsx |

### **¿Cuándo usar cada uno?**
- **Cards**: Para reportes oficiales y KPIs corporativos
- **Gráficos**: Para análisis de tendencias y evolución temporal

---

## 💾 Fuentes de Datos

### **Tabla EMPLEADOS_SFTP** (Datos principales desde SFTP)
```sql
- numero_empleado: ID único del empleado
- nombres: Nombres del empleado
- apellidos: Apellidos del empleado
- departamento: RH, Tecnología, Ventas, etc.
- puesto: Cargo actual
- area: Área funcional
- clasificacion: CONFIANZA, SINDICALIZADO, HONORARIOS, EVENTUAL
- activo: true/false (estado actual directo de la tabla)
- fecha_ingreso: Fecha de contratación
- fecha_antiguedad: Fecha de antigüedad (alternativa)
- fecha_baja: Fecha de terminación (NULL si activo)
- motivo_baja: Razón de terminación
```

### **Tabla ASISTENCIA_DIARIA** (Registro de asistencia desde SFTP)
```sql
- numero_empleado: Referencia a EMPLEADOS_SFTP
- fecha: Fecha de la actividad
- horas_trabajadas: Horas trabajadas en el día
- horas_incidencia: Horas de incidencia (si > 0, hubo incidencia)
- presente: true/false (asistencia)
```

### **Tabla MOTIVOS_BAJA** (Detalle de bajas - opcional)
```sql
- numero_empleado: Referencia a EMPLEADOS_SFTP
- fecha_baja: Fecha de la baja
- tipo: Tipo de baja
- motivo: Motivo detallado
- descripcion: Descripción adicional
```

---

## 🧮 Ejemplos Prácticos

### **Caso: Septiembre 2025**

**Datos de entrada:**
- Empleados activos al 1 sep: 87
- Empleados activos al 30 sep: 79
- Bajas en septiembre: 8
- Incidencias en septiembre: 41
- Días laborables: 22

**Cálculos resultantes:**

```javascript
// KPIs Principales
Activos = 79                                    // Final del mes
Activos_Promedio = (87 + 79) / 2 = 83         // Para rotación
Días = 22                                       // Días laborables

// Retención  
Bajas = 8                                       // Solo de septiembre
Rotación_Mensual = (8 / 83) * 100 = 9.64%     // Normal para industria
Bajas_Tempranas = 2                            // Ejemplo

// Incidencias
Incidencias = 41                               // Total del mes
Inc_Prom_x_Empleado = 41 / 83 = 0.49          // Por empleado
Días_Laborados = (79 / 7) * 6 = 68            // Estimación
Porcentaje_Incidencias = (41 / 68) * 100 = 60.29%
```

**Interpretación:**
- ✅ **Rotación 9.64%**: Normal (rango típico 5-15% mensual)
- ⚠️ **60.29% incidencias**: Alto (requiere atención)
- ✅ **83 activos promedio**: Headcount estable

---

## 📊 Fórmulas por Tab del Dashboard

### **Tab Resumen**
- Muestra KPIs principales con vista general
- Usa cálculos de `kpi-calculator.ts`
- Período: Mensual por defecto

### **Tab Personal** 
- Enfoque en headcount y activos
- Gráficos de evolución de personal
- Métricas de crecimiento

### **Tab Incidencias**
- KPIs de incidencias y ausentismo
- Análisis de tipos de incidentes
- Tendencias de comportamiento

### **Tab Retención**
- KPIs de rotación y bajas
- Análisis por temporalidad  
- **3 gráficas especializadas:**
  1. **Rotación Acumulada (12 meses móviles)**: Ventana móvil de 12 meses
  2. **Rotación Mensual**: Rotación mes por mes (NO es 12 meses móviles)
  3. **Rotación por Temporalidad**: Bajas clasificadas por tiempo trabajado

### **Tab Tendencias**
- Proyecciones y análisis predictivo
- Tendencias históricas
- Análisis de patrones

---

## 🔧 Archivos Clave del Código

| Archivo | Responsabilidad |
|---------|----------------|
| `kpi-calculator.ts` | Cálculos principales de KPIs |
| `retention-charts.tsx` | Gráficos de retención |
| `dashboard-page.tsx` | Orchestración principal |
| `kpi-card.tsx` | Visualización de KPIs individuales |

---

## 📝 Notas de Desarrollo

### **Cambios Recientes (Septiembre 2025):**
1. ✅ Corregida fórmula de "Activos Promedio" (antes: Activos/Días, ahora: promedio real)
2. ✅ Corregida "Rotación Mensual" para usar solo bajas del período
3. ✅ Removidas metas hardcodeadas 
4. ✅ Cambiado período por defecto de 'alltime' a 'monthly'
5. ✅ Gráficos usan headcount de PLANTILLA en lugar de tabla ACT
6. ✅ **CORRECCIÓN IMPORTANTE**: Gráfica 2 en Tab Retención renombrada de "Rotación 12 Meses Móviles" a "Rotación Mensual" (la fórmula era correcta, solo el nombre estaba mal)
7. ✅ Documentada fórmula de "Rotación Acumulada 12 Meses Móviles" (ventana deslizante)
8. ✅ Corregidos filtros para usar combinaciones año-mes específicas en lugar de selectedPeriod

### **Diferencias Importantes:**
- **Antes**: Rotación de 200-800% (incorrecta)  
- **Ahora**: Rotación de 2-15% (realista)
- **Antes**: Activos Promedio = 6 (sin sentido)
- **Ahora**: Activos Promedio = 70-85 (correcto)

---

*Documentación actualizada: Septiembre 10, 2025*
*NOTA: Sistema dinámico - solo muestra datos reales de empleados_sftp, no datos futuros*
*Para dudas técnicas, consultar: `apps/web/src/lib/kpi-calculator.ts`*