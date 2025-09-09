'use client'

import { useEffect, useState } from 'react'
import { db } from '@/lib/supabase'
import type { PlantillaRecord, IncidenciaRecord, ActividadRecord } from '@/lib/supabase'

export default function AdminPage() {
  const [plantilla, setPlantilla] = useState<PlantillaRecord[]>([])
  const [incidencias, setIncidencias] = useState<IncidenciaRecord[]>([])
  const [act, setAct] = useState<ActividadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load all tables
        const [plantillaData, incidenciasData, actData] = await Promise.all([
          db.getPlantilla(),
          db.getIncidencias(),
          db.getACT()
        ])

        setPlantilla(plantillaData)
        setIncidencias(incidenciasData)
        setAct(actData)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        <p>Cargando datos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración - Base de Datos</h1>
      
      {/* PLANTILLA Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Tabla PLANTILLA ({plantilla.length} registros)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">EMP_ID</th>
                <th className="border px-4 py-2">Nombre</th>
                <th className="border px-4 py-2">Departamento</th>
                <th className="border px-4 py-2">Area</th>
                <th className="border px-4 py-2">Activo</th>
                <th className="border px-4 py-2">Fecha Ingreso</th>
                <th className="border px-4 py-2">Fecha Baja</th>
              </tr>
            </thead>
            <tbody>
              {plantilla.slice(0, 20).map((emp) => (
                <tr key={emp.id} className={emp.activo ? '' : 'bg-red-50'}>
                  <td className="border px-4 py-2">{emp.id}</td>
                  <td className="border px-4 py-2">{emp.emp_id}</td>
                  <td className="border px-4 py-2">{emp.nombre}</td>
                  <td className="border px-4 py-2">{emp.departamento}</td>
                  <td className="border px-4 py-2">{emp.area || 'N/A'}</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      emp.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="border px-4 py-2">{emp.fecha_ingreso}</td>
                  <td className="border px-4 py-2">{emp.fecha_baja || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {plantilla.length > 20 && (
            <p className="text-sm text-gray-500 mt-2">
              Mostrando los primeros 20 de {plantilla.length} registros
            </p>
          )}
        </div>
      </div>

      {/* ACT Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Tabla ACT ({act.length} registros)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">EMP_ID</th>
                <th className="border px-4 py-2">Fecha</th>
                <th className="border px-4 py-2">Presente</th>
              </tr>
            </thead>
            <tbody>
              {act.slice(0, 50).map((record) => (
                <tr key={record.id}>
                  <td className="border px-4 py-2">{record.id}</td>
                  <td className="border px-4 py-2">{record.emp_id}</td>
                  <td className="border px-4 py-2">{record.fecha}</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      record.presente 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {act.length > 50 && (
            <p className="text-sm text-gray-500 mt-2">
              Mostrando los primeros 50 de {act.length} registros
            </p>
          )}
        </div>
      </div>

      {/* INCIDENCIAS Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Tabla INCIDENCIAS ({incidencias.length} registros)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">EMP_ID</th>
                <th className="border px-4 py-2">Fecha</th>
                <th className="border px-4 py-2">Tipo</th>
                <th className="border px-4 py-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {incidencias.slice(0, 50).map((inc) => (
                <tr key={inc.id}>
                  <td className="border px-4 py-2">{inc.id}</td>
                  <td className="border px-4 py-2">{inc.emp_id}</td>
                  <td className="border px-4 py-2">{inc.fecha}</td>
                  <td className="border px-4 py-2">{inc.tipo}</td>
                  <td className="border px-4 py-2">{inc.descripcion || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {incidencias.length > 50 && (
            <p className="text-sm text-gray-500 mt-2">
              Mostrando los primeros 50 de {incidencias.length} registros
            </p>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Resumen de Datos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">PLANTILLA</h3>
            <p>Total empleados: {plantilla.length}</p>
            <p>Activos: {plantilla.filter(emp => emp.activo).length}</p>
            <p>Inactivos: {plantilla.filter(emp => !emp.activo).length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">ACT</h3>
            <p>Total registros: {act.length}</p>
            <p>Fechas únicas: {new Set(act.map(r => r.fecha)).size}</p>
            <p>Empleados únicos: {new Set(act.map(r => r.emp_id)).size}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">INCIDENCIAS</h3>
            <p>Total incidencias: {incidencias.length}</p>
            <p>Empleados con incidencias: {new Set(incidencias.map(i => i.emp_id)).size}</p>
            <p>Tipos únicos: {new Set(incidencias.map(i => i.tipo)).size}</p>
          </div>
        </div>
      </div>
    </div>
  )
}