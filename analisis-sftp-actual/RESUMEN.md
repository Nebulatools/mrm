# Resumen de Archivos SFTP - Análisis de Fechas

**Fecha de análisis:** 8/1/2026, 8:50:23 p.m.
**Total de archivos:** 4

---

## Resumen Ejecutivo

| Archivo | Registros | Rango de Fechas | Fechas Válidas |
|---------|-----------|-----------------|----------------|
| Incidencias.csv | 66 | 2026-01-05 → 2026-01-11 | 66 |
| MotivosBaja.csv | 1 | 2026-01-06 → 2026-01-06 | 1 |
| Prenomina Horizontal.csv | 366 | N/A | N/A |
| Validacion Alta de empleados.csv | 1,043 | 1953-08-15 → 2026-01-07 | 3,335 |

---


## Incidencias.csv

- **Registros:** 66
- **Columnas totales:** 13
- **Columnas con fechas:** Fecha
- **Rango de fechas:** 2026-01-05 → 2026-01-11
- **Total de fechas válidas:** 66

**Todas las columnas:**
- N?mero
- Nombre
- Fecha
- Turno
- Horario
- Incidencia
- Entra
- Sale
- Ordinarias
- #
- INCI
- Status
- Ubicacion2

---


## MotivosBaja.csv

- **Registros:** 1
- **Columnas totales:** 6
- **Columnas con fechas:** Fecha
- **Rango de fechas:** 2026-01-06 → 2026-01-06
- **Total de fechas válidas:** 1

**Todas las columnas:**
- Fecha
- #
- Tipo
- Motivo
- Descripci?n
- Observaciones

---


## Prenomina Horizontal.csv

- **Registros:** 366
- **Columnas totales:** 30
- **Columnas con fechas:** Ninguna
- **Rango de fechas:** No detectado

**Todas las columnas:**
- N?mero
- Nombre
- LUN
- LUN-ORD
- LUN- TE
- LUN-INC
- MAR
- MAR-ORD
- MAR - TE
- MAR-INC
- MIE
- MIE-ORD
- MIE - TE
- MIE-INC
- JUE
- JUE-ORD
- JUE - TE
- JUE-INC
- VIE
- VIE-ORD
- VIE - TE
- VIE-INC
- SAB
- SAB-ORD
- SAB - TE
- SAB-INC
- DOM
- DOM-ORD
- DOM - TE
- DOM-INC

---


## Validacion Alta de empleados.csv

- **Registros:** 1,043
- **Columnas totales:** 28
- **Columnas con fechas:** Fecha de Nacimiento, Fecha Ingreso, Fecha Antig?edad, Fecha Baja
- **Rango de fechas:** 1953-08-15 → 2026-01-07
- **Total de fechas válidas:** 3,335

**Todas las columnas:**
- N?mero
- Gafete
- G?nero
- IMSS
- Fecha de Nacimiento
- Estado
- Fecha Ingreso
- Fecha Antig?edad
- Empresa
- No. Registro Patronal
- CodigoPuesto
- Puesto
- C?digo Depto
- Departamento
- C?digo de CC
- CC
- Subcuenta CC
- Clasificaci?n
- Codigo Area
- Area
- Ubicaci?n
- Tipo de N?mina
- Turno
- Prestaci?n de Ley
- Paquete de Prestaciones
- Fecha Baja
- Activo
- Ubicacion2

---


## Notas Técnicas

### Formatos de fecha soportados:
- `DD/MM/YY` (ej: 16/06/01 = 16 de junio de 2001)
- `DD/MM/YYYY` (ej: 16/06/2001)
- `YYYY-MM-DD` (formato ISO)
- `YYYY-MM-DDTHH:MM:SS±TZ` (formato ISO con timezone)

### Interpretación de años de 2 dígitos:
- 00-49 = 2000-2049
- 50-99 = 1950-1999

### Columnas analizadas:
- Se buscan automáticamente columnas que contienen la palabra "fecha" (case-insensitive)
- Se analizan TODOS los registros de cada archivo para determinar el rango completo
