## Ajustes recientes – Ubicacion2 e IA bajo demanda

- **Filtro de Ubicación (incidencias)**: se añadió un filtro dedicado que usa `ubicacion2` de la tabla `incidencias`. En el panel de filtros aparece como “Ubicación”; el filtro de empleados se renombró a “Centro de trabajo”.
- **IDs de incidencias**: el importador ahora asigna `emp` desde el número real del CSV (`Número/#/Gafete`). Se eliminaron los IDs sintéticos negativos y se reimportó `Incidencias.csv` para diciembre 2025; todas las 71 filas tienen `emp > 0` y matchean `empleados_sftp`.
- **Narrativa IA**: ahora se genera solo al pulsar el botón “IA bajo demanda”; no se dispara automáticamente con cambios de datos.

### Archivos modificados
- `apps/web/src/app/api/import-sftp-real-data/route.ts`
- `apps/web/src/components/smart-narrative.tsx`
- `apps/web/src/components/filter-panel.tsx`
- `apps/web/src/components/dashboard-page.tsx`
- `apps/web/src/lib/filters/filters.ts`
- `apps/web/src/lib/filters/summary.ts`
- `apps/web/src/components/retention-charts.tsx`

### Datos actuales (Supabase ufdlwhdrrvktthcxwpzt)
- `incidencias`: 7,156 filas, `emp` sin negativos. `ubicacion2` con valores CAD / CORPORATIVO / FILIALES (solo 71 filas, rango 2025-12-15 a 2025-12-21).
- `empleados_sftp`: 1,033 empleados (3–2788), todos únicos.
- `motivos_baja`: 1,480 registros vinculados por `numero_empleado`.

### Notas operativas
- El filtro de “Ubicación” afecta únicamente incidencias (ubicacion2). Si se selecciona CAD/CORPORATIVO/FILIALES fuera de diciembre 2025, los KPIs quedarán en 0 porque el CSV solo trae ese rango.
- La narrativa IA no se ejecuta sola; usar el botón “IA bajo demanda”.
