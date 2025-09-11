import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetencionTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Retención — Guía de Cálculo</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Esta página explica cómo calculamos cada KPI y la lógica detrás del tab de Retención.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fuentes de Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Los cálculos se basan en registros provenientes de la tabla <code className="font-mono">empleados_sftp</code> (y
              opcionalmente <code className="font-mono">motivos_baja</code> para enriquecer la fecha/motivo de baja). Estos
              datos se transforman a un formato interno homogéneo (<code className="font-mono">PlantillaRecord</code>).
            </p>
            <ul className="list-disc pl-5">
              <li>Campos clave: <code className="font-mono">fecha_ingreso</code>, <code className="font-mono">fecha_baja</code>, <code className="font-mono">activo</code>, <code className="font-mono">departamento</code>, <code className="font-mono">puesto</code>, <code className="font-mono">clasificacion</code>, <code className="font-mono">ubicacion</code>.</li>
              <li>Si un empleado no tiene <code className="font-mono">fecha_baja</code>, se considera activo hasta el final del período consultado.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros Aplicados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              Los filtros del panel se aplican antes de calcular los KPIs mediante <code className="font-mono">applyRetentionFilters</code>:
            </p>
            <ul className="list-disc pl-5">
              <li>Igualdad exacta para <strong>Departamento</strong>, <strong>Puesto</strong>, <strong>Clasificación</strong> y <strong>Ubicación</strong>.</li>
              <li>
                Para <strong>Año/Mes</strong> se incluye a un empleado si estuvo activo en cualquiera de los pares año/mes seleccionados: un empleado cuenta
                si <code className="font-mono">fecha_ingreso ≤ finDelMes</code> y (no tiene baja o <code className="font-mono">fecha_baja ≥ inicioDelMes</code>).
              </li>
            </ul>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`// Simplificado
incluido(emp, year, month) = ingreso(emp) <= fin(year, month)
                           && (baja(emp) inexistente || baja(emp) >= inicio(year, month))`}</code></pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KPIs de Retención</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold">1) Activos Promedio (mes actual)</h3>
              <p>Promedio de empleados activos al inicio y al final del mes seleccionado.</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`inicioMes = primer_día(mesActual)
finMes    = último_día(mesActual)

activosInicio = count(emp: ingreso(emp) ≤ inicioMes ∧ (baja(emp) inexistente ∨ baja(emp) > inicioMes))
activosFin    = count(emp: ingreso(emp) ≤ finMes   ∧ (baja(emp) inexistente ∨ baja(emp) > finMes))

ActivosPromedio = (activosInicio + activosFin) / 2`}</code></pre>
            </div>

            <div>
              <h3 className="font-semibold">2) Bajas (históricas)</h3>
              <p>Total de registros con <code className="font-mono">fecha_baja</code> dentro del conjunto filtrado.</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`Bajas = count(emp: fecha_baja(emp) existe)`}</code></pre>
            </div>

            <div>
              <h3 className="font-semibold">3) Bajas Tempranas (&lt; 3 meses)</h3>
              <p>Empleados cuya diferencia entre <code className="font-mono">fecha_ingreso</code> y <code className="font-mono">fecha_baja</code> es menor a 3 meses.</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`mesesTrabajados = (fecha_baja - fecha_ingreso) / ~30 días
BajasTempranas = count(emp: mesesTrabajados < 3)`}</code></pre>
            </div>

            <div>
              <h3 className="font-semibold">4) Rotación Mensual (%)</h3>
              <p>Bajas ocurridas dentro del mes actual dividido entre el Activos Promedio del mes, multiplicado por 100.</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`bajasDelMes = count(emp: fecha_baja(emp) ∈ [inicioMes, finMes])
RotaciónMensual(%) = (bajasDelMes / ActivosPromedio) * 100`}</code></pre>
            </div>

            <div>
              <h3 className="font-semibold">5) Rotación Acumulada 12M (%)</h3>
              <p>
                Para cada mes, se calcula una ventana móvil de 12 meses hacia atrás. Se cuentan las bajas en la ventana y se divide entre el
                promedio de activos al inicio y fin de dicha ventana.
              </p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto"><code>{`finVentana   = finDelMesActual
inicio12m    = mismo_día(finVentana) - 11 meses

bajas12m     = count(emp: fecha_baja(emp) ∈ [inicio12m, finVentana])
activosIni12 = count(emp: ingreso(emp) ≤ inicio12m ∧ (baja(emp) inexistente ∨ baja(emp) > inicio12m))
activosFin12 = count(emp: ingreso(emp) ≤ finVentana ∧ (baja(emp) inexistente ∨ baja(emp) > finVentana))

promAct12    = (activosIni12 + activosFin12) / 2
Rotación12M(%) = (bajas12m / promAct12) * 100`}</code></pre>
              <p className="mt-2 text-xs text-gray-500">
                Nota: En retención, una tendencia a la baja (↓) suele ser positiva, ya que implica menor rotación.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supuestos y Consideraciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <ul className="list-disc pl-5">
              <li>Fechas inválidas o ausentes se ignoran en los conteos correspondientes.</li>
              <li>Los porcentajes se redondean a 2 decimales en la UI.</li>
              <li>Los filtros alteran el conjunto de empleados considerado antes de cualquier cálculo.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-right">
          <a href="/" className="text-sm text-blue-600 hover:underline">Volver al Dashboard</a>
        </div>
      </div>
    </div>
  );
}

