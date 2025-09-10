# Explicación de Cálculos de Rotación

## 1. Rotación Mensual

**Fórmula:** `(Bajas del mes / Promedio de activos del mes) × 100`

**Cálculo paso a paso:**
1. **Bajas del mes**: Contamos empleados con `fecha_baja` en el mes seleccionado
2. **Promedio de activos**: 
   - Empleados activos al inicio del mes
   - Empleados activos al final del mes  
   - Promedio = (Inicio + Fin) / 2
3. **Rotación** = (Bajas / Promedio) × 100

**Ejemplo Septiembre 2025:**
- Si hay 8 bajas en septiembre
- 87 empleados al inicio, 79 al final
- Promedio = (87 + 79) / 2 = 83
- Rotación = (8 / 83) × 100 = 9.64%

## 2. Rotación Acumulada (12 Meses Móviles)

**Fórmula:** `(Bajas en últimos 12 meses / Promedio de activos del período 12 meses) × 100`

**Cálculo paso a paso:**
1. **Período**: Últimos 12 meses desde el mes seleccionado
   - Si estás en Sept 2025, cuenta desde Oct 2024 hasta Sept 2025
   
2. **Bajas en 12 meses**: Suma todas las bajas con `fecha_baja` en ese período de 12 meses

3. **Promedio de activos del período**:
   - Empleados activos hace 12 meses (inicio del período)
   - Empleados activos al final del mes actual
   - Promedio = (Inicio período + Fin período) / 2

4. **Rotación Acumulada** = (Bajas 12 meses / Promedio) × 100

**Ejemplo para Septiembre 2025:**
- Período: Octubre 2024 a Septiembre 2025 (12 meses)
- Bajas en 12 meses: 15 empleados
- Activos en Oct 2024: 85 empleados
- Activos en Sept 2025: 79 empleados  
- Promedio = (85 + 79) / 2 = 82
- Rotación Acumulada = (15 / 82) × 100 = 18.29%

## Ubicación en el Código

### Dashboard (apps/web/src/components/dashboard-page.tsx)
- **Líneas 291-329**: Cálculo de Rotación Mensual
- **Líneas 331-355**: Cálculo de Rotación Acumulada

### Gráficos (apps/web/src/components/retention-charts.tsx)
- **Líneas 181-218**: Función `calculateRolling12MonthRotation`
- **Líneas 220-259**: Función `calculateMonthlyRetention`

## Datos Fuente

Todos los cálculos usan la tabla **empleados_sftp** que contiene:
- `fecha_ingreso`: Cuándo entró el empleado
- `fecha_baja`: Cuándo salió (NULL si sigue activo)
- `activo`: Estado actual (true/false)

## Valores Normales

- **Rotación Mensual**: 5-15% es normal en la industria
- **Rotación Acumulada 12 meses**: 15-30% anual es típico
- Valores >40% anual indican problemas de retención