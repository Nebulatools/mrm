# ML Service Setup - Supabase REST API

## 📋 Resumen

Este servicio ML ahora usa **Supabase REST API** en lugar de conexión directa a PostgreSQL. Esto significa:

✅ **NO necesitas** habilitar PostgreSQL directo en Supabase
✅ **Funciona AHORA** con tu configuración actual
✅ **Más seguro** (usa REST API con autenticación)
✅ **Más rápido** de configurar (solo crear vistas SQL)

## 🚀 Pasos de Configuración (5 minutos)

### Paso 1: Crear Vistas SQL en Supabase

1. Abre tu **Supabase Dashboard**: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt

2. Ve a **SQL Editor** (menú lateral izquierdo)

3. Copia el contenido completo del archivo: `setup_database_views.sql`

4. Pega en el SQL Editor

5. Click en **Run** (botón verde)

6. Deberías ver el mensaje: ✅ **Success. No rows returned**

### Paso 2: Verificar las Vistas

En el mismo SQL Editor, ejecuta estas consultas una por una para verificar:

```sql
-- Verificar vista de rotación (debe retornar número > 0)
SELECT COUNT(*) FROM ml_rotation_features;

-- Verificar vista de ausentismo
SELECT COUNT(*) FROM ml_absenteeism_features;

-- Verificar vista de forecast
SELECT COUNT(*) FROM ml_forecast_features;

-- Ver datos de ejemplo (primeras 3 filas)
SELECT * FROM ml_rotation_features LIMIT 3;
```

Si todas retornan números > 0, ✅ **¡Está funcionando!**

### Paso 3: Verificar Variables de Entorno

Asegúrate que tu archivo `.env` tenga estas variables:

```bash
# Supabase Configuration
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_URL=https://ufdlwhdrrvktthcxwpzt.supabase.co

# Database URL (no se usa pero es requerido)
DATABASE_URL=postgresql://postgres.ufdlwhdrrvktthcxwpzt:Piano81370211%23%23@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**✅ Ya tienes todo configurado!**

### Paso 4: Iniciar el Servicio ML

```bash
cd apps/ml_service
source mrm/bin/activate
uvicorn app.main:app --reload --port 8000
```

Deberías ver:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx]
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Paso 5: Probar desde el Frontend

1. Asegúrate que el servicio web esté corriendo:
   ```bash
   npm run dev
   ```

2. Ve a: http://localhost:3000/admin

3. Busca la sección de **Modelos ML**

4. Click en **"Entrenar Modelo"** para cualquier modelo

5. Deberías ver: ✅ **"Modelo entrenado exitosamente"**

## 🔧 Troubleshooting

### Error: "View 'ml_rotation_features' not found"

**Solución**: No creaste las vistas SQL. Repite el Paso 1.

### Error: "Authentication failed"

**Solución**: Verifica que `SUPABASE_SERVICE_ROLE_KEY` sea correcta en `.env`

### Error: "Module 'httpx' not found"

**Solución**:
```bash
source mrm/bin/activate
pip install httpx python-dotenv
```

### El servicio no inicia

**Solución**: Verifica los logs y asegúrate que las variables de entorno estén correctas:

```bash
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('✅ URL:', os.getenv('SUPABASE_PROJECT_URL')); print('✅ KEY:', os.getenv('SUPABASE_SERVICE_ROLE_KEY')[:20] + '...')"
```

## 📊 Arquitectura

### Antes (PostgreSQL Directo)
```
ML Service → asyncpg → PostgreSQL → Supabase
             ❌ Requiere configuración especial
```

### Ahora (REST API)
```
ML Service → httpx → REST API → PostgreSQL → Supabase
            ✅ Funciona con configuración actual
```

### Vistas SQL Creadas

1. **ml_rotation_features** - Predicción de rotación individual
2. **ml_absenteeism_features** - Predicción de ausentismo
3. **ml_attrition_features** - Análisis de causas de baja
4. **ml_forecast_features** - Pronóstico de incidencias
5. **ml_lifecycle_features** - Análisis de ciclo de vida
6. **ml_patterns_features** - Detección de patrones
7. **ml_productivity_features** - Análisis de productividad

Cada vista pre-computa las features necesarias para el entrenamiento de modelos.

## ✅ Checklist Final

- [ ] Vistas SQL creadas en Supabase
- [ ] Vistas verificadas con `SELECT COUNT(*)`
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (`httpx`, `python-dotenv`)
- [ ] Servicio ML iniciado sin errores
- [ ] Prueba de entrenamiento desde frontend exitosa

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu servicio ML estará completamente funcional y podrás entrenar modelos desde el dashboard.
