# Dashboard MRM - KPIs de RRHH

Un dashboard completo de Business Intelligence para el análisis de KPIs de Recursos Humanos, desarrollado con Next.js 14 y Supabase.

## 🚀 Características Principales

### ✅ **Completado**
- **📊 Cálculo de KPIs con Fórmulas Exactas**: Implementación de las fórmulas específicas del negocio
  - Activos (Count(ACT))
  - Días (Count(ACT[Fecha])) 
  - Activos Prom (Activos/Días)
  - Bajas (Count(if(PLANTILLA[Activo]="NO")))
  - Rotación Mensual (Bajas/Activos Prom)
  - Incidencias (Count(INCIDENCIAS[EMP]))
  - Inc prom x empleado (Incidencias/Activos Prom)
  - Días Laborados ((Activos)/7)*6
  - %incidencias (Incidencias/días Laborados)

- **🎨 Dashboard Interactivo**: Interface moderna con shadcn/ui
  - Vista de resumen con métricas principales
  - Tabs organizados por categoría (Personal, Incidencias, Retención, Tendencias)
  - Gráficos interactivos (líneas, barras, áreas)
  - Filtros por período y categoría

- **🔄 Ingesta SFTP**: Edge Function para procesar datos desde servidor SFTP
  - Procesamiento de tablas PLANTILLA, INCIDENCIAS y ACT
  - Logging completo del proceso de importación
  - Manejo de errores y validaciones

- **🧠 IA Generativa**: Análisis automático con insights inteligentes
  - Detección de tendencias significativas
  - Identificación de anomalías
  - Recomendaciones basadas en datos
  - Proyecciones futuras
  - Categorización por impacto y confianza

- **⚙️ Ajustes Retroactivos**: Sistema completo de auditoría
  - Modificación de valores históricos con registro completo
  - Historial de cambios con usuario y fecha
  - Justificación obligatoria para cada ajuste
  - Clasificación por nivel de impacto

- **📈 Visualización de Datos**: Componentes avanzados de charts
  - Gráficos responsivos con Recharts
  - Tooltips personalizados
  - Soporte para múltiples series de datos
  - Comparación con períodos anteriores

- **🔧 Drill-down y Filtros**: Navegación granular de datos
  - Filtros por período temporal
  - Selección por departamento
  - Filtros por categoría de KPI
  - Panel de filtros colapsable

## 🏗️ Arquitectura

### Estructura de Monorepo
```
/hr-kpi-dashboard
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   └── functions/              # Supabase Edge Functions
├── packages/
│   └── shared/                 # Tipos y utilidades compartidas
└── package.json                # Configuración de workspaces
```

### Stack Tecnológico

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| **Frontend** | Next.js | 14.x | Framework React con App Router |
| **UI Components** | shadcn/ui | ^0.5.0 | Componentes de interfaz |
| **Styling** | Tailwind CSS | ^3.4.1 | Framework de CSS utilitario |
| **Database** | PostgreSQL | 13+ | Base de datos relacional |
| **Backend** | Supabase | - | Backend as a Service |
| **Charts** | Recharts | ^2.12.7 | Visualización de datos |
| **Language** | TypeScript | ^5.4.0 | Tipado estático |
| **Deployment** | Vercel | - | Hosting del frontend |

### Base de Datos

**Tablas Principales:**
- `employees` - Información de empleados
- `departments` - Departamentos de la organización
- `absence_records` - Registros de ausencias
- `payroll_records` - Datos de nómina
- `plantilla` - Tabla legacy SFTP (empleados)
- `incidencias` - Tabla legacy SFTP (incidencias)
- `act` - Tabla legacy SFTP (conteos activos)
- `import_logs` - Logs de importación SFTP

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase

### Configuración del Proyecto

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd hr-kpi-dashboard
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Ejecutar el proyecto**
```bash
npm run dev
```

El dashboard estará disponible en `http://localhost:3000`

## 📱 Uso del Dashboard

### Navegación Principal

1. **Resumen**: Vista general con métricas principales y gráficos de tendencias
2. **Personal**: KPIs relacionados con headcount (Activos, Activos Prom, Bajas)
3. **Incidencias**: Análisis de incidencias y métricas relacionadas
4. **Retención**: KPIs de rotación y retención de personal
5. **Tendencias**: Análisis histórico comparativo de todos los KPIs
6. **IA Generativa**: Insights automáticos y recomendaciones
7. **Ajustes**: Herramientas de ajuste retroactivo con auditoría

### Funcionalidades Clave

**Filtros Inteligentes:**
- Selección de período (últimos 12 meses)
- Filtro por departamento
- Filtro por categoría de KPI

**Visualización:**
- Cards de KPI con variación porcentual
- Gráficos interactivos (líneas, barras, áreas)
- Tooltips con información detallada
- Indicadores de progreso hacia metas

**Ajustes Retroactivos:**
- Selección visual de KPI a ajustar
- Formulario con validación y justificación
- Historial completo con auditoría
- Clasificación por impacto del cambio

## 🔍 Fórmulas de KPIs

El sistema implementa las fórmulas exactas del negocio:

| KPI | Fórmula | Descripción |
|-----|---------|-------------|
| **Activos** | `Count(ACT)` | Conteo de empleados activos |
| **Días** | `Count(ACT[Fecha])` | Días en el período seleccionado |
| **Activos Prom** | `Activos/Días` | Promedio de activos por día |
| **Bajas** | `Count(if(PLANTILLA[Activo]="NO"))` | Empleados dados de baja |
| **Rotación Mensual** | `Bajas/Activos Prom` | % de rotación mensual |
| **Incidencias** | `Count(INCIDENCIAS[EMP])` | Total de incidencias |
| **Inc prom x empleado** | `Incidencias/Activos Prom` | Incidencias por empleado |
| **Días Laborados** | `((Activos)/7)*6` | Días laborales estimados |
| **%incidencias** | `Incidencias/días Laborados` | % de incidencias |

## 🔮 IA Generativa - Análisis Automático

El sistema de IA analiza automáticamente los KPIs y genera:

### Tipos de Insights

1. **Tendencias**: Cambios significativos período a período (>15%)
2. **Anomalías**: Violaciones de reglas de negocio críticas
3. **Recomendaciones**: Sugerencias basadas en rendimiento actual
4. **Proyecciones**: Estimaciones para períodos futuros

### Algoritmos de Detección

- **Alta Rotación**: Rotación >15% genera alerta de alto impacto
- **Incidencias Elevadas**: %incidencias >8% indica problemas operacionales
- **Estabilidad Positiva**: Rotación <10% con baja varianza sugiere crecimiento
- **Excelencia Operacional**: Incidencias <0.5 por empleado indica buenas prácticas

## 🛠️ Desarrollo y Extensión

### Agregar Nuevos KPIs

1. **Definir en tipos compartidos** (`packages/shared/src/types.ts`)
2. **Implementar cálculo** (`apps/web/src/lib/kpi-calculator.ts`)
3. **Agregar a categorización** (`dashboard-page.tsx`)
4. **Actualizar IA** (`ai-analyzer.ts`)

### Personalizar Visualizaciones

Los componentes de gráficos están en `components/kpi-chart.tsx` y soportan:
- Múltiples tipos (línea, barra, área)
- Tooltips personalizados
- Colores y estilos configurables
- Datos con series múltiples

### Extender IA Generativa

El motor de IA (`ai-analyzer.ts`) permite:
- Agregar nuevas reglas de detección
- Personalizar umbrales de anomalías
- Incorporar algoritmos adicionales
- Integrar con servicios de ML externos

## 🔒 Seguridad (Pendiente)

### Funcionalidades a Implementar

- **Row Level Security (RLS)** en Supabase
- **Autenticación de usuarios** con roles
- **Permisos granulares** por departamento
- **Auditoría completa** de accesos

## 📋 Próximos Pasos

### En Desarrollo
- [ ] Implementar autenticación y RLS
- [ ] Configurar pipeline de deployment
- [ ] Agregar suite de testing completa

### Backlog
- [ ] Dashboard móvil optimizado
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Notificaciones automáticas
- [ ] Integración con sistemas de RRHH
- [ ] API REST para integraciones externas

## 🤝 Contribución

El proyecto sigue las mejores prácticas de desarrollo:

- **TypeScript** para tipado fuerte
- **ESLint** para calidad de código
- **Conventional Commits** para versionado
- **Monorepo** para organización escalable

## 📞 Soporte

Para soporte técnico o consultas sobre el dashboard:
- Revisar la documentación técnica en `/docs`
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ usando Next.js 14, Supabase, y shadcn/ui**