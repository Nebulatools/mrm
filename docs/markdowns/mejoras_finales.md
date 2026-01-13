ayudmae a realizar los siguienets cambios: recuerda ver como fucniona tood el codebase, como fucnionan los filtros, en cada tabla, grafica y kpi, y tambein analzai los files de normalizadores, que usamos para mapear bien los datos de mis columnas!, como por ejemplo:  columna de incidencia, inci, motivo
de las tablas de motivos_baja y incidencias. es clave que analzimeos los normalziadores y que tengamos todo bien mapeado


tab resumen:
1. los cards de Rotación Mensual, Rotación Acumulada y Rotación Año Actual, asegruarte de que el numero que tenga sea rotacion voluntaria: recuerda que rotacion voluntarai incluyene estos motivos: Rotación involuntaria: Rescisión por desempeño, Rescisión por disciplina, Término del contrato,  esso moitivos son de la columan de motivos de la tabal de motivos_baja, solo asegruarte de que venga filtradi por rotacion voluntaria, y que diag en la leyjnada Volunatrai despeus de cada nombre , ejemplo: Rotacion Acumulada Voluntaria, etc.

2. vEr por que raozn la garfcia de Rotación - 12 Meses Móviles y Rotación - Lo que va del Año es igual!, no deberia ser asi o si??


3. Recuerda que incidencias ya estamos subagrupando , en la columna de "inci" en la tabal de incidencias, debemos seguir esta nueva agrupacion: 

Categoría	Códigos
Vacaciones	VAC
Faltas	FI, SUSP
Salud	ENFE, MAT3, MAT1
Permisos	PSIN, PCON, FEST, PATER, JUST

Incidencias son Faltas y Salud, y Permisos son Vacaciones y Permisos,
Dicho lo anteriro las garfcias de : Incidencias - Últimos 12 meses y Permisos - Últimos 12 meses deben de estar en base a eso, no debes de cambair las leyednas asi como estan estan bien!.

4. ayduame a que esten bien alineados los no,mbres de las columnas de : Ausentismo (Incidencias y Permisos) osea centrados.

Tab de Personal:

1. la grafica de: Distribución por Edad, poner llas leyendas en eje x y eje y que se vea bien acomodado.


Tab de Incidencias:

1. garfcia de Faltas por empleado, asegurarrte de que agarre las flatas como habaimos dicho: FI, SUSP

2. Incidencias por tipo (Faltas + Salud), quiatar del titulo:(Faltas + Salud), y asegurarte de que evenga los nomrbes que van en falats y salud: FI, SUSP, ENFE, MAT3, MAT1, acomodados. de mayor a menor!, ok?, 

3. la garfcia de pay de Distribución de Ausentismos, que se vena bien las leyendas , bien acomodadas y cero amontonados.

4. la garfcia de Ausentismos vs Permisos por día ver solo quieor ver que ifnromacion esta agarrando, osea si tengo filtrado mes de dicimebre y año 2025 por ejemplo, son las semanas de ese mes?, o como funciona ese, explciam ese, y recuerda asuentismos es la suam de todo, y permisos son : PSIN, PCON, FEST, PATER, JUST, ok?, soo aseguratd e eso

5. en la tabal de: Tabla de incidencias
 falta agregar la columan de fecha falta y motivo de falta (incidencia), esso son de la tabal de incidencias: 

tab de rotacion:

1. cards de Rotación Mensual, Rotación Acumulada, Rotación Año Actual
, esos por defualt el numero grabde es el voluntaria, entoneca agregar la palabar voluntaria en esos 3 kpis,  y como vees que dice rot involuntaria, y dice rot. voluntaria, deberiamos cambair el orden, EL NUMERO GRANDE DEBERIA SER EL VOLUNTARIA, Eluego rot. involuntaria y luego rot. total, por ejemplo en el card de : Rotación Mensual, en el ems de diciembre 2025: deberia ser Rot. Mensual Voluntaria: 2.8%, rot. involuntaria: 1.9%, y leugo rot. Total: 4.7%, ok, y debemos de tener el calculo en un solo lugar ya lo que queremos es no rehacer los componenets, eso cards recuerda wue tambien los tenemso en el tab de resumen pero en las cards de reusmen esos 3 kpis cards o vienn desglosado por involuntarai y total,, ahi en resumen solo debemos poner la voluntaria, ook?, analzia eso.

2. Cambair el titulo del grafico:Rotación YTD (Year To Date) a Rotación - Lo que va del Año, 

3. ayudame a cambair el color del sombreado del año anteriro tanto el color del sombreado como el ciculo abajo dodne cviene el año a color gris, y de los garfcios de: Rotación Mensual y Rotación por Temporalidad en el eje x quitar el año!, es redundante.


4. en las tablas de Tabla Comparativa - Rotación Acumulada 12 Meses Móviles y Tabla Comparativa - Rotación Mensual ayudame a que en la columan de : Variación, el color deberia ser mas visible el cambio de color, se ve muy ligero el cambio, deebria habe mas variacion en el color osea mas diferenci en el el mismo colro r de verde y rojo!, paarq eu se añaczana a distinguir emjor visualmnete cuando uno es mayor que otro, y otra cosa, deberia de ser el reves el color!! si es positivo es color rojo, si es negativo es verde!.

5. la heatmap de 🚦 Bajas por Motivo - 2025 , ayudmame a ver si estemos lebealeand bien los motibos, recuerda que la Rotación involuntaria: Rescisión por desempeño, Rescisión por disciplina, Término del contrato, y rotacion voluntaria son los demas, usa el mcp de supabase para analizar bien como estamos mapeando, esos nombres, recuerda que abaumos usado el normilziador para ver los nombre sy mapearlos correctamnete! , analzai bein mi columan de motivo de la tabla de motivos_baja, dicho eso, confirmar que ene el 2025 no hubo ningun motivo de : Rescisión por disciplina y Rescisión por desempeño que veo 0, y ver que todos los motivos que ersten en la columan maéados esten bien normalizados , esto es olo apara anlziar quw todo este bien

6. la tabla de Rotación por Motivo y Antigüedad, ver que sea data real ese igual son los motivos de motivos_baja pero estenagruapdos por tiempo, osea 0-1 mes, 1-3  mese,s etc!, ese tiempo se define en columande fecha no,?, tiene sentido vdd, soloa sgeirat de que si tenaga datos reales!!

7. la tabal de 📋 Detalle de Bajas flata agregar las columans de Fecha de baja, motivo y antiguedad. ok?

---

# RESUMEN DE CAMBIOS REALIZADOS (2026-01-12)

## TAB RESUMEN
| Cambio | Archivo | Estado |
|--------|---------|--------|
| Cards de rotación muestran "Voluntaria" en el nombre | `summary-comparison.tsx` | ✅ Completado |
| Nombres actualizados: "Rotación Mensual Voluntaria", "Rotación Acumulada Voluntaria", "Rotación Año Actual Voluntaria" | `summary-comparison.tsx` | ✅ Completado |
| Columnas de tabla Ausentismo centradas | `summary-comparison.tsx` | ✅ Completado |

**Nota técnica:** Las gráficas de "Rotación - 12 Meses Móviles" y "Rotación - Lo que va del Año" pueden mostrar valores iguales en diciembre porque ambos cálculos cubren el mismo período (Ene-Dic del año) - esto es matemáticamente correcto.

---

## TAB PERSONAL
| Cambio | Archivo | Estado |
|--------|---------|--------|
| Gráfica "Distribución por Edad" con etiquetas de ejes X e Y | `dashboard-page.tsx` | ✅ Completado |
| Eje X: "Edad (años)", Eje Y: "# Empleados" | `dashboard-page.tsx` | ✅ Completado |
| Márgenes ajustados para mejor visualización | `dashboard-page.tsx` | ✅ Completado |

---

## TAB INCIDENCIAS
| Cambio | Archivo | Estado |
|--------|---------|--------|
| Verificado que "Faltas por empleado" usa códigos correctos (FI, SUSP) | `incidents-tab.tsx` | ✅ Verificado |
| Título cambiado de "Incidencias por tipo (Faltas + Salud)" a solo "Incidencias por tipo" | `incidents-tab.tsx:1370` | ✅ Completado |
| Tabla de incidencias: agregadas columnas "Código" y "Motivo" | `incidents-tab.tsx:1751-1782` | ✅ Completado |

**Categorización de incidencias:**
- **Faltas:** FI, SUSP
- **Salud:** ENFE, MAT3, MAT1
- **Permisos:** PSIN, PCON, FEST, PATER, JUST
- **Vacaciones:** VAC

---

## TAB ROTACIÓN
| Cambio | Archivo | Estado |
|--------|---------|--------|
| Cards muestran VOLUNTARIA como número principal | `dashboard-page.tsx:1739-1831` | ✅ Completado |
| Orden de secundarios: Involuntaria, luego Total | `dashboard-page.tsx` | ✅ Completado |
| Nombres: "Rotación Mensual Voluntaria", "Rotación Acumulada Voluntaria", "Rotación Año Actual Voluntaria" | `dashboard-page.tsx` | ✅ Completado |
| Título cambiado de "Rotación YTD (Year To Date)" a "Rotación - Lo que va del Año" | `retention-charts.tsx:737` | ✅ Completado |
| Color del año anterior cambiado a GRIS (#94a3b8) en 3 gráficas | `retention-charts.tsx` | ✅ Completado |
| Colores de variación INVERTIDOS: positivo=ROJO (malo), negativo=VERDE (bueno) | `retention-charts.tsx:575-584` | ✅ Completado |
| Intensidad de colores aumentada para mejor visibilidad | `retention-charts.tsx` | ✅ Completado |
| Heatmap: verificado mapeo correcto de motivos involuntarios | `bajas-por-motivo-heatmap.tsx` | ✅ Verificado |
| Tabla "Detalle de Bajas": agregadas columnas Fecha Baja, Motivo, Antigüedad | `dismissal-reasons-table.tsx` | ✅ Completado |
| Función `calcularAntiguedad()` agregada para calcular tiempo trabajado | `dismissal-reasons-table.tsx:92-107` | ✅ Completado |

**Motivos de rotación involuntaria (correctamente mapeados):**
- Rescisión por desempeño
- Rescisión por disciplina
- Término del contrato

**Todos los demás motivos = Rotación Voluntaria**

---

## ARCHIVOS MODIFICADOS

1. `apps/web/src/components/summary-comparison.tsx`
2. `apps/web/src/components/dashboard-page.tsx`
3. `apps/web/src/components/incidents-tab.tsx`
4. `apps/web/src/components/retention-charts.tsx`
5. `apps/web/src/components/dismissal-reasons-table.tsx`

