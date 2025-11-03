# Configuración MCP de Supabase

## ✅ Configuración Completada

El MCP (Model Context Protocol) de Supabase ha sido configurado exitosamente en este proyecto.

## 📁 Archivos Configurados

### 1. `.claude/mcp.json`
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://ufdlwhdrrvktthcxwpzt.supabase.co",
        "SUPABASE_ACCESS_TOKEN": "sbp_a5bb9a0e21f7ae5c3d16d32c23bbfb662b28c0e7"
      }
    }
  }
}
```

### 2. `.claude/settings.local.json`
```json
{
  "enabledMcpjsonServers": [
    "shadcn",
    "supabase"
  ],
  "enableAllProjectMcpServers": true
}
```

## 🔌 Capacidades del MCP de Supabase

Una vez reiniciado Claude Code, tendrás acceso a las siguientes funcionalidades:

### Gestión de Proyectos
- ✅ `list_projects` - Listar todos tus proyectos de Supabase
- ✅ `get_project` - Obtener detalles de un proyecto específico
- ✅ `create_project` - Crear nuevos proyectos
- ✅ `pause_project` - Pausar proyectos
- ✅ `restore_project` - Restaurar proyectos pausados

### Gestión de Base de Datos
- ✅ `list_tables` - Listar todas las tablas en un schema
- ✅ `execute_sql` - Ejecutar consultas SQL directamente
- ✅ `apply_migration` - Aplicar migraciones DDL
- ✅ `list_migrations` - Ver historial de migraciones

### Edge Functions
- ✅ `list_edge_functions` - Listar funciones Edge
- ✅ `get_edge_function` - Obtener código de una función
- ✅ `deploy_edge_function` - Desplegar nuevas funciones

### Branches (Desarrollo)
- ✅ `create_branch` - Crear branch de desarrollo
- ✅ `list_branches` - Listar branches
- ✅ `merge_branch` - Merge a producción
- ✅ `reset_branch` - Reset de branch
- ✅ `rebase_branch` - Rebase sobre producción

### Otras Utilidades
- ✅ `get_logs` - Ver logs del proyecto
- ✅ `get_advisors` - Obtener recomendaciones de seguridad/performance
- ✅ `generate_typescript_types` - Generar tipos TypeScript

## 🚀 Cómo Usar

### Ejemplo 1: Validar Datos para Modelo de Rotación

```
Claude, por favor ejecuta la siguiente consulta en Supabase:

SELECT
    COUNT(*) AS total_bajas,
    COUNT(*) FILTER (WHERE fecha_baja >= CURRENT_DATE - INTERVAL '365 days') AS bajas_ultimo_año
FROM motivos_baja;
```

Claude usará automáticamente `mcp__supabase__execute_sql` para ejecutar la query.

### Ejemplo 2: Listar Tablas

```
Claude, lista todas las tablas en el schema público de Supabase
```

Claude usará `mcp__supabase__list_tables`.

### Ejemplo 3: Aplicar Migración

```
Claude, crea una migración para agregar un índice en la columna fecha_baja de motivos_baja
```

Claude usará `mcp__supabase__apply_migration`.

## 🔄 Reiniciar Claude Code

**IMPORTANTE**: Para que los cambios tengan efecto, necesitas:

1. **Opción A - Recargar ventana** (recomendado):
   - Cmd+Shift+P (macOS) / Ctrl+Shift+P (Windows/Linux)
   - Buscar: "Developer: Reload Window"
   - Enter

2. **Opción B - Cerrar y abrir**:
   - Cerrar completamente Cursor/VSCode
   - Volver a abrir el proyecto

## 🧪 Verificar Configuración

Después de reiniciar, prueba:

```
Claude, lista mis proyectos de Supabase
```

Si responde con información del proyecto `ufdlwhdrrvktthcxwpzt`, ¡está funcionando! 🎉

## 📊 Caso de Uso: Validar Datos del Modelo

Ahora puedes pedirle a Claude que ejecute las queries de validación del diagnóstico:

```
Claude, ejecuta las queries de validación de datos de docs/ml/ROTATION_MODEL_DIAGNOSIS.md
en Supabase y muéstrame los resultados
```

## 🔐 Seguridad

- ✅ Las credenciales están en `.claude/mcp.json` (archivo local)
- ✅ Este archivo NO debe incluirse en git (ya está en .gitignore)
- ✅ El token de acceso (`SUPABASE_ACCESS_TOKEN`) es personal y temporal
- ⚠️ Si compartes el proyecto, cada desarrollador debe configurar su propio token

## 📝 Renovar Token (si expira)

1. Ve a: https://supabase.com/dashboard/account/tokens
2. Genera un nuevo token de acceso
3. Actualiza el valor en `.claude/mcp.json` → `env.SUPABASE_ACCESS_TOKEN`
4. Reinicia Claude Code

## 🐛 Troubleshooting

### Error: "MCP server not found"
- Verifica que `.claude/mcp.json` existe
- Verifica que `settings.local.json` incluye "supabase" en `enabledMcpjsonServers`
- Reinicia Claude Code

### Error: "Authentication failed"
- Verifica el token en `.claude/mcp.json`
- Genera un nuevo token en Supabase Dashboard
- Verifica que la URL del proyecto es correcta

### Error: "npx command not found"
- Instala Node.js (https://nodejs.org/)
- Verifica: `npx --version`

## 📚 Referencias

- **MCP Supabase Docs**: https://github.com/modelcontextprotocol/servers/tree/main/src/supabase
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ufdlwhdrrvktthcxwpzt
- **Claude Code MCP Docs**: https://docs.claude.com/en/docs/claude-code/mcp

---

**Estado**: ✅ Configurado
**Proyecto**: mrm_simple (HR KPI Dashboard)
**Supabase Project ID**: `ufdlwhdrrvktthcxwpzt`
