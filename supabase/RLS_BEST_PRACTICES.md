# RLS Best Practices - Evitar Recursión Infinita

Este documento explica cómo evitar problemas de recursión infinita en políticas RLS de Supabase.

## ❌ **Problema: Recursión Infinita**

Esta política causa **deadlock** y loading infinito:

```sql
-- ❌ INCORRECTO - Consulta user_profiles dentro de su propia policy
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- ❌ RECURSIÓN INFINITA
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**¿Por qué falla?**
- Cuando intentas leer `user_profiles`, Supabase evalúa la policy
- La policy necesita consultar `user_profiles` para verificar si eres admin
- Eso requiere evaluar la policy de nuevo → **loop infinito**
- La query nunca termina → timeout → loading infinito

---

## ✅ **Solución: Usar SECURITY DEFINER**

Crear una función con `SECURITY DEFINER` que se ejecuta con privilegios elevados:

```sql
-- ✅ CORRECTO - Función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ✅ CORRECTO - Policy usa la función sin recursión
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());  -- ✅ Sin recursión
```

**¿Por qué funciona?**
- `SECURITY DEFINER` ejecuta la función con permisos del creador (superuser)
- La función puede leer `user_profiles` sin pasar por las políticas RLS
- No hay recursión → query termina rápido

---

## 📋 **Checklist de Políticas RLS**

Antes de crear una política RLS, verifica:

- [ ] ¿La política consulta la misma tabla que protege?
- [ ] Si consulta la misma tabla, ¿usa una función `SECURITY DEFINER`?
- [ ] ¿La función está en el esquema `public`?
- [ ] ¿La función tiene el flag `SECURITY DEFINER`?
- [ ] ¿La función está marcada como `STABLE` (no modifica datos)?

---

## 🔍 **Detectar Recursión en Producción**

Ejecuta este query en Supabase SQL Editor:

```sql
SELECT
  policyname,
  CASE
    WHEN qual LIKE '%user_profiles%' AND policyname LIKE '%Admin%'
    THEN '❌ RECURSIÓN DETECTADA'
    WHEN qual LIKE '%is_admin()%'
    THEN '✅ OK - Sin recursión'
    ELSE '⚠️ Revisar: ' || qual
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
```

---

## 🚀 **Aplicar Fix en Producción**

Si detectas recursión:

1. Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Ejecuta: `/supabase/migrations/20251016_ensure_no_rls_recursion.sql`
3. Verifica que retorna: `✅ CORRECTO - Sin recursión`
4. Redeploy tu app si es necesario

---

## 📚 **Referencias**

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- Fix aplicado: commit `7b01d44`
