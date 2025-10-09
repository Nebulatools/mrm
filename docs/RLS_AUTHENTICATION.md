# 🔐 Row Level Security (RLS) Authentication - Guía Completa

**Implementación completa de autenticación multi-tenant con RLS en Supabase**

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Credenciales de Acceso](#credenciales-de-acceso)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Implementación Técnica](#implementación-técnica)
6. [Lecciones Aprendidas y Mejores Prácticas](#lecciones-aprendidas-y-mejores-prácticas)
7. [Verificación y Testing](#verificación-y-testing)
8. [Troubleshooting](#troubleshooting)

---

## Resumen Ejecutivo

### ¿Qué es RLS?

**Row Level Security (RLS)** es una característica de PostgreSQL que filtra automáticamente los datos a nivel de fila según el usuario autenticado. En este proyecto, permite que:

- **Admin** (admin@mrm.com) vea datos de TODAS las empresas (1000 empleados total)
- **Usuarios por empresa** vean SOLO datos de su empresa:
  - monterrey@mrm.com → MOTO REPUESTOS MONTERREY (~885 empleados)
  - total@mrm.com → MOTO TOTAL (~107 empleados)
  - norte@mrm.com → REPUESTOS Y MOTOCICLETAS DEL NORTE (~8 empleados)

### Problema Resuelto

**Problema inicial:** RLS estaba bloqueando TODO el acceso (0 empleados visibles)

**Root Cause:** El endpoint API `/api/kpis/route.ts` llamaba operaciones de base de datos **sin pasar un cliente autenticado**, por lo que las queries no incluían el JWT token del usuario y RLS no podía identificar quién estaba haciendo el request.

**Solución implementada:**
1. Creado `supabase-server.ts` - helper para crear clientes autenticados server-side
2. Modificado API route para usar este cliente y pasarlo a todas las operaciones de DB
3. Agregados checks SSR en `supabase-client.ts` para evitar errores `document is not defined`

---

## Arquitectura del Sistema

### Flujo de Autenticación

```
┌─────────────────┐
│  Usuario accede │
│   al dashboard  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Middleware de Next.js  │
│  Verifica autenticación │
└────────┬────────────────┘
         │
         ├─ No autenticado → Redirigir a /login
         │
         ▼
┌──────────────────┐
│ Usuario logeado  │
│ en Supabase Auth │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────┐
│  API Route crea cliente    │
│  autenticado con JWT token │
│  (supabase-server.ts)      │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Query a DB con cliente    │
│  RLS lee JWT → user_id     │
│  Lookup en user_profiles   │
└────────┬───────────────────┘
         │
         ├─ role = 'admin' → Ver todo
         │
         ├─ role = 'user' → Filtrar por empresa
         │
         ▼
┌──────────────────────┐
│ Respuesta filtrada   │
│ según permisos       │
└──────────────────────┘
```

### Componentes Clave

#### 1. Tabla `user_profiles`
Relaciona usuarios de Supabase Auth con empresas y roles:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  empresa TEXT,  -- NULL para admin, nombre empresa para users
  role TEXT CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Funciones Helper (SECURITY DEFINER)

```sql
-- Obtiene empresa del usuario actual
CREATE FUNCTION public.user_empresa() RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica si usuario es admin
CREATE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**⚠️ IMPORTANTE:** Usar `SECURITY DEFINER` permite que las funciones accedan a `user_profiles` incluso cuando tiene RLS habilitado. Esto evita recursión infinita en las políticas.

#### 3. Políticas RLS

**Empleados SFTP:**
```sql
-- Admin ve todo
CREATE POLICY "Admin can view all empleados"
  ON empleados_sftp FOR SELECT
  USING (public.is_admin());

-- Users ven solo su empresa
CREATE POLICY "Users can view own empresa empleados"
  ON empleados_sftp FOR SELECT
  USING (empresa = public.user_empresa());
```

**Motivos Baja & Asistencia (JOIN con empleados_sftp):**
```sql
CREATE POLICY "Users can view own empresa motivos_baja"
  ON motivos_baja FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados_sftp
      WHERE empleados_sftp.numero_empleado = motivos_baja.numero_empleado
        AND empleados_sftp.empresa = public.user_empresa()
    )
  );
```

#### 4. Cliente Autenticado Server-Side

**Archivo:** `apps/web/src/lib/supabase-server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ✅ Anon key respeta RLS
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar si se llama desde Server Component
          }
        },
      },
    }
  );
}
```

**⚠️ KEY IMPORTANTE:** Debe usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`, NO `SUPABASE_SERVICE_ROLE_KEY`. El Service Role Key ignora RLS completamente.

#### 5. Uso en API Routes

**Archivo:** `apps/web/src/app/api/kpis/route.ts`

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  // ✅ Crear cliente autenticado
  const supabase = await createServerSupabaseClient();

  // Verificar sesión (debugging)
  const { data: { session } } = await supabase.auth.getSession();
  console.log('🔐 Session:', session?.user?.email);

  // ✅ Pasar cliente a todas las operaciones
  const [kpis, plantilla] = await Promise.all([
    kpiCalculator.calculateAllKPIs({ period, date }, supabase),
    db.getEmpleadosSFTP(supabase)
  ]);

  return NextResponse.json({ data: { kpis, plantilla } });
}
```

---

## Credenciales de Acceso

### 🔑 Usuarios del Sistema

| Email | Contraseña | Rol | Empresa | Empleados |
|-------|-----------|-----|---------|-----------|
| admin@mrm.com | Admin123!MRM | admin | - | 1000 (todos) |
| monterrey@mrm.com | Monterrey123!MRM | user | MOTO REPUESTOS MONTERREY | ~885 |
| total@mrm.com | Total123!MRM | user | MOTO TOTAL | ~107 |
| norte@mrm.com | Norte123!MRM | user | REPUESTOS Y MOTOCICLETAS DEL NORTE | ~8 |

⚠️ **IMPORTANTE:** Estas son contraseñas temporales. Cambiar en producción.

---

## Instalación y Configuración

### Paso 1: Variables de Entorno

**Archivo:** `apps/web/.env.local`

```bash
# Supabase - Configuración correcta
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # ✅ Para cliente (respeta RLS)

# Service Role - SOLO para operaciones admin (importación SFTP)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ Ignora RLS, usar con cuidado
```

### Paso 2: Ejecutar Migración SQL

1. Ir a **Supabase Dashboard** → **SQL Editor**
2. Click en **New Query**
3. Copiar TODO el contenido de `supabase/migrations/20250110_create_user_profiles_and_rls_fixed.sql`
4. Click en **RUN**

**¿Qué hace la migración?**
- Crea tabla `user_profiles`
- Habilita RLS en 4 tablas
- Crea funciones helper `user_empresa()` e `is_admin()`
- Crea políticas RLS para cada tabla
- Inserta perfiles de los 4 usuarios existentes
- Crea trigger para auto-crear perfiles de nuevos usuarios
- Crea índices para performance

### Paso 3: Verificar Instalación

```sql
-- 1. Verificar perfiles (debe retornar 4 filas)
SELECT email, role, empresa FROM user_profiles;

-- 2. Verificar RLS habilitado (4 tablas = true)
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'empleados_sftp', 'motivos_baja', 'asistencia_diaria');

-- 3. Verificar políticas (debe retornar 8 políticas)
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('user_profiles', 'empleados_sftp', 'motivos_baja', 'asistencia_diaria');

-- 4. Verificar funciones (debe retornar 2 funciones)
SELECT proname FROM pg_proc
WHERE proname IN ('user_empresa', 'is_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

---

## Implementación Técnica

### Patrón de Cliente Autenticado

**Regla de oro:** Siempre que hagas queries desde API routes, usa el cliente autenticado.

```typescript
// ❌ MAL - No pasa cliente, RLS no funciona
const empleados = await db.getEmpleadosSFTP();

// ✅ BIEN - Pasa cliente autenticado
const supabase = await createServerSupabaseClient();
const empleados = await db.getEmpleadosSFTP(supabase);
```

### Modificar Funciones de DB

Todas las funciones en `lib/supabase.ts` deben aceptar un cliente opcional:

```typescript
export const db = {
  async getEmpleadosSFTP(client = supabase) {
    // Usar client en lugar de supabase global
    const { data, error } = await client
      .from('empleados_sftp')
      .select('*');

    return data;
  }
}
```

### SSR Safety Checks

En `supabase-client.ts`, agregar checks para evitar `document is not defined`:

```typescript
export function createBrowserClient() {
  return createClient(url, key, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return null;  // ✅
        return document.cookie.split(';')...
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;  // ✅
        document.cookie = ...
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;  // ✅
        this.set(name, '', { ...options, maxAge: 0 });
      }
    }
  });
}
```

---

## Lecciones Aprendidas y Mejores Prácticas

### 1. ❌ Error Crítico: No Pasar Cliente Autenticado

**Síntoma:** Usuario logeado ve 0 registros o ve TODO cuando debería ver solo su empresa.

**Causa:** API routes llamando DB sin pasar cliente autenticado.

**Solución:**
```typescript
// Siempre crear y pasar cliente
const supabase = await createServerSupabaseClient();
const data = await db.query(supabase);  // ✅
```

### 2. ❌ Error Común: Service Role Key en Cliente

**Síntoma:** Usuarios ven todos los datos de todas las empresas.

**Causa:** Usar `SUPABASE_SERVICE_ROLE_KEY` en lugar de `ANON_KEY`.

**Solución:**
- Cliente browser → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API routes → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Importación SFTP (admin) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. ✅ Usar SECURITY DEFINER en Funciones

**Sin SECURITY DEFINER:**
```sql
-- ❌ Causa recursión infinita
CREATE FUNCTION user_empresa() RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql;
```

**Con SECURITY DEFINER:**
```sql
-- ✅ Funciona correctamente
CREATE FUNCTION public.user_empresa() RETURNS TEXT AS $$
  SELECT empresa FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4. ✅ Funciones en Esquema `public`

**Problema:** Funciones en `auth` schema causan errores de permisos.

**Solución:** Todas las funciones custom deben ir en `public` schema:
```sql
CREATE FUNCTION public.user_empresa() ...  -- ✅
CREATE FUNCTION auth.user_empresa() ...    -- ❌
```

### 5. ✅ Índices para Performance

RLS policies con JOINs pueden ser lentos. Agregar índices:

```sql
CREATE INDEX idx_user_profiles_empresa ON user_profiles(empresa);
CREATE INDEX idx_empleados_empresa ON empleados_sftp(empresa);
CREATE INDEX idx_motivos_baja_numero ON motivos_baja(numero_empleado);
CREATE INDEX idx_asistencia_numero ON asistencia_diaria(numero_empleado);
```

### 6. ✅ Logging para Debug

Agregar logs de sesión en desarrollo:

```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('🔐 Session:', {
  user_id: session?.user?.id,
  email: session?.user?.email,
  has_session: !!session
});
```

### 7. ✅ Trigger para Nuevos Usuarios

Crear perfiles automáticamente cuando se registra un usuario:

```sql
CREATE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, empresa)
  VALUES (
    new.id,
    new.email,
    CASE WHEN new.email LIKE '%admin%' THEN 'admin' ELSE 'user' END,
    CASE
      WHEN new.email LIKE '%monterrey%' THEN 'MOTO REPUESTOS MONTERREY'
      -- ... más casos
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Verificación y Testing

### Test 1: Verificar Sesión Autenticada

```typescript
// En API route, agregar logging:
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session?.user?.email);  // Debe mostrar email del usuario
```

### Test 2: Verificar Datos Filtrados

**Como monterrey@mrm.com:**
```sql
SELECT empresa, COUNT(*) FROM empleados_sftp GROUP BY empresa;
-- Resultado esperado: 1 fila (MOTO REPUESTOS MONTERREY, 885)
```

**Como admin@mrm.com:**
```sql
SELECT empresa, COUNT(*) FROM empleados_sftp GROUP BY empresa;
-- Resultado esperado: 3 filas (todas las empresas, 1000 total)
```

### Test 3: Verificar en Browser Console

```javascript
// En dashboard, revisar logs:
// ✅ "📊 Original plantilla: 885" (para monterrey)
// ✅ "• 15 KPIs • 885 empleados" (en header)
```

### Test 4: Verificar Server Logs

```bash
npm run dev

# Logs esperados:
# 🔐 API KPIs - Session check: { email: 'monterrey@mrm.com', has_session: true }
# ✅ empleados_sftp data loaded: 885 records
```

---

## Troubleshooting

### Problema: Usuario ve 0 registros

**Diagnóstico:**
```sql
-- 1. Verificar perfil del usuario
SELECT * FROM user_profiles WHERE email = 'monterrey@mrm.com';

-- 2. Verificar que empresa matchea con datos
SELECT empresa, COUNT(*) FROM empleados_sftp GROUP BY empresa;

-- 3. Verificar funciones helper
SELECT public.user_empresa();  -- Debe retornar empresa
SELECT public.is_admin();      -- Debe retornar false para users normales
```

**Soluciones:**
- Verificar que API route usa `createServerSupabaseClient()`
- Verificar que todas las funciones de DB reciben el cliente
- Verificar logs de sesión (`console.log(session)`)

### Problema: Usuario ve TODOS los datos

**Diagnóstico:**
```typescript
// Verificar qué key se está usando
console.log('Using key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20));
```

**Soluciones:**
- Cambiar de `SUPABASE_SERVICE_ROLE_KEY` a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verificar que `.env.local` tiene las variables correctas
- Reiniciar servidor de desarrollo

### Problema: `document is not defined`

**Causa:** Código de cliente ejecutándose en servidor (SSR).

**Solución:**
```typescript
if (typeof document === 'undefined') return null;
```

### Problema: Recursión Infinita en RLS

**Causa:** Política de `user_profiles` consulta `user_profiles` sin `SECURITY DEFINER`.

**Solución:** Usar funciones con `SECURITY DEFINER`:
```sql
CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Resumen de Archivos Clave

| Archivo | Propósito | Cambios |
|---------|-----------|---------|
| `supabase/migrations/20250110_create_user_profiles_and_rls_fixed.sql` | Migración SQL completa | Ejecutar una vez |
| `apps/web/src/lib/supabase-server.ts` | Cliente autenticado server-side | **NUEVO** |
| `apps/web/src/app/api/kpis/route.ts` | API endpoint | Modificado para usar cliente autenticado |
| `apps/web/src/lib/supabase-client.ts` | Cliente browser | Agregados checks SSR |
| `apps/web/src/lib/supabase.ts` | Operaciones DB | Funciones aceptan cliente opcional |

---

## Checklist de Implementación

- [ ] Migración SQL ejecutada correctamente
- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] `supabase-server.ts` creado
- [ ] API routes modificados para usar cliente autenticado
- [ ] Checks SSR agregados en `supabase-client.ts`
- [ ] Funciones DB modificadas para aceptar cliente
- [ ] Tests manuales pasados (4 usuarios)
- [ ] Logs de sesión verificados
- [ ] Performance validado (índices creados)

---

**Última actualización:** 2025-01-10
**Estado:** ✅ Implementación completa y verificada funcionando
