# Cambios nuevos (detalle)

- **Incidencias/Permisos en % con días laborables reales**
  - Ahora los KPIs muestran porcentaje: empleados con incidencias, incidencias y permisos se calculan con días laborables (suma de días activos por empleado en el mes) y ya no con el aproximado (activos/7*6).
  - Se añaden chips MA/MMAA en las cards con valores en %, activos de referencia y leyenda de siglas.
  - Archivo: `apps/web/src/components/incidents-tab.tsx`.

- **Gráfica Ausentismos vs Permisos por área en %**
  - Cálculo por área divide incidencias/permisos entre días laborables del área; tooltips/ejes muestran %.
  - Archivo: `apps/web/src/components/incidents-tab.tsx`.

- **Resumen “Detalle de Abandonos/Otros” (LLM con fallback)**
  - Caja bajo el heatmap de bajas que lee descripciones de motivos “otro/abandono/sin información” del mes y devuelve 3 bullets.
  - Usa Gemini (si hay `NEXT_PUBLIC_GEMINI_API_KEY`), con fallback heurístico local si no hay clave.
  - Archivos: `apps/web/src/components/abandonos-otros-summary.tsx`, `apps/web/src/lib/gemini-ai.ts`, inclusión en `apps/web/src/components/dashboard-page.tsx`.

- **Rotación: tablas comparativas y toggle**
  - Las tablas comparativas usan los datos filtrados por el toggle (Total/Voluntaria/Involuntaria) en lugar de la serie global.
  - La tabla de “Rotación acumulada 12M” ahora recalcula bajas 12M, promedio de activos 12M y rotación a partir de la serie mensual filtrada, evitando porcentajes desalineados con los conteos.
  - Se agregó ancho mínimo para evitar scroll residual y se reordenó el toggle: Total → Voluntaria → Involuntaria.
  - Archivo: `apps/web/src/components/retention-charts.tsx`, `apps/web/src/components/dashboard-page.tsx`.

- **Legibilidad de gráficas**
  - Ejes de rotación sin etiquetas diagonales (ángulo 0°, mayor espacio de tick).
  - Archivo: `apps/web/src/components/retention-charts.tsx`.

- **Archivo de cambios**
  - Este documento: `cambios_nuevos.md`.
