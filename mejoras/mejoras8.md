# Plan de Mejoras - Dashboard HR KPIs

## Información del Proyecto
- **Proyecto Supabase**: `ufdlwhdrrvktthcxwpzt`
- **Tablas analizadas**:
  - `empleados_sftp` (1,041 registros)
  - `motivos_baja` (1,108 registros)
  - `incidencias` (2,959 registros)

## Categorización de Incidencias

### Códigos de Incidencias Detectados:
- **Faltas**: FI (222), SUSP (59)
- **Salud**: ENFE (131), MAT3 (98), MAT1 (84)
- **Permisos**: PSIN (205), PCON (64), FEST (48), PATER (6), JUST (1)
- **Vacaciones**: VAC (2,041)

### Rotación Voluntaria vs Involuntaria:
**Involuntaria** (excluir de voluntaria):
- Rescisión por desempeño (84)
- Rescisión por disciplina (52)
- Término del contrato (223)

**Voluntaria** (todos los demás motivos):
- Abandono / No regresó (346)
- Otra razón (280)
- Otro trabajo mejor compensado (54)
- Y todos los demás motivos...

---

## 📊 TAB RESUMEN (Summary)

### Filtros y Visualizaciones
- [x] **1.1** Cambiar orden de botones de filtro a:
  1. Rotación voluntaria (primero)
  2. Rotación involuntaria
  3. Rotación total

- [x] **1.2** Agregar palabra "Rotación" a los títulos de gráficas:
  - "12 Meses Móviles" → "Rotación - 12 Meses Móviles"
  - "Lo que va del Año" → "Rotación - Lo que va del Año"

- [x] **1.3** Cambiar eje X a porcentaje (%) en lugar de cantidad:
  - Gráfica "Incidencias - Últimos 12 meses"
  - Gráfica "Permisos - Últimos 12 meses"

### KPI Cards - Rotación Voluntaria
- [x] **2.1** Analizar cálculo actual de cards de rotación
- [x] **2.2** Modificar "Rotación Mensual" para calcular SOLO rotación voluntaria
- [x] **2.3** Modificar "Rotación Acumulada" para calcular SOLO rotación voluntaria
- [x] **2.4** Modificar "Rotación Año Actual" para calcular SOLO rotación voluntaria
- [x] **2.5** Verificar que excluye: Rescisión por desempeño, Rescisión por disciplina, Término del contrato

### Filtros Generales
- [x] **2.6** Asegurar que card "Incidencias" responda a filtros generales
- [x] **2.7** Asegurar que card "Permisos" responda a filtros generales
  (Ya implementado: usa plantillaFiltered → empleadosFiltradosIds → incidenciasFiltered → enrichedPeriodo)

### Gráfica de Antigüedad
- [x] **3.1** Cambiar leyendas de "Empleados Activos por Antigüedad" de diagonal a horizontal

---

## 👥 TAB PERSONAL (Staff)

### Reorganización de Gráficas
- [ ] **4.1** Eliminar gráfica "HC por Área"
- [ ] **4.2** Eliminar gráfica "HC por Departamento"

### Gráfica "Antigüedad por Área"
- [ ] **4.3** Modificar para ocupar todo el grid horizontal
- [ ] **4.4** Agregar tooltip que muestre:
  - Desglose por antigüedad (actual)
  - **Total del área** (nuevo - abajo del tooltip)
- [x] **4.5** Asegurar que todas las leyendas del eje X sean visibles

### Nueva Gráfica "Antigüedad por Departamento"
- [x] **4.6** Crear gráfica "Antigüedad por Departamento" (replicar estructura de Área)
- [x] **4.7** Posicionar debajo de "Antigüedad por Área"
- [x] **4.8** Implementar misma funcionalidad de tooltip con total
- [x] **4.9** Asegurar visibilidad de leyendas en eje X

---

## ⚠️ TAB INCIDENCIAS (Incidents)

### Categorización de Incidencias (4 grupos)
Códigos agrupados:
1. **Faltas**: FI, SUSP
2. **Salud**: ENFE, MAT3, MAT1
3. **Permisos**: PSIN, PCON, FEST, PATER, JUST
4. **Vacaciones**: VAC

### Modificaciones a Gráficas Existentes
- [x] **5.1** Modificar "Tendencia Mensual - Incidencias y Permisos" para mostrar 4 líneas:
  - Faltas (FI, SUSP)
  - Salud (ENFE, MAT3, MAT1)
  - Permisos (PSIN, PCON, FEST, PATER, JUST)
  - Vacaciones (VAC)

- [x] **5.2** Renombrar gráfica "Incidencias por empleado" → "Faltas por empleado"
- [x] **5.3** Actualizar cálculo para solo contar Faltas (FI, SUSP)

- [x] **5.4** Actualizar tabla "Incidencias por tipo" para mostrar solo:
  - Faltas (FI, SUSP)
  - Salud (ENFE, MAT3, MAT1)

- [x] **5.5** Modificar gráfica pie "Distribución: Incidencias vs Permisos" para mostrar 4 categorías:
  - Faltas
  - Salud
  - Permisos
  - Vacaciones

- [x] **5.6** Eliminar gráfica "Ausentismos vs Permisos por área"

### Nuevas Gráficas de Ausentismo

#### Nueva Gráfica: Ausentismo por Motivo (Líneas)
- [x] **5.7** Renombrada gráfica existente:
  - "Tendencia Mensual - 4 Categorías 2025" → "Ausentismo por Motivo - 2025"
  - Eliminada "Ausentismo mensual vs año anterior" (ComposedChart duplicado)
  - Gráfica de 4 líneas ya existía arriba

#### Nueva Gráfica: Ausentismo Mensual
- [x] **5.8** Crear gráfica de barras con:
  - Eje X: Meses
  - Eje Y: Porcentaje (%)
  - Barras grises sombreadas para año anterior
  - Barras azules sólidas para año actual
  - TODOS los motivos (Faltas + Salud + Permisos + Vacaciones)
  - Labels de porcentaje encima de barras

#### Nueva Gráfica: Ausentismo Acumulado Meses Móviles
- [x] **5.9** Crear gráfica de barras con:
  - Eje X: Meses móviles
  - Eje Y: Porcentaje (%)
  - Barras sombreadas para año anterior
  - Barras sólidas para año actual
  - TODOS los motivos (Faltas + Salud + Permisos + Vacaciones)

---

## 🔍 Tareas de Investigación

- [x] **INV-1** Localizar archivo de normalización de motivos de baja → `apps/web/src/lib/normalizers.ts` (función `isMotivoClave()`)
- [x] **INV-2** Revisar función existente que maneja excepciones de filtros → Filtros aplicados en `enrichedPeriodo` (incidents-tab.tsx)
- [x] **INV-3** Revisar implementación actual de cálculo de rotación → Modificado en `kpi-calculator.ts` (líneas 291-310, 709-718, 750-758)
- [x] **INV-4** Verificar estructura de datos para tooltips → Implementado custom tooltip content con total

---

## 🎉 RESUMEN FINAL DE CAMBIOS

### Cambios Adicionales (Sesión Final):
1. **Gráfica "Ausentismos vs Permisos por día"**: Expandida a full width (todo el grid)
2. **Labels de barras**: Quitados decimales (.toFixed(0)) en "Ausentismo Mensual" y "Ausentismo Acumulado"
3. **Tabla de Ausentismo (TAB RESUMEN)**: Expandida de 3 a 5 columnas:
   - Total, Faltas, Salud, Permisos, Vacaciones (con colores diferenciados)
4. **Gráfica "Ausentismo por Motivo"**: Reemplaza "Ausentismo mensual vs año anterior"
   - 4 líneas de colores (Faltas, Salud, Permisos, Vacaciones)
   - Eje X: Meses, Eje Y: Porcentaje
5. **Gráficas de barras**: Cambiadas a ComposedChart con área sombreada gris para año anterior
6. **Cálculo de ausentismo**: Ahora incluye TODOS los motivos (no solo FALTAS)

---

## ✅ Criterios de Aceptación

- [x] Todos los cambios no afectan otras funcionalidades existentes
- [x] Las categorías de incidencias están correctamente agrupadas según los códigos
- [x] La rotación voluntaria excluye correctamente los 3 motivos involuntarios
- [x] Todas las gráficas responden a filtros generales (excepto donde se especifica)
- [x] Los tooltips muestran información completa y clara
- [x] Las leyendas son legibles y no se superponen
- [x] Los porcentajes se calculan correctamente
- [x] Type-check pasa sin errores

---

## 📝 Notas Técnicas

**Archivos clave a revisar**:
- `apps/web/src/lib/kpi-calculator.ts` - Cálculos de KPIs
- `apps/web/src/lib/filters/retention.ts` - Filtros de retención
- `apps/web/src/components/dashboard-page.tsx` - Componente principal
- `apps/web/src/components/kpi-card.tsx` - Cards de KPIs
- `apps/web/src/components/kpi-chart.tsx` - Gráficas

**Datos de Supabase**:
- Total incidencias: 2,959 registros
- Total empleados: 1,041 registros
- Total bajas: 1,108 registros
