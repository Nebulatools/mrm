# 🚀 INSTRUCCIONES SFTP - PASO A PASO

## ✅ **LIMPIEZA COMPLETADA**

Se han eliminado:
- ❌ Archivos SQL antiguos duplicados
- ❌ 10+ APIs innecesarias 
- ❌ Código duplicado

Quedaron solo:
- ✅ `SETUP_CLEAN_DATABASE.sql` - Script principal
- ✅ `apps/web/src/app/api/sftp/` - Conexión SFTP
- ✅ `apps/web/src/app/api/import-sftp-real-data/` - Importación limpia
- ✅ `apps/web/src/app/api/kpis/` - Cálculo KPIs
- ✅ `apps/web/src/app/api/debug-db/` - Debug

## 🛠 **PASOS PARA CONFIGURAR**

### **PASO 1: Ejecutar SQL en Supabase**
1. Ve a tu **Supabase Dashboard**
2. Abre **SQL Editor**
3. Copia y pega todo el contenido de `SETUP_CLEAN_DATABASE.sql`
4. Haz clic en **RUN** 
5. ✅ Verás que se crean las tablas y un empleado de prueba

### **PASO 2: Probar Importación**
1. Ve a `http://localhost:3007/admin`
2. Haz clic en **"Actualizar Lista"** para ver archivos SFTP
3. Haz clic en **"Ejecutar Importación Real"**
4. ✅ Deberías ver: **106 empleados** y **9 bajas** importados

### **PASO 3: Verificar Dashboard**
1. Ve a `http://localhost:3007/`
2. ✅ Verás KPIs con datos reales de MOTO TOTAL
3. ✅ Gráficos con datos reales de 106 empleados

## 📊 **QUÉ DATOS VAS A OBTENER**

### **Empleados Reales (106 registros)**
- **Empresa**: MOTO TOTAL SA DE CV
- **Departamentos**: FILIALES, RH, TECNOLOGÍA, VENTAS, etc.
- **Puestos**: Gerentes, Administrativos, Técnicos, etc.
- **Fechas**: Desde 2023 hasta 2025
- **IMSS**: Números reales de seguridad social
- **Ubicaciones**: Diferentes filiales y oficinas

### **Bajas Reales (9 registros)**
- **Fechas**: 2025-08-02, etc.
- **Motivos**: "Abandono / No regresó", "Renuncia voluntaria", etc.
- **Empleados**: Números reales (2700, etc.)

## 🎯 **ESTRUCTURA FINAL**

```
empleados_sftp (TABLA PRINCIPAL)
├── numero_empleado (Único)
├── nombres, apellidos
├── departamento, puesto, area
├── fecha_ingreso, activo
├── empresa (MOTO TOTAL)
└── 25+ campos adicionales

motivos_baja (BAJAS)
├── numero_empleado
├── fecha_baja
├── tipo, motivo
└── descripcion

plantilla (LEGACY - COMPATIBLE)
├── emp_id
├── nombre, departamento
├── activo, fecha_ingreso
└── puesto, area (NUEVOS)
```

## 🔧 **SI HAY PROBLEMAS**

### **Error: Tablas no existen**
→ Ejecuta `SETUP_CLEAN_DATABASE.sql` completo

### **Error: 0 empleados importados**
→ Revisa que las tablas tengan las columnas correctas

### **Error: SFTP conexión**
→ El servidor SFTP está funcionando (viste en los logs)

### **Dashboard vacío**
→ Los KPIs se calculan automáticamente después de importar

## 🎉 **RESULTADO ESPERADO**

Después de seguir estos pasos tendrás:
- ✅ **106 empleados reales** de MOTO TOTAL
- ✅ **9 bajas reales** con motivos
- ✅ **Dashboard funcional** con KPIs calculados
- ✅ **Gráficos dinámicos** con datos reales
- ✅ **Sistema limpio** sin código duplicado

## 📞 **¿NECESITAS AYUDA?**

Si algo no funciona:
1. Revisa los logs en la consola del navegador
2. Verifica que el SQL se ejecutó completamente
3. Prueba la importación nuevamente
4. Los datos SFTP están llegando correctamente (vimos en logs)

**¡El sistema está listo para funcionar con datos reales de tu empresa!** 🚀