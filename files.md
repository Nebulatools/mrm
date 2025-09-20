Tab de retención — Implementación completada.

Cambios sin afectar otras funcionalidades. Código DRY y limpio.

1) Quitar card “Bajas Tempranas” — Hecho.

2) Agregar card “Rotación Año Actual” (rotación mensual acumulada del calendario, Ene → mes actual) — Hecho.

3) Mapear motivos de bajas (tabla Supabase motivos_baja) a nombres correctos y mostrarlos en:
   - 📋 Detalle de Bajas (empleados_sftp)
   - 🚦 Bajas por Motivo - {año}
   Implementado normalizador y mapeo de motivos (incluye: “Rescisión por desempeño”, “Rescisión por disciplina”, “Término de contrato”).

4) En las cards “Bajas”, “Rotación Mensual”, “Rotación Acumulada (12M)” y “Rotación Año Actual”, mostrar segundo dato con solo los motivos clave anteriores — Hecho (dato secundario, principal = total).

5) Leyendas y decimales en gráficas:
   - Leyendas en español — Verificadas/ajustadas.
   - Decimales a 1 — Ajustados en tooltips/tablas/KPI.
   - “Número de Bajas” visible en Rotación por Temporalidad — Ajuste de eje/label aplicado.
   - Eje Y de “Rotación Acumulada (12 meses móviles)” fijado a 50–100 — Hecho.

Archivos modificados principales:
- apps/web/src/components/dashboard-page.tsx
- apps/web/src/components/kpi-card.tsx
- apps/web/src/components/kpi-chart.tsx
- apps/web/src/components/retention-charts.tsx
- apps/web/src/components/dismissal-reasons-table.tsx
- apps/web/src/lib/kpi-calculator.ts
- apps/web/src/lib/normalizers.ts (nuevo)

Notas:
- El mapeo de motivos/departamentos/incidencias está centralizado en apps/web/src/lib/normalizers.ts.
- Los valores secundarios de rotación se muestran con 1 decimal (%).
