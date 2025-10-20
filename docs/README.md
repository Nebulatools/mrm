# 📚 Documentación del Proyecto - HR KPI Dashboard

Esta carpeta contiene la documentación esencial del proyecto HR KPI Dashboard.

---

## 📋 Índice de Documentos

### 🎯 Guía Principal

**[FILTROS_Y_FORMULAS_POR_TAB.md](./FILTROS_Y_FORMULAS_POR_TAB.md)** ⭐ **DOCUMENTO PRINCIPAL**
- Guía definitiva que explica EXACTAMENTE cómo funciona cada tab
- Todas las fórmulas de cálculo detalladas
- Explicación completa del sistema de filtros (GENERAL vs ESPECÍFICO)
- Referencia rápida con tablas resumen
- **Úsalo primero para entender el dashboard**

### 📊 Especificaciones de KPIs y Dashboard

**[KPI_FORMULAS.md](./KPI_FORMULAS.md)**
- Fórmulas matemáticas de cada KPI
- Ejemplos de cálculo con datos reales
- Rangos de valores esperados
- **Complementa FILTROS_Y_FORMULAS_POR_TAB.md**

**[DASHBOARD_TABS.md](./DASHBOARD_TABS.md)**
- Descripción de cada tab del dashboard
- Componentes visuales por tab
- Organización de la información

### 🏗️ Arquitectura y Desarrollo

**[architecture.md](./architecture.md)**
- Estructura del monorepo
- Tecnologías utilizadas
- Organización de carpetas
- Patrones de diseño

**[prd.md](./prd.md)**
- Product Requirements Document
- Requisitos funcionales
- Casos de uso

**[brief.md](./brief.md)**
- Brief del proyecto
- Objetivos de negocio
- Stakeholders

### 🔒 Seguridad

**[RLS_AUTHENTICATION.md](./RLS_AUTHENTICATION.md)**
- Row Level Security (RLS) en Supabase
- Sistema de autenticación
- Políticas de acceso a datos
- Mejores prácticas de seguridad

### 🚀 Workflow de Desarrollo

**[github-workflow.md](./github-workflow.md)**
- Proceso de desarrollo con Git
- Convenciones de commits
- Pull requests y code review
- Integración continua

---

## 🎯 Flujo de Lectura Recomendado

### Para Desarrolladores Nuevos:
1. **brief.md** - Entender el contexto del proyecto
2. **architecture.md** - Conocer la estructura técnica
3. **FILTROS_Y_FORMULAS_POR_TAB.md** ⭐ - Entender cómo funciona cada tab (GUÍA PRINCIPAL)
4. **KPI_FORMULAS.md** - Profundizar en las fórmulas
5. **RLS_AUTHENTICATION.md** - Comprender la seguridad
6. **github-workflow.md** - Aprender el proceso de desarrollo

### Para Product Managers:
1. **prd.md** - Requisitos del producto
2. **DASHBOARD_TABS.md** - Estructura del dashboard
3. **FILTROS_Y_FORMULAS_POR_TAB.md** ⭐ - Entender las métricas y filtros (GUÍA PRINCIPAL)
4. **KPI_FORMULAS.md** - Fórmulas de negocio

### Para QA/Testers:
1. **FILTROS_Y_FORMULAS_POR_TAB.md** ⭐ - Entender qué testear (GUÍA PRINCIPAL)
2. **KPI_FORMULAS.md** - Validar cálculos
3. **DASHBOARD_TABS.md** - Cobertura de pruebas por tab

---

## 📝 Notas Importantes

### Sistema de Filtros
El dashboard tiene **dos tipos de filtros**:

- **🟢 ESPECÍFICO:** Usa solo empleados que cumplen con los filtros seleccionados (~80% de métricas)
- **🔴 GENERAL:** Ignora filtros, usa TODOS los empleados (~20% de métricas)

**Ver detalles completos en:** [FILTROS_Y_FORMULAS_POR_TAB.md](./FILTROS_Y_FORMULAS_POR_TAB.md)

### Motivos de Baja
- **Involuntarios:** Rescisión por desempeño, disciplina, término del contrato
- **Complementarios:** Baja voluntaria, otra razón, abandono, etc.

### Códigos de Incidencia
- **Incidencias (negativas):** FI, SUS, PSIN, ENFE
- **Permisos (autorizados):** PCON, VAC, MAT3

---

## 🔄 Última Actualización

**Fecha:** 19 de octubre de 2025
**Versión:** 2.0

La documentación fue actualizada para reflejar el estado actual del proyecto después de:
- Corrección de filtros en Tab Resumen
- Centralización del sistema de filtros
- Corrección de etiquetas Voluntaria/Involuntaria
- Validaciones para datos vacíos

---

## 📞 Soporte

Si tienes preguntas sobre la documentación o encuentras alguna inconsistencia:
1. Revisa primero **FILTROS_Y_FORMULAS_POR_TAB.md** (documento principal)
2. Consulta la sección específica de cada documento
3. Verifica el código fuente en las ubicaciones indicadas

---

**© 2025 HR KPI Dashboard - Documentación Técnica**
