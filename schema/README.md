# Esquema de Base de Datos - MRM Simple

Este directorio contiene la estructura SQL completa de las tablas utilizadas en el proyecto MRM Simple.

## Estructura de Tablas

### 1. empleados_sftp
Tabla principal con datos maestros de empleados importados desde SFTP.
- **996 registros** actualmente
- Campos clave: numero_empleado, nombres, apellidos, puesto, departamento, area, fecha_ingreso, fecha_baja, activo
- Variables demográficas: genero, fecha_nacimiento, estado
- Variables organizacionales: empresa, tipo_nomina, turno, clasificacion

### 2. motivos_baja
Registro de terminaciones y sus causas.
- **602 registros** actualmente
- Campos clave: numero_empleado, fecha_baja, tipo, motivo, descripcion
- Para análisis de rotación voluntaria vs involuntaria

### 3. asistencia_diaria
Control de asistencia diaria (actualmente vacía).
- Campos clave: numero_empleado, fecha, horas_trabajadas, horas_incidencia, presente
- Para métricas de ausentismo y productividad

### 4. incidencias
Registro detallado de incidencias de asistencia.
- **4,923 registros** actualmente
- Campos clave: emp (numero_empleado), fecha, inci (código incidencia), incidencia (descripción)
- Códigos de incidencia: VAC, INC, FJ, FI, etc.
- Para análisis de correlación entre incidencias y bajas

## Variables Disponibles para Matriz de Correlación

### Variables Demográficas
- Género
- Edad (calculada desde fecha_nacimiento)
- Estado de origen

### Variables Organizacionales
- Departamento
- Puesto
- Area
- Empresa
- Tipo de nómina
- Turno
- Clasificación
- Antigüedad (calculada desde fecha_ingreso)

### Variables de Performance
- Número de incidencias por empleado
- Tipos de incidencias más frecuentes
- Horas de incidencia promedio
- Ausentismo general

### Variables de Outcome
- **Rotación**: Si el empleado causó baja (1/0)
- **Tipo de baja**: Voluntaria/Involuntaria
- **Ausentismo**: Nivel de incidencias por empleado

## Instrucciones de Uso

1. Ejecutar los scripts SQL en orden para crear las tablas
2. Los índices están incluidos para optimizar consultas
3. Usar estos esquemas para migrar a nuevas bases de datos
4. Mantener la estructura al hacer cambios en producción

## Notas Importantes

- La tabla `asistencia_diaria` está disponible pero sin datos
- La tabla `incidencias` contiene el histórico detallado de ausentismo
- Todas las tablas tienen RLS (Row Level Security) habilitado
- Usar `numero_empleado` como clave foránea entre tablas