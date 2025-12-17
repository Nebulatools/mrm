1. ayduame a que en la pagian de admin/ cuando el admin quiere agregar un user, pueda hacerlo sin probelma!, ahi veo que estan os suarios y puede revocarlos, quiero eetnde que hace el boon de revocar, elimina el user de la base de datos?, es ddua, quieor tambein que pueda agregar nuevos users y que aaarezcan en la base de datos ok?, que el pueda elejir el correo, y que la contraseña se aun aautogenerada que , por lo pornt que aparezca la contraseña ahi en la lista, a alado del corre o abajo en el columan de emial, abajo del ID:, 

2. queiero agregar una garfica tipo como la que estan en la tab de rotacion que tiene barras del año actual y sombreado comntra año anterior, peor en la tab de incidencias, queioro que aparezca en la tercera posicion del grid donde estan las garfcias de : Ausentismos vs Permisos por día y Ausentismos vs Permisos por área, alaod de esa grafica, ,esta garfica va atener ene el eje x el mes y en el eje y el orcentaje, lo que queremos graficar es 1- ((la proporcion de dias laborables - las faltas)/total de dias), esper que si m ehaya dado a entender!.

Antes de realizar estos cambios, conectate al proyetco de supabase cn el id: ufdlwhdrrvktthcxwpzt y analizame las tablas de incidencias que es donde vamos a trabaajr en esa pestaña, perp tambein teneos las tablas de empleados_sftp y la de motivos_baja por si acaso!, analzaie bien mis tablas de supbase para que sepas como fucnina la estrcutura y ahora si hazme los cmabios, y para el punto uno creo que peudes veriifcar la tabla de user_empresa_access y user_profiles, y puedes verificar el folder de docs para que sepas como funciiona tooda la auethetntciacon, en caso de necesirarlo!

---

# Resumen de cambios implementados (admin + incidencias)

## Admin (/admin → Whitelist)
- Se agregó flujo de creación de usuarios con contraseña autogenerada, selección de rol y empresas (la primera es principal). La contraseña se muestra solo al crear.
- El botón de acción cambió a **Eliminar** con modal de confirmación; elimina al usuario de Supabase Auth y borra sus accesos (`user_empresa_access`) y perfil (`user_profiles`).
- Se mantienen los controles para asignar/quitar empresas y roles; guardar sigue funcionando igual.

## Gráfica nueva: “Ausentismo mensual vs año anterior” (tab Incidencias)
- Ubicada en la tercera tarjeta junto a “Ausentismos vs Permisos por día/área”.
- Barras = año actual, área sombreada = año anterior (si hay datos). Se ocultó la etiqueta “(año anterior)”.
- Fórmula implementada: `1 - ((días laborables - faltas) / días laborables)` → porcentaje de ausentismo.
  - **Días laborables**: suma de días activos por empleado en el mes (usa plantilla `empleados_sftp` y `calcularDiasActivo`/`countActivosEnFecha`).
  - **Faltas**: conteo de incidencias del mes con códigos `FI, SUS, PSIN, ENFE` (ya existían en `IncidentsTab`).
  - Se compara mes a mes contra el año previo; si el año previo no tiene datos, solo se ven barras del año actual.

# Notas breves sobre datos consultados
- `empleados_sftp`: plantilla, campos de empresa/área/departamento y fechas de ingreso/baja.
- `incidencias`: campos `emp`, `fecha`, `inci`; índice por fecha/emp; usado para ausentismo.
- `user_profiles` / `user_empresa_access`: control de whitelist, roles y empresas por usuario.
