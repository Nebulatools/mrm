# 🚀 GUÍA: Arreglar Producción en Vercel

## 📍 Paso 1: Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Busca tu proyecto **"mrm"** o **"mrm-simple"**
3. Click en el proyecto

---

## 📍 Paso 2: Verificar Variables de Entorno

1. Click en **"Settings"** (en el menú lateral)
2. Click en **"Environment Variables"**
3. **VERIFICA** que tengas estas variables:

### ✅ Variables que DEBEN estar:

```bash
# CRÍTICO: Feature Flag para nuevo UI
NEXT_PUBLIC_FEATURE_DASHBOARD_UI_REFRESH=true

# Supabase (DEBE ser el mismo que local)
NEXT_PUBLIC_SUPABASE_URL=https://ufdlwhdrrvktthcxwpzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZGx3aGRycnZrdHRoY3h3cHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTczODAsImV4cCI6MjA3NTA5MzM4MH0.enmzO8ntpnj1cmc_H0Z2SYkLN-284n7id70_wsQwfnA

# Service Role Key (para operaciones admin)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZGx3aGRycnZrdHRoY3h3cHp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUxNzM4MCwiZXhwIjoyMDc1MDkzMzgwfQ._vU3FjEVtmW-QSeV59T0eEBNaqe_4FTuIQn2WTHm6GE

# Google Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyArNHFd0sXAyQtsTFxCYNRGk-BiBz4HGCE

# SFTP (opcional, solo si usas importación SFTP)
SFTP_HOST=148.244.90.21
SFTP_PORT=5062
SFTP_USER=rhmrm
SFTP_PASSWORD=!M3Gu5t4S0nar98!@
SFTP_DIRECTORY=ReportesRH
```

### 🔍 Environments:
- **Production** ✅ (Debe tener todas)
- **Preview** ⚠️ (Opcional pero recomendado)
- **Development** ⚠️ (Opcional)

---

## 📍 Paso 3: Agregar/Actualizar Variables Faltantes

Si falta alguna variable:

1. Click en **"Add New"** (botón arriba a la derecha)
2. **Key**: Nombre de la variable (ej: `NEXT_PUBLIC_FEATURE_DASHBOARD_UI_REFRESH`)
3. **Value**: El valor (ej: `true`)
4. **Environment**: Selecciona **"Production"** (y opcionalmente Preview/Development)
5. Click en **"Save"**

### ⚠️ MUY IMPORTANTE:

Si la variable **YA EXISTE pero tiene valor diferente**:
1. Click en los **3 puntos** (⋯) a la derecha de la variable
2. Click en **"Edit"**
3. Actualiza el valor
4. Click en **"Save"**

---

## 📍 Paso 4: Verificar Último Deploy

1. Ve a **"Deployments"** (en el menú lateral)
2. El último deploy debe ser reciente (hace unos minutos)
3. Status debe estar: **"Building"** → **"Ready"** ✅

**Si NO ves un nuevo deploy:**
- Click en **"Deployments"** > Botón **"Redeploy"** en el último deployment
- O espera a que el push que hice se procese

---

## 📍 Paso 5: Verificar en Producción

Una vez el deploy esté **"Ready"**:

1. Click en el deployment **"Ready"**
2. Click en **"Visit"** (o copia la URL de producción)
3. **Abre la consola del navegador** (F12 o Cmd+Option+J)
4. Deberías ver:
   ```
   🔄 [useAuth] Fetching user...
   ✅ [useAuth] User found: tu-email
   ✅ [useAuth] Profile loaded: tu-email
   ```

---

## 🚨 Si SIGUE el problema después del deploy:

Verifica en la consola de Vercel (en el deployment):

1. Click en **"Deployments"** > último deployment **"Ready"**
2. Click en **"Functions"** o **"Runtime Logs"**
3. Busca errores relacionados con Supabase o user_profiles

---

## 📋 Checklist Final:

- [ ] Variables de entorno verificadas en Vercel
- [ ] Feature flag `NEXT_PUBLIC_FEATURE_DASHBOARD_UI_REFRESH=true` está activo
- [ ] Supabase URL/Keys son las correctas
- [ ] Deploy completado exitosamente (status "Ready")
- [ ] App de producción probada en el navegador
- [ ] Logs de consola del navegador verificados
- [ ] Fix de RLS aplicado en Supabase (ya lo hicimos)

---

## 💡 Comandos útiles para después:

```bash
# Ver deployments de Vercel desde CLI (si tienes vercel CLI)
vercel ls

# Ver logs en tiempo real
vercel logs [deployment-url]

# Forzar nuevo deploy localmente
vercel --prod
```
