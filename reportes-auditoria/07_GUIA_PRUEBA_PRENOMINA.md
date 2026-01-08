# 🚀 Guía para Probar la Importación de Prenomina Horizontal

## ✅ Cambios Implementados

### 1. Base de Datos
- ✅ Tabla `prenomina_horizontal` creada en Supabase
- ✅ 35 columnas: datos por día (Lun-Dom) + totales automáticos
- ✅ Constraints: UNIQUE(numero_empleado, semana_inicio)
- ✅ Índices optimizados para queries frecuentes

### 2. Backend
- ✅ Lógica de importación agregada en `/api/import-real-sftp-force/route.ts`
- ✅ Parser de CSV con manejo de encoding
- ✅ UPSERT automático (no duplica registros)
- ✅ Batch processing (50 registros por lote)

### 3. Frontend
- ✅ UI actualizada en `sftp-import-admin.tsx`
- ✅ Nueva tarjeta para mostrar registros de Prenomina
- ✅ Estilo distintivo (gradient indigo)

---

## 🧪 Cómo Probar

### Opción 1: Desde la UI Admin (Recomendado)

1. **Abre el Admin Panel:**
   ```bash
   npm run dev
   # Abre http://localhost:3003/admin
   ```

2. **Inicia Sesión** como administrador

3. **Ejecuta la Importación:**
   - Busca el botón "FORZAR IMPORTACIÓN REAL"
   - Haz clic y espera ~30-40 segundos
   - Verás una nueva tarjeta **"Prenomina Horizontal"** con el número de registros importados

4. **Verifica los Datos:**
   - Deberías ver ~100 registros importados
   - La tarjeta mostrará "Registros semanales de horas trabajadas"

### Opción 2: Verificación Directa en Supabase

1. **Abre el Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/editor
   ```

2. **Ejecuta este Query:**
   ```sql
   SELECT
     numero_empleado,
     nombre,
     semana_inicio,
     semana_fin,
     total_horas_ord,
     total_horas_te,
     total_horas_semana
   FROM prenomina_horizontal
   ORDER BY semana_inicio DESC, numero_empleado
   LIMIT 10;
   ```

3. **Resultado Esperado:**
   - ~100 registros con datos de la semana más reciente
   - Totales calculados automáticamente
   - Sin duplicados por (numero_empleado, semana_inicio)

### Opción 3: API REST Directa

```bash
# Test con curl (requiere autenticación admin)
curl -X POST http://localhost:3003/api/import-real-sftp-force \
  -H "Content-Type: application/json" \
  -H "Cookie: tu-cookie-de-sesion"
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "empleados": {
      "encontrados": 1043,
      "insertados": 1041,
      "total_en_bd": 1041
    },
    "bajas": {
      "encontradas": 1,
      "insertadas": 1,
      "total_en_bd": 1108
    },
    "asistencia": {
      "encontrados": 6300,
      "insertados": 150,
      "total_en_bd": 2632
    },
    "prenomina": {
      "encontrados": 100,
      "insertados": 100,
      "total_en_bd": 100
    }
  }
}
```

---

## 🔍 Queries de Validación

### 1. Verificar que la tabla existe
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'prenomina_horizontal'
);
-- Resultado esperado: true
```

### 2. Ver estructura de la tabla
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'prenomina_horizontal'
ORDER BY ordinal_position;
```

### 3. Contar registros
```sql
SELECT COUNT(*) as total_registros FROM prenomina_horizontal;
-- Resultado esperado: ~100 (después de la primera importación)
```

### 4. Ver ejemplo de datos
```sql
SELECT
  numero_empleado,
  nombre,
  semana_inicio,
  lun_horas_ord,
  lun_horas_te,
  total_horas_ord,
  total_horas_te,
  total_horas_semana
FROM prenomina_horizontal
LIMIT 5;
```

### 5. Verificar totales calculados
```sql
SELECT
  numero_empleado,
  nombre,
  -- Suma manual
  (lun_horas_ord + mar_horas_ord + mie_horas_ord + jue_horas_ord +
   vie_horas_ord + sab_horas_ord + dom_horas_ord) as suma_manual_ord,
  -- Columna calculada
  total_horas_ord,
  -- Deben ser iguales
  (lun_horas_ord + mar_horas_ord + mie_horas_ord + jue_horas_ord +
   vie_horas_ord + sab_horas_ord + dom_horas_ord) = total_horas_ord as son_iguales
FROM prenomina_horizontal
LIMIT 5;
-- Resultado esperado: son_iguales = true en todas las filas
```

### 6. Top 5 empleados con más horas extras
```sql
SELECT
  numero_empleado,
  nombre,
  semana_inicio,
  total_horas_te as horas_extras,
  total_horas_ord as horas_ordinarias,
  ROUND((total_horas_te::numeric / NULLIF(total_horas_ord, 0) * 100), 2) as porcentaje_he
FROM prenomina_horizontal
WHERE total_horas_te > 0
ORDER BY total_horas_te DESC
LIMIT 5;
```

---

## 📊 Métricas de Éxito

### Antes de la Importación
- ✅ Tabla `prenomina_horizontal` existe
- ✅ Tiene 35 columnas
- ✅ Tiene 0 registros
- ✅ Constraints están habilitados

### Después de la Importación
- ✅ Tiene ~100 registros
- ✅ Sin duplicados (constraint funciona)
- ✅ Totales calculados automáticamente
- ✅ Datos consistentes con archivo SFTP

---

## 🐛 Troubleshooting

### Error: "Table prenomina_horizontal does not exist"
**Solución:** Ejecutar manualmente la migración desde Supabase SQL Editor
```bash
# Copiar el contenido de:
cat supabase/migrations/create_prenomina_horizontal.sql
# Y ejecutarlo en: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt/sql
```

### Error: "duplicate key value violates unique constraint"
**Causa:** Intentando importar la misma semana dos veces
**Solución:** UPSERT automático ya lo maneja (actualiza en lugar de insertar)

### Error: "parsing dates failed"
**Causa:** Formato de fecha inesperado en CSV
**Solución:** La función `parseDate()` maneja múltiples formatos (DD/MM/YYYY, DD/MM/YY, etc.)

### No se ve la tarjeta de Prenomina en la UI
**Causa:** El endpoint `/api/import-sftp-real-data` no devuelve el campo `prenomina`
**Solución:** Usar el botón "FORZAR IMPORTACIÓN REAL" que usa `/api/import-real-sftp-force` (ya actualizado)

---

## 📝 Checklist de Validación

- [ ] Tabla `prenomina_horizontal` existe en Supabase
- [ ] Botón "FORZAR IMPORTACIÓN REAL" funciona sin errores
- [ ] Se muestran ~100 registros importados
- [ ] Tarjeta de Prenomina aparece en la UI
- [ ] Totales calculados son correctos
- [ ] No hay duplicados en la tabla
- [ ] Query de ejemplo devuelve datos válidos

---

## 🎯 Próximos Pasos (Después de Validar)

1. **Crear Panel de Prenomina en Dashboard**
   - Agregar tab "Horas Extras" en el dashboard principal
   - Mostrar gráficas de horas ordinarias vs extras
   - Top 10 empleados con más horas extras
   - Alertas para horas excesivas (>60h/semana)

2. **Agregar KPIs de Horas**
   - Total horas extras del período
   - % horas extras vs ordinarias
   - Costo estimado de horas extras
   - Tendencia semanal

3. **Integrar con AI Insights**
   - Detectar patrones de horas extras
   - Identificar departamentos con sobrecarga
   - Sugerir optimizaciones de recursos

---

**FIN DE LA GUÍA**

*¡Todo listo para probar! 🎉*
