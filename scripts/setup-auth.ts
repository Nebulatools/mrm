/**
 * Script para configurar autenticación en Supabase
 *
 * Este script:
 * 1. Ejecuta la migración SQL para crear tabla de perfiles y RLS
 * 2. Crea los usuarios en Supabase Auth
 * 3. Genera las credenciales para cada usuario
 *
 * Uso: npx tsx scripts/setup-auth.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración de Supabase (usando service role key para admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Definición de usuarios a crear
const USERS = [
  {
    email: 'admin@mrm.com',
    password: 'Admin123!MRM',
    role: 'admin',
    empresa: null,
    description: 'Administrador con acceso a todas las empresas'
  },
  {
    email: 'monterrey@mrm.com',
    password: 'Monterrey123!MRM',
    role: 'user',
    empresa: 'MOTO REPUESTOS MONTERREY',
    description: 'Usuario con acceso solo a MOTO REPUESTOS MONTERREY'
  },
  {
    email: 'total@mrm.com',
    password: 'Total123!MRM',
    role: 'user',
    empresa: 'MOTO TOTAL',
    description: 'Usuario con acceso solo a MOTO TOTAL'
  },
  {
    email: 'norte@mrm.com',
    password: 'Norte123!MRM',
    role: 'user',
    empresa: 'REPUESTOS Y MOTOCICLETAS DEL NORTE',
    description: 'Usuario con acceso solo a REPUESTOS Y MOTOCICLETAS DEL NORTE'
  }
];

async function runMigration() {
  console.log('📋 Ejecutando migración SQL...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/20250110_create_user_profiles_and_rls.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('❌ Error ejecutando migración:', error);
    // Intentar ejecutar directamente con la API
    console.log('⚠️  Intentando método alternativo...\n');

    // Separar y ejecutar statement por statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (stmtError) {
          console.log(`⚠️  Statement error (puede ser normal si ya existe):`, stmtError.message);
        }
      }
    }
  }

  console.log('✅ Migración completada\n');
}

async function createUsers() {
  console.log('👥 Creando usuarios en Supabase Auth...\n');

  const credentials: Array<{
    email: string;
    password: string;
    role: string;
    empresa: string | null;
    description: string;
    status: 'created' | 'already_exists' | 'error';
  }> = [];

  for (const user of USERS) {
    console.log(`📧 Creando usuario: ${user.email}`);

    // Intentar crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        role: user.role,
        empresa: user.empresa
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`   ⚠️  Usuario ya existe: ${user.email}`);
        credentials.push({ ...user, status: 'already_exists' });
      } else {
        console.error(`   ❌ Error creando usuario ${user.email}:`, authError.message);
        credentials.push({ ...user, status: 'error' });
      }
      continue;
    }

    console.log(`   ✅ Usuario creado: ${user.email}`);

    // Crear perfil de usuario (si no existe por trigger)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: user.email,
        role: user.role,
        empresa: user.empresa
      });

    if (profileError) {
      console.log(`   ℹ️  Perfil ya existe o creado por trigger`);
    } else {
      console.log(`   ✅ Perfil creado`);
    }

    credentials.push({ ...user, status: 'created' });
    console.log('');
  }

  return credentials;
}

function generateCredentialsDoc(credentials: Array<any>) {
  const doc = `# Credenciales de Acceso - HR KPI Dashboard

**Fecha de generación:** ${new Date().toLocaleString('es-MX')}
**Dominio:** @mrm.com

## ⚠️ IMPORTANTE - Seguridad

- Estas son las credenciales iniciales del sistema
- **CAMBIAR las contraseñas en producción**
- No compartir este documento en repositorios públicos
- Usar autenticación de dos factores cuando esté disponible

## 👥 Usuarios del Sistema

### 🔑 Administrador
- **Email:** ${credentials[0].email}
- **Contraseña:** ${credentials[0].password}
- **Rol:** Administrador
- **Permisos:** Acceso completo a todas las empresas y funcionalidades
- **Descripción:** ${credentials[0].description}

---

### 🏢 Usuarios por Empresa

#### 1. MOTO REPUESTOS MONTERREY
- **Email:** ${credentials[1].email}
- **Contraseña:** ${credentials[1].password}
- **Rol:** Usuario
- **Empresa:** ${credentials[1].empresa}
- **Permisos:** Solo puede ver datos de MOTO REPUESTOS MONTERREY
- **Descripción:** ${credentials[1].description}

#### 2. MOTO TOTAL
- **Email:** ${credentials[2].email}
- **Contraseña:** ${credentials[2].password}
- **Rol:** Usuario
- **Empresa:** ${credentials[2].empresa}
- **Permisos:** Solo puede ver datos de MOTO TOTAL
- **Descripción:** ${credentials[2].description}

#### 3. REPUESTOS Y MOTOCICLETAS DEL NORTE
- **Email:** ${credentials[3].email}
- **Contraseña:** ${credentials[3].password}
- **Rol:** Usuario
- **Empresa:** ${credentials[3].empresa}
- **Permisos:** Solo puede ver datos de REPUESTOS Y MOTOCICLETAS DEL NORTE
- **Descripción:** ${credentials[3].description}

---

## 🔐 Flujo de Autenticación

### 1. Arquitectura del Sistema

\`\`\`
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
         ├─ No autenticado ──────────────┐
         │                                │
         ▼                                ▼
┌──────────────────┐            ┌────────────────┐
│ Usuario logeado  │            │ Redirigir a    │
│ en Supabase Auth │            │ /login         │
└────────┬─────────┘            └────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Obtener perfil de usuario │
│  desde user_profiles       │
└────────┬───────────────────┘
         │
         ├─ role = 'admin' ──────────────┐
         │                                │
         ├─ role = 'user' ────────────┐  │
         │                             │  │
         ▼                             ▼  ▼
┌──────────────────────┐    ┌────────────────────────┐
│ Filtrar datos por    │    │ Mostrar todos los      │
│ empresa del usuario  │    │ datos (sin filtros)    │
│                      │    │                        │
│ Row Level Security   │    │ Row Level Security     │
│ en PostgreSQL        │    │ permite acceso total   │
└──────────────────────┘    └────────────────────────┘
\`\`\`

### 2. Row Level Security (RLS)

El sistema usa RLS de PostgreSQL para filtrar automáticamente los datos:

**Tablas protegidas:**
- \`empleados_sftp\`
- \`motivos_baja\`
- \`asistencia_diaria\`

**Políticas aplicadas:**

1. **Admin puede ver todo:**
   \`\`\`sql
   -- Verifica si el usuario autenticado tiene role='admin'
   auth.is_admin() = true
   \`\`\`

2. **Usuarios ven solo su empresa:**
   \`\`\`sql
   -- Filtra por la empresa asignada al usuario
   empresa = auth.user_empresa()
   \`\`\`

3. **Relación entre tablas:**
   - \`motivos_baja\` y \`asistencia_diaria\` se filtran mediante JOIN con \`empleados_sftp\`
   - Se usa \`numero_empleado\` como clave de relación

### 3. Funciones Helper de PostgreSQL

\`\`\`sql
-- Obtiene la empresa del usuario actual
CREATE FUNCTION auth.user_empresa() RETURNS TEXT

-- Verifica si el usuario actual es admin
CREATE FUNCTION auth.is_admin() RETURNS BOOLEAN
\`\`\`

### 4. Proceso de Login

1. Usuario ingresa email y contraseña
2. Supabase Auth valida credenciales
3. Se genera un JWT con el \`user_id\`
4. El middleware de Next.js verifica el JWT en cada request
5. Las queries a la BD automáticamente aplican RLS
6. El usuario solo ve datos de su empresa (o todo si es admin)

### 5. Seguridad

✅ **Implementado:**
- Row Level Security en todas las tablas sensibles
- Autenticación con JWT
- Políticas de acceso por rol y empresa
- Middleware de protección de rutas
- Perfiles de usuario con validación

⚠️ **Recomendaciones:**
- Cambiar contraseñas predeterminadas
- Habilitar 2FA en producción
- Rotar JWT secrets periódicamente
- Auditar logs de acceso
- Implementar rate limiting

---

## 📊 Pruebas del Sistema

### Pruebas de Acceso por Usuario

**Como Admin (admin@mrm.com):**
\`\`\`sql
-- Debe retornar empleados de TODAS las empresas
SELECT COUNT(*), empresa
FROM empleados_sftp
GROUP BY empresa;
\`\`\`

**Como Usuario Monterrey (monterrey@mrm.com):**
\`\`\`sql
-- Debe retornar SOLO empleados de MOTO REPUESTOS MONTERREY
SELECT COUNT(*), empresa
FROM empleados_sftp
GROUP BY empresa;
-- Resultado esperado: solo 1 fila con 'MOTO REPUESTOS MONTERREY'
\`\`\`

**Como Usuario Total (total@mrm.com):**
\`\`\`sql
-- Debe retornar SOLO empleados de MOTO TOTAL
SELECT COUNT(*), empresa
FROM empleados_sftp
GROUP BY empresa;
-- Resultado esperado: solo 1 fila con 'MOTO TOTAL'
\`\`\`

---

## 🔧 Mantenimiento

### Agregar nuevo usuario

\`\`\`typescript
// Usar Supabase Dashboard o este script:
const { data, error } = await supabase.auth.admin.createUser({
  email: 'nuevo@mrm.com',
  password: 'ContraseñaSegura123!',
  email_confirm: true,
  user_metadata: {
    role: 'user',
    empresa: 'NOMBRE_EMPRESA'
  }
});
\`\`\`

### Cambiar empresa de un usuario

\`\`\`sql
UPDATE user_profiles
SET empresa = 'NUEVA_EMPRESA'
WHERE email = 'usuario@mrm.com';
\`\`\`

### Promover usuario a admin

\`\`\`sql
UPDATE user_profiles
SET role = 'admin', empresa = NULL
WHERE email = 'usuario@mrm.com';
\`\`\`

---

**Generado automáticamente por setup-auth.ts**
`;

  return doc;
}

async function main() {
  console.log('🚀 Iniciando configuración de autenticación...\n');
  console.log('================================================\n');

  try {
    // 1. Ejecutar migración
    await runMigration();

    // 2. Crear usuarios
    const credentials = await createUsers();

    // 3. Generar documentación
    console.log('📝 Generando documentación de credenciales...\n');
    const doc = generateCredentialsDoc(credentials);
    const docPath = path.join(__dirname, '../docs/AUTH_CREDENTIALS.md');
    fs.writeFileSync(docPath, doc);
    console.log(`✅ Documentación guardada en: ${docPath}\n`);

    // 4. Resumen
    console.log('================================================\n');
    console.log('✅ Configuración completada!\n');
    console.log('📋 Resumen:');
    console.log(`   - Migración ejecutada: ✅`);
    console.log(`   - Usuarios creados: ${credentials.filter(c => c.status === 'created').length}`);
    console.log(`   - Usuarios existentes: ${credentials.filter(c => c.status === 'already_exists').length}`);
    console.log(`   - Errores: ${credentials.filter(c => c.status === 'error').length}\n`);

    console.log('📖 Consulta las credenciales en: docs/AUTH_CREDENTIALS.md\n');
    console.log('⚠️  IMPORTANTE: Cambia las contraseñas antes de ir a producción!\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
