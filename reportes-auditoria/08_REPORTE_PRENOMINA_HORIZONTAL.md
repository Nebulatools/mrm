# 📊 Reporte: Tabla Faltante - Prenomina Horizontal

**Fecha:** 8 de enero de 2026
**Estado:** ⚠️ **TABLA NO IMPLEMENTADA EN SUPABASE**
**Prioridad:** 🔴 **ALTA** - Datos de horas semanales no están siendo capturados

---

## 🎯 Resumen Ejecutivo

El archivo **`Prenomina Horizontal.csv`** existe en el servidor SFTP pero **NO tiene tabla correspondiente en Supabase**. Este archivo contiene información crítica de horas trabajadas semanales (ordinarias y extras) que actualmente no está disponible en el dashboard.

### Impacto

| Aspecto | Impacto | Severidad |
|---------|---------|-----------|
| **KPIs de Horas Extras** | No disponibles | 🔴 Alto |
| **Análisis de Productividad** | Incompleto | 🟠 Medio |
| **Costos de Nómina** | No calculables | 🔴 Alto |
| **Reportes Semanales** | Faltantes | 🟠 Medio |

---

## 📁 Información del Archivo SFTP

### Ubicación
```
Servidor: 148.244.90.21:5062
Directorio: /ReportesRH/
Archivo: Prenomina Horizontal.csv
```

### Características
- **Formato:** CSV (UTF-8)
- **Tamaño:** 102.1 KB (~100 registros)
- **Última modificación:** 8 de enero de 2026
- **Frecuencia de actualización:** Semanal (estimado)

---

## 📊 Estructura del Archivo

### Columnas (30 total)

El archivo tiene una estructura horizontal donde cada fila representa un empleado y sus horas trabajadas durante una semana (Lunes a Domingo).

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Columna     │ Descripción                                          │
├─────────────┼──────────────────────────────────────────────────────┤
│ N?mero      │ Número de empleado (FK a empleados_sftp)            │
│ Nombre      │ Nombre completo del empleado                         │
│             │                                                      │
│ LUN         │ Fecha del lunes (formato: DD/MM/YYYY)                │
│ LUN-ORD     │ Horas ordinarias trabajadas el lunes                 │
│ LUN-TE      │ Horas extras trabajadas el lunes                     │
│ LUN-INC     │ Incidencia del lunes (texto: "Vacaciones", etc.)     │
│             │                                                      │
│ MAR         │ Fecha del martes                                     │
│ MAR-ORD     │ Horas ordinarias del martes                          │
│ MAR-TE      │ Horas extras del martes                              │
│ MAR-INC     │ Incidencia del martes                                │
│             │                                                      │
│ MIE         │ Fecha del miércoles                                  │
│ MIE-ORD     │ Horas ordinarias del miércoles                       │
│ MIE-TE      │ Horas extras del miércoles                           │
│ MIE-INC     │ Incidencia del miércoles                             │
│             │                                                      │
│ JUE         │ Fecha del jueves                                     │
│ JUE-ORD     │ Horas ordinarias del jueves                          │
│ JUE-TE      │ Horas extras del jueves                              │
│ JUE-INC     │ Incidencia del jueves                                │
│             │                                                      │
│ VIE         │ Fecha del viernes                                    │
│ VIE-ORD     │ Horas ordinarias del viernes                         │
│ VIE-TE      │ Horas extras del viernes                             │
│ VIE-INC     │ Incidencia del viernes                               │
│             │                                                      │
│ SAB         │ Fecha del sábado                                     │
│ SAB-ORD     │ Horas ordinarias del sábado                          │
│ SAB-TE      │ Horas extras del sábado                              │
│ SAB-INC     │ Incidencia del sábado                                │
│             │                                                      │
│ DOM         │ Fecha del domingo                                    │
│ DOM-ORD     │ Horas ordinarias del domingo                         │
│ DOM-TE      │ Horas extras del domingo                             │
│ DOM-INC     │ Incidencia del domingo                               │
└─────────────┴──────────────────────────────────────────────────────┘

TOTAL: 2 columnas base + (4 columnas × 7 días) = 30 columnas
```

### Ejemplo de Datos Reales

```csv
N?mero,Nombre,LUN,LUN-ORD,LUN-TE,LUN-INC,MAR,MAR-ORD,MAR-TE,MAR-INC,...
4,"Beltran Del Rio Lara, Juan Gerardo",01/01/2026,9.0000,0.0000,,02/01/2026,9.0000,0.0000,,03/01/2026,0.0000,0.0000,,04/01/2026,0.0000,0.0000,,05/01/2026,9.0000,0.0000,,06/01/2026,9.0000,0.0000,,07/01/2026,9.0000,0.0000,
16,"Rodriguez Gonzalez, Ricardo Arturo",01/01/2026,9.0000,0.0000,,02/01/2026,9.0000,0.0000,,03/01/2026,8.0000,0.0000,,04/01/2026,0.0000,0.0000,,05/01/2026,0.0000,0.0000,Vacaciones,06/01/2026,9.0000,0.0000,,07/01/2026,9.0000,0.0000,
```

#### Interpretación del Ejemplo:
- **Empleado 4**: Trabajó 54 horas ordinarias en la semana (6 días × 9 horas)
- **Empleado 16**: Trabajó 44 horas ordinarias, tuvo vacaciones el viernes

---

## 🗄️ Diseño de Tabla Supabase (Propuesto)

### Schema SQL

```sql
CREATE TABLE prenomina_horizontal (
  -- Identificación
  id SERIAL PRIMARY KEY,
  numero_empleado INTEGER NOT NULL REFERENCES empleados_sftp(numero_empleado),
  nombre VARCHAR(200) NOT NULL,

  -- Identificación de Semana
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,

  -- Lunes
  lun_fecha DATE,
  lun_horas_ord DECIMAL(6,2) DEFAULT 0,
  lun_horas_te DECIMAL(6,2) DEFAULT 0,
  lun_incidencia VARCHAR(200),

  -- Martes
  mar_fecha DATE,
  mar_horas_ord DECIMAL(6,2) DEFAULT 0,
  mar_horas_te DECIMAL(6,2) DEFAULT 0,
  mar_incidencia VARCHAR(200),

  -- Miércoles
  mie_fecha DATE,
  mie_horas_ord DECIMAL(6,2) DEFAULT 0,
  mie_horas_te DECIMAL(6,2) DEFAULT 0,
  mie_incidencia VARCHAR(200),

  -- Jueves
  jue_fecha DATE,
  jue_horas_ord DECIMAL(6,2) DEFAULT 0,
  jue_horas_te DECIMAL(6,2) DEFAULT 0,
  jue_incidencia VARCHAR(200),

  -- Viernes
  vie_fecha DATE,
  vie_horas_ord DECIMAL(6,2) DEFAULT 0,
  vie_horas_te DECIMAL(6,2) DEFAULT 0,
  vie_incidencia VARCHAR(200),

  -- Sábado
  sab_fecha DATE,
  sab_horas_ord DECIMAL(6,2) DEFAULT 0,
  sab_horas_te DECIMAL(6,2) DEFAULT 0,
  sab_incidencia VARCHAR(200),

  -- Domingo
  dom_fecha DATE,
  dom_horas_ord DECIMAL(6,2) DEFAULT 0,
  dom_horas_te DECIMAL(6,2) DEFAULT 0,
  dom_incidencia VARCHAR(200),

  -- Totales Calculados Automáticamente
  total_horas_ord DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_ord, 0) + COALESCE(mar_horas_ord, 0) +
    COALESCE(mie_horas_ord, 0) + COALESCE(jue_horas_ord, 0) +
    COALESCE(vie_horas_ord, 0) + COALESCE(sab_horas_ord, 0) +
    COALESCE(dom_horas_ord, 0)
  ) STORED,

  total_horas_te DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_te, 0) + COALESCE(mar_horas_te, 0) +
    COALESCE(mie_horas_te, 0) + COALESCE(jue_horas_te, 0) +
    COALESCE(vie_horas_te, 0) + COALESCE(sab_horas_te, 0) +
    COALESCE(dom_horas_te, 0)
  ) STORED,

  total_horas_semana DECIMAL(8,2) GENERATED ALWAYS AS (
    COALESCE(lun_horas_ord, 0) + COALESCE(mar_horas_ord, 0) +
    COALESCE(mie_horas_ord, 0) + COALESCE(jue_horas_ord, 0) +
    COALESCE(vie_horas_ord, 0) + COALESCE(sab_horas_ord, 0) +
    COALESCE(dom_horas_ord, 0) +
    COALESCE(lun_horas_te, 0) + COALESCE(mar_horas_te, 0) +
    COALESCE(mie_horas_te, 0) + COALESCE(jue_horas_te, 0) +
    COALESCE(vie_horas_te, 0) + COALESCE(sab_horas_te, 0) +
    COALESCE(dom_horas_te, 0)
  ) STORED,

  -- Metadata
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_empleado_semana UNIQUE(numero_empleado, semana_inicio),
  CONSTRAINT check_semana_valida CHECK(semana_fin >= semana_inicio),
  CONSTRAINT check_horas_validas CHECK(
    total_horas_semana >= 0 AND total_horas_semana <= 168
  )
);

-- Índices para mejorar performance
CREATE INDEX idx_prenomina_numero_empleado ON prenomina_horizontal(numero_empleado);
CREATE INDEX idx_prenomina_semana ON prenomina_horizontal(semana_inicio, semana_fin);
CREATE INDEX idx_prenomina_fecha_creacion ON prenomina_horizontal(fecha_creacion);
CREATE INDEX idx_prenomina_horas_extras ON prenomina_horizontal(total_horas_te) WHERE total_horas_te > 0;

-- Habilitar RLS (Row Level Security)
ALTER TABLE prenomina_horizontal ENABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE prenomina_horizontal IS 'Registro semanal de horas trabajadas (ordinarias y extras) por empleado';
COMMENT ON COLUMN prenomina_horizontal.numero_empleado IS 'FK a empleados_sftp.numero_empleado';
COMMENT ON COLUMN prenomina_horizontal.semana_inicio IS 'Lunes de la semana';
COMMENT ON COLUMN prenomina_horizontal.semana_fin IS 'Domingo de la semana';
COMMENT ON COLUMN prenomina_horizontal.total_horas_ord IS 'Suma automática de horas ordinarias';
COMMENT ON COLUMN prenomina_horizontal.total_horas_te IS 'Suma automática de horas extras';
COMMENT ON COLUMN prenomina_horizontal.total_horas_semana IS 'Total general de horas trabajadas';
```

### Ventajas del Diseño

1. **Totales Automáticos**: Columnas calculadas `GENERATED ALWAYS AS` para totales
2. **Integridad**: Foreign Key a `empleados_sftp` garantiza consistencia
3. **Unicidad**: Constraint `UNIQUE(numero_empleado, semana_inicio)` evita duplicados
4. **Validación**: Check constraint para horas válidas (0-168 horas/semana)
5. **Performance**: Índices en columnas frecuentemente consultadas
6. **Seguridad**: RLS habilitado para control de acceso

---

## 🔄 Lógica de Importación (Propuesta)

### Archivo de API Route

**Ubicación:** `apps/web/src/app/api/import-prenomina/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import SftpClient from 'ssh2-sftp-client';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    // 1. Conectar a SFTP
    const sftp = new SftpClient();
    await sftp.connect({
      host: process.env.SFTP_HOST!,
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USER!,
      password: process.env.SFTP_PASSWORD!
    });

    // 2. Descargar archivo
    const directory = process.env.SFTP_DIRECTORY || 'ReportesRH';
    const filename = 'Prenomina Horizontal.csv';
    const filePath = `${directory}/${filename}`;

    const fileContent = await sftp.get(filePath);
    const csvText = fileContent.toString('utf8');

    // 3. Parsear CSV
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true
    });

    // 4. Transformar datos
    const records = parsed.data.map(row => {
      const numero = parseInt(String(row['N?mero'] || row['Número']));
      const nombre = String(row['Nombre'] || '');

      // Detectar semana a partir de la primera fecha (LUN)
      const lunFecha = parseDate(String(row['LUN']));
      const semanaInicio = lunFecha;
      const semanaFin = addDays(lunFecha, 6);

      return {
        numero_empleado: numero,
        nombre: nombre,
        semana_inicio: formatDate(semanaInicio),
        semana_fin: formatDate(semanaFin),

        lun_fecha: parseDate(String(row['LUN'])),
        lun_horas_ord: parseFloat(String(row['LUN-ORD'] || '0')),
        lun_horas_te: parseFloat(String(row['LUN- TE'] || '0')),
        lun_incidencia: String(row['LUN-INC'] || ''),

        mar_fecha: parseDate(String(row['MAR'])),
        mar_horas_ord: parseFloat(String(row['MAR-ORD'] || '0')),
        mar_horas_te: parseFloat(String(row['MAR - TE'] || '0')),
        mar_incidencia: String(row['MAR-INC'] || ''),

        mie_fecha: parseDate(String(row['MIE'])),
        mie_horas_ord: parseFloat(String(row['MIE-ORD'] || '0')),
        mie_horas_te: parseFloat(String(row['MIE - TE'] || '0')),
        mie_incidencia: String(row['MIE-INC'] || ''),

        jue_fecha: parseDate(String(row['JUE'])),
        jue_horas_ord: parseFloat(String(row['JUE-ORD'] || '0')),
        jue_horas_te: parseFloat(String(row['JUE - TE'] || '0')),
        jue_incidencia: String(row['JUE-INC'] || ''),

        vie_fecha: parseDate(String(row['VIE'])),
        vie_horas_ord: parseFloat(String(row['VIE-ORD'] || '0')),
        vie_horas_te: parseFloat(String(row['VIE - TE'] || '0')),
        vie_incidencia: String(row['VIE-INC'] || ''),

        sab_fecha: parseDate(String(row['SAB'])),
        sab_horas_ord: parseFloat(String(row['SAB-ORD'] || '0')),
        sab_horas_te: parseFloat(String(row['SAB - TE'] || '0')),
        sab_incidencia: String(row['SAB-INC'] || ''),

        dom_fecha: parseDate(String(row['DOM'])),
        dom_horas_ord: parseFloat(String(row['DOM-ORD'] || '0')),
        dom_horas_te: parseFloat(String(row['DOM - TE'] || '0')),
        dom_incidencia: String(row['DOM-INC'] || '')
      };
    });

    // 5. Batch insert a Supabase con UPSERT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('prenomina_horizontal')
      .upsert(records, {
        onConflict: 'numero_empleado,semana_inicio',
        ignoreDuplicates: false
      });

    if (error) throw error;

    await sftp.end();

    return NextResponse.json({
      success: true,
      imported: records.length,
      message: `${records.length} registros importados exitosamente`
    });

  } catch (error) {
    console.error('Error importando prenomina:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Helper functions
function parseDate(dateStr: string): Date {
  // Formato: DD/MM/YYYY
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
```

---

## 📈 Nuevos KPIs Habilitados

### KPIs de Horas

1. **Total Horas Trabajadas**
   - Formula: `SUM(total_horas_semana)`
   - Desglose: Ordinarias vs Extras

2. **Promedio Horas por Empleado**
   - Formula: `AVG(total_horas_semana)`
   - Comparación: Actual vs período anterior

3. **% Horas Extras**
   - Formula: `(SUM(total_horas_te) / SUM(total_horas_ord)) * 100`
   - Target: < 15% (recomendado)

### KPIs de Productividad

4. **Horas Extras por Departamento**
   - Top 5 departamentos con más horas extras
   - Identificación de sobrecarga laboral

5. **Tendencia de Horas Extras**
   - Gráfica semanal/mensual
   - Detección de patrones estacionales

6. **Empleados con Exceso de Horas**
   - Alertas para > 60 horas/semana
   - Cumplimiento normativo (NOM-035)

### KPIs de Costos

7. **Costo de Horas Extras**
   - Formula: `SUM(total_horas_te) * factor_hora_extra * salario_promedio`
   - Proyección mensual/anual

8. **Costo por Departamento**
   - Desglose de costos de horas extras
   - Identificación de áreas de alto costo

---

## 🎨 Componentes de Visualización (Propuestos)

### 1. Panel de Prénomina

**Archivo:** `apps/web/src/components/prenomina-panel.tsx`

```typescript
export function PrenominaPanel({ dateRange, filters }: PrenominaPanelProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Total Horas Trabajadas"
          value={formatNumber(totalHoras)}
          trend={+5.2}
          icon={<Clock />}
        />
        <KPICard
          title="Horas Extras"
          value={formatNumber(horasExtras)}
          trend={-2.1}
          icon={<AlertTriangle />}
        />
        <KPICard
          title="% Horas Extras"
          value={`${porcentajeHE}%`}
          trend={-0.5}
          icon={<Percent />}
        />
        <KPICard
          title="Costo HE Estimado"
          value={formatCurrency(costoHE)}
          trend={+3.8}
          icon={<DollarSign />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Horas Ordinarias vs Extras</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={horasChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Empleados con Más HE</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={topEmpleadosChart} horizontal />
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Detalles */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle Semanal por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={prenominaColumns}
            data={prenominaData}
            sortable
            filterable
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Gráfica de Tendencias Semanales

```typescript
<LineChart
  data={tendenciasSemana}
  xKey="semana"
  yKeys={['horas_ord', 'horas_te']}
  colors={['#3b82f6', '#ef4444']}
  labels={{ horas_ord: 'Ordinarias', horas_te: 'Extras' }}
/>
```

### 3. Heatmap de Horas por Día

```typescript
<Heatmap
  data={heatmapData}
  xLabels={['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']}
  yLabels={empleados}
  colorScale={['#dcfce7', '#16a34a', '#dc2626']}
/>
```

---

## ✅ Checklist de Implementación

### Fase 1: Base de Datos ⚠️ **URGENTE**

- [ ] Ejecutar script SQL para crear tabla `prenomina_horizontal`
- [ ] Verificar que la tabla se creó correctamente
- [ ] Crear índices para optimizar queries
- [ ] Configurar políticas RLS si es necesario
- [ ] Hacer prueba de inserción manual

**Tiempo estimado:** 30 minutos

### Fase 2: Backend (Alta Prioridad)

- [ ] Crear API route `/api/import-prenomina/route.ts`
- [ ] Implementar helpers de transformación de datos
- [ ] Agregar validaciones de datos (horas válidas, fechas consistentes)
- [ ] Implementar manejo de errores robusto
- [ ] Agregar logging detallado
- [ ] Probar importación con archivo real de SFTP

**Tiempo estimado:** 4-6 horas

### Fase 3: Frontend (Media Prioridad)

- [ ] Crear componente `prenomina-panel.tsx`
- [ ] Implementar KPI cards de horas
- [ ] Crear gráfica de barras (Ordinarias vs Extras)
- [ ] Crear tabla de detalles semanales
- [ ] Agregar filtros (por empleado, departamento, semana)
- [ ] Integrar con sistema de filtros existente
- [ ] Agregar tab "Prénomina" en dashboard principal

**Tiempo estimado:** 6-8 horas

### Fase 4: KPIs y Análisis (Baja Prioridad)

- [ ] Actualizar `kpi-calculator.ts` con métricas de horas
- [ ] Crear queries optimizadas para reportes
- [ ] Implementar cálculo de costos de horas extras
- [ ] Agregar alertas para horas excesivas (>60h/semana)
- [ ] Integrar con AI insights (detección de anomalías)
- [ ] Documentar nuevas fórmulas en `docs/KPI_FORMULAS.md`

**Tiempo estimado:** 4-6 horas

### Fase 5: Testing y Validación

- [ ] Pruebas unitarias para transformadores de datos
- [ ] Pruebas de integración con SFTP
- [ ] Validación de totales calculados
- [ ] Pruebas de UI en diferentes resoluciones
- [ ] Verificar performance con datasets grandes
- [ ] Validar que no hay fugas de memoria

**Tiempo estimado:** 3-4 horas

---

## 🚀 Timeline de Implementación

| Fase | Duración | Inicio | Fin | Responsable |
|------|----------|--------|-----|-------------|
| **Fase 1: DB** | 0.5 días | 08/01 | 08/01 | Backend Dev |
| **Fase 2: Backend** | 1 día | 09/01 | 09/01 | Backend Dev |
| **Fase 3: Frontend** | 1.5 días | 10/01 | 11/01 | Frontend Dev |
| **Fase 4: KPIs** | 1 día | 12/01 | 12/01 | Full Stack |
| **Fase 5: Testing** | 0.5 días | 13/01 | 13/01 | QA + Dev |
| **TOTAL** | **4.5 días** | **08/01** | **13/01** | **Team** |

---

## 💰 ROI y Beneficios

### Beneficios Cuantitativos

1. **Reducción de Costos de HE**
   - Identificación de patrones de horas extras innecesarias
   - Ahorro estimado: 10-15% en costos de nómina

2. **Mejora en Productividad**
   - Mejor distribución de carga laboral
   - Reducción de horas extras excesivas (burnout)

3. **Cumplimiento Normativo**
   - Monitoreo automático de límites legales (NOM-035)
   - Reducción de riesgos legales

### Beneficios Cualitativos

1. **Visibilidad Completa**
   - Dashboard unificado con toda la información de RH
   - Toma de decisiones basada en datos completos

2. **Análisis Predictivo**
   - Detección temprana de sobrecarga laboral
   - Planificación proactiva de recursos

3. **Satisfacción del Usuario**
   - Dashboard más completo y útil
   - Mejor experiencia de usuario

---

## 📝 Notas Técnicas

### Consideraciones de Performance

1. **Volumen de Datos**
   - ~100 registros por semana
   - ~5,200 registros por año
   - Tamaño estimado de tabla: ~50 MB/año

2. **Optimizaciones**
   - Índices en columnas de búsqueda frecuente
   - Particionamiento por semana/mes si es necesario
   - Cache de queries agregadas

### Alternativas de Diseño

#### Opción 1: Tabla Horizontal (Recomendada ✅)
**Ventajas:**
- Mapeo directo con archivo CSV
- Queries simples para totales semanales
- Fácil visualización en tablas

**Desventajas:**
- Esquema menos normalizado
- Más columnas en la tabla

#### Opción 2: Tabla Normalizada (Vertical)
```sql
CREATE TABLE horas_diarias (
  id SERIAL PRIMARY KEY,
  numero_empleado INTEGER,
  fecha DATE,
  horas_ord DECIMAL(6,2),
  horas_te DECIMAL(6,2),
  incidencia VARCHAR(200)
);
```

**Ventajas:**
- Más normalizada
- Más flexible para queries por día

**Desventajas:**
- Requiere más transformación desde CSV
- Queries más complejas para totales semanales

**Recomendación:** Usar Opción 1 (Horizontal) por simplicidad y mapeo directo con fuente.

---

## 📞 Contacto y Seguimiento

**Responsable del Reporte:** [Tu Nombre]
**Fecha:** 8 de enero de 2026
**Estado:** 🔴 **PENDIENTE DE IMPLEMENTACIÓN**

**Próximos Pasos:**
1. Revisar y aprobar diseño de tabla
2. Asignar recursos para implementación
3. Programar fecha de inicio (recomendado: inmediato)
4. Establecer fecha límite de entrega

---

**FIN DEL REPORTE**

*Este documento debe ser revisado y aprobado antes de iniciar la implementación.*
