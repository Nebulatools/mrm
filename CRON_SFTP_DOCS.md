# Sincronización Automática SFTP - Documentación Completa

## Cómo funciona (paso a paso)

### El flujo completo cuando Vercel dispara el cron:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. VERCEL CRON (vercel.json)                                    │
│    Lee el schedule y dispara un GET request a:                  │
│    GET /api/cron/sync-sftp                                      │
│    Con header: Authorization: Bearer <CRON_SECRET>              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MIDDLEWARE (src/middleware.ts)                                │
│    Intercepta TODAS las requests antes de llegar al API route.  │
│    Revisa si el usuario tiene sesión (cookies de Supabase).     │
│                                                                 │
│    ⚠️ BUG ANTERIOR: El cron NO tiene sesión → middleware lo     │
│    redirigía a /login → nunca llegaba al API route.             │
│                                                                 │
│    ✅ FIX: Se agregó '/api/' a publicPaths para que las rutas   │
│    de API pasen sin sesión (cada API route maneja su propia     │
│    autenticación internamente).                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CRON ROUTE (src/app/api/cron/sync-sftp/route.ts)            │
│    - Lee CRON_SECRET de variables de entorno                    │
│    - Compara con el Authorization header de Vercel              │
│    - Si coincide → hace fetch interno a:                        │
│      POST /api/import-sftp-real-data?trigger=cron               │
│      Con header: x-cron-secret: <CRON_SECRET>                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. MIDDLEWARE (otra vez)                                        │
│    La llamada interna del cron a /api/import-sftp-real-data     │
│    también pasa por el middleware. Sin el fix, también se       │
│    bloqueaba aquí.                                              │
│    ✅ Con '/api/' en publicPaths, pasa sin problema.            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. SERVER-AUTH (src/lib/server-auth.ts) → requireAdmin()       │
│    El endpoint import-sftp-real-data llama a requireAdmin().    │
│    Esta función tiene 2 formas de autenticar:                   │
│                                                                 │
│    Forma A (cron): Revisa header "x-cron-secret" y lo compara  │
│    con la variable CRON_SECRET del entorno.                     │
│                                                                 │
│    Forma B (usuario): Revisa cookies de Supabase para validar   │
│    que sea un admin logueado.                                   │
│                                                                 │
│    ⚠️ BUG ANTERIOR: server-auth leía CRON_SYNC_SECRET primero, │
│    pero el cron route enviaba CRON_SECRET. Tenían valores       │
│    DIFERENTES → nunca coincidían → 401 Unauthorized.            │
│                                                                 │
│    ✅ FIX: Ahora ambos usan CRON_SECRET || CRON_SYNC_SECRET    │
│    (mismo orden de prioridad = mismo valor).                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. IMPORT ROUTE (src/app/api/import-sftp-real-data/route.ts)   │
│    Autenticación pasó → ejecuta la importación real:            │
│    - Conecta al servidor SFTP                                   │
│    - Descarga archivos Excel/CSV                                │
│    - Parsea los datos                                           │
│    - Compara estructura (columnas) con última importación       │
│    - Si hay cambios de estructura → requiere aprobación admin   │
│    - Si no hay cambios → importa automáticamente                │
│    - Inserta/actualiza en Supabase:                             │
│      · empleados_sftp                                           │
│      · motivos_baja                                             │
│      · incidencias                                              │
│      · prenomina_horizontal                                     │
│    - Actualiza sync_settings (last_run, next_run)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archivos involucrados

### Configuración del cron
| Archivo | Qué hace |
|---------|----------|
| `vercel.json` (raíz) | Define el cron schedule. Vercel lee este archivo para saber cuándo disparar. |
| `apps/web/vercel.json` | Copia del schedule (Vercel puede leer de cualquiera). |

**Formato del schedule (cron expression):**
```
"schedule": "40 22 * * *"
              │  │  │ │ │
              │  │  │ │ └── Día de la semana (0=dom, 1=lun, *=todos)
              │  │  │ └──── Mes (1-12, *=todos)
              │  │  └────── Día del mes (1-31, *=todos)
              │  └────────── Hora UTC (0-23)
              └──────────── Minuto (0-59)

Ejemplos:
  "0 2 * * 1"    = Lunes a las 2:00 AM UTC (8:00 PM domingo Monterrey)
  "40 22 * * *"  = Diario a las 22:40 UTC (4:40 PM Monterrey)
  "0 14 * * 1-5" = Lunes a viernes a las 8:00 AM Monterrey
```

**IMPORTANTE: Vercel usa UTC. Monterrey (CST) = UTC - 6 horas.**

### Archivos de código (los que se modificaron)

#### 1. `apps/web/src/middleware.ts` (FIX aplicado)
- **Función**: Intercepta TODAS las requests antes de que lleguen a cualquier ruta.
- **Qué hace**: Verifica si el usuario tiene sesión activa de Supabase.
- **Cambio**: Se agregó `'/api/'` a `publicPaths` (línea 35).
- **Por qué**: El cron de Vercel no tiene sesión de usuario. Sin este fix, el middleware redirigía el cron a `/login`.
- **Seguridad**: No se pierde seguridad porque cada API route valida permisos internamente con `requireAdmin()`.

#### 2. `apps/web/src/lib/server-auth.ts` (FIX aplicado)
- **Función**: Provee `requireAdmin()` que valida permisos en todos los API routes.
- **Qué hace**: Acepta 2 tipos de auth: secreto de cron (header) o sesión de usuario (cookies).
- **Cambio**: Línea 6, de `process.env.CRON_SYNC_SECRET` a `process.env.CRON_SECRET || process.env.CRON_SYNC_SECRET`.
- **Por qué**: El cron route envía `CRON_SECRET` pero server-auth buscaba `CRON_SYNC_SECRET`. Son variables con valores diferentes.

#### 3. `apps/web/src/app/api/cron/sync-sftp/route.ts` (NO modificado)
- **Función**: Punto de entrada del cron. Vercel llama aquí.
- **Qué hace**:
  1. Valida el `Authorization: Bearer <secret>` de Vercel
  2. Construye la URL del endpoint de importación
  3. Hace `fetch()` interno a `/api/import-sftp-real-data` pasando `x-cron-secret`
  4. Retorna el resultado

#### 4. `apps/web/src/app/api/import-sftp-real-data/route.ts` (NO modificado)
- **Función**: La importación real de datos desde SFTP.
- **Qué hace**: Conecta SFTP → descarga archivos → parsea → inserta en Supabase.
- **Es el mismo endpoint que usa el botón "Actualizar Información" del admin.**

---

## Variables de entorno necesarias en Vercel

```
CRON_SECRET=l3EGDRUC9/Itjer7NIA0tZ68tBOQDzmMRlacREfVW6s=   ← Vercel la genera automáticamente
CRON_SYNC_SECRET=un-secreto-seguro-para-sync                 ← Secundaria (fallback)

# SFTP (necesarias para la importación)
SFTP_HOST=...
SFTP_PORT=22
SFTP_USER=...
SFTP_PASSWORD=...
SFTP_DIRECTORY=ReportesRH

# Supabase (necesarias para guardar datos)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## El problema de los secretos (explicación detallada)

En el `.env` local hay 2 variables de secreto:
```
CRON_SECRET=l3EGDRUC9/Itjer7NIA0tZ68tBOQDzmMRlacREfVW6s=
CRON_SYNC_SECRET=un-secreto-seguro-para-sync
```

**Son valores DIFERENTES.** El problema era que cada archivo leía una diferente:

```
ANTES (roto):
┌──────────────────────────┐     ┌──────────────────────────┐
│ cron/sync-sftp/route.ts  │     │ server-auth.ts           │
│                          │     │                          │
│ CRON_SECRET              │     │ CRON_SYNC_SECRET         │
│ || CRON_SYNC_SECRET      │     │ (solo esta)              │
│                          │     │                          │
│ Resultado:               │     │ Resultado:               │
│ "l3EGDRUC9/..."          │     │ "un-secreto-seguro..."   │
│                          │     │                          │
│ Envía: l3EGDRUC9/...     │ ──► │ Compara contra:          │
│                          │     │ un-secreto-seguro...     │
│                          │     │ ❌ NO COINCIDEN          │
└──────────────────────────┘     └──────────────────────────┘

DESPUÉS (arreglado):
┌──────────────────────────┐     ┌──────────────────────────┐
│ cron/sync-sftp/route.ts  │     │ server-auth.ts           │
│                          │     │                          │
│ CRON_SECRET              │     │ CRON_SECRET              │
│ || CRON_SYNC_SECRET      │     │ || CRON_SYNC_SECRET      │
│                          │     │                          │
│ Resultado:               │     │ Resultado:               │
│ "l3EGDRUC9/..."          │     │ "l3EGDRUC9/..."          │
│                          │     │                          │
│ Envía: l3EGDRUC9/...     │ ──► │ Compara contra:          │
│                          │     │ l3EGDRUC9/...            │
│                          │     │ ✅ COINCIDEN             │
└──────────────────────────┘     └──────────────────────────┘
```

---

## Tabla sync_settings (en Supabase)

Guarda la configuración y estado del cron:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `frequency` | Frecuencia de sync | `daily`, `weekly`, `manual` |
| `day_of_week` | Día (solo para weekly) | `monday` |
| `run_time` | Hora de ejecución (UTC) | `22:40` |
| `last_run` | Última vez que corrió | `2026-03-13T18:42:46Z` |
| `next_run` | Próxima ejecución calculada | `2026-03-14T22:40:00Z` |

**Nota**: Esta tabla es informativa para la UI del admin. El cron real lo controla `vercel.json`.

---

## Dónde verificar que el cron funcionó

1. **Vercel Dashboard → Crons tab**: Muestra historial de ejecuciones con status (success/error)
2. **Vercel Dashboard → Logs**: Busca los console.logs del cron ("Cron job triggered", "Sincronización completada")
3. **Supabase → sync_settings**: La columna `last_run` se actualiza cada ejecución
4. **Supabase → tablas de datos**: Verificar que `empleados_sftp`, `motivos_baja`, `incidencias`, `prenomina_horizontal` tengan datos actualizados

---

## Conversión de horarios UTC ↔ Monterrey

| Monterrey (CST) | UTC | Cron expression |
|------------------|-----|-----------------|
| 2:00 AM | 8:00 AM | `0 8 * * *` |
| 6:00 AM | 12:00 PM | `0 12 * * *` |
| 12:00 PM | 6:00 PM | `0 18 * * *` |
| 4:40 PM | 10:40 PM | `40 22 * * *` |
| 8:00 PM | 2:00 AM (+1 día) | `0 2 * * *` |

**Fórmula**: Hora UTC = Hora Monterrey + 6 horas

---

## Config actual (temporal para test)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sftp",
      "schedule": "40 22 * * *"
    }
  ]
}
```
= Diario a las **4:40 PM Monterrey** (22:40 UTC)

### Después del test exitoso, cambiar a producción:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sftp",
      "schedule": "0 8 * * 1"
    }
  ]
}
```
= Lunes a las **2:00 AM Monterrey** (8:00 UTC)
