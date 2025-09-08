import { db } from '../lib/supabase'

export async function addSampleData() {
  console.log('📊 Adding sample data to Supabase...')

  try {
    // Add sample employees
    const employees = [
      { emp_id: 'EMP001', nombre: 'Juan Pérez', departamento: 'RH', activo: true, fecha_ingreso: '2023-01-15', fecha_baja: null },
      { emp_id: 'EMP002', nombre: 'María González', departamento: 'RH', activo: true, fecha_ingreso: '2023-02-20', fecha_baja: null },
      { emp_id: 'EMP003', nombre: 'Carlos López', departamento: 'RH', activo: true, fecha_ingreso: '2023-03-10', fecha_baja: null },
      { emp_id: 'EMP004', nombre: 'Ana Martínez', departamento: 'RH', activo: true, fecha_ingreso: '2023-04-05', fecha_baja: null },
      { emp_id: 'EMP005', nombre: 'Luis Rodríguez', departamento: 'RH', activo: true, fecha_ingreso: '2023-05-12', fecha_baja: null },
      { emp_id: 'EMP006', nombre: 'Carmen Silva', departamento: 'RH', activo: true, fecha_ingreso: '2023-06-08', fecha_baja: null },
      { emp_id: 'EMP007', nombre: 'José García', departamento: 'RH', activo: true, fecha_ingreso: '2023-07-22', fecha_baja: null },
      { emp_id: 'EMP008', nombre: 'Laura Hernández', departamento: 'RH', activo: true, fecha_ingreso: '2023-08-14', fecha_baja: null },
      { emp_id: 'EMP009', nombre: 'Pedro Torres', departamento: 'RH', activo: true, fecha_ingreso: '2023-09-03', fecha_baja: null },
      { emp_id: 'EMP010', nombre: 'Isabel Ramírez', departamento: 'RH', activo: true, fecha_ingreso: '2023-10-25', fecha_baja: null },
      { emp_id: 'EMP011', nombre: 'Miguel Flores', departamento: 'RH', activo: false, fecha_ingreso: '2023-02-10', fecha_baja: '2024-11-15' },
      { emp_id: 'EMP012', nombre: 'Elena Castro', departamento: 'RH', activo: false, fecha_ingreso: '2023-03-18', fecha_baja: '2024-12-01' }
    ]

    console.log('Adding employees...')
    await db.addMultipleEmployees(employees)

    // Add sample incidents for December 2024
    const incidencias = [
      { emp_id: 'EMP001', fecha: '2024-12-02', tipo: 'Tardanza', descripcion: 'Llegó 30 minutos tarde' },
      { emp_id: 'EMP003', fecha: '2024-12-03', tipo: 'Falta', descripcion: 'Falta justificada por enfermedad' },
      { emp_id: 'EMP005', fecha: '2024-12-05', tipo: 'Tardanza', descripcion: 'Llegó 15 minutos tarde' },
      { emp_id: 'EMP002', fecha: '2024-12-07', tipo: 'Capacitación', descripcion: 'Asistió a curso de RH' },
      { emp_id: 'EMP008', fecha: '2024-12-10', tipo: 'Permiso', descripcion: 'Permiso médico' },
      { emp_id: 'EMP004', fecha: '2024-12-12', tipo: 'Tardanza', descripcion: 'Llegó 45 minutos tarde' },
      { emp_id: 'EMP007', fecha: '2024-12-15', tipo: 'Falta', descripcion: 'Falta injustificada' },
      { emp_id: 'EMP006', fecha: '2024-12-18', tipo: 'Reunión', descripcion: 'Reunión con dirección' },
      { emp_id: 'EMP009', fecha: '2024-12-20', tipo: 'Tardanza', descripcion: 'Llegó 20 minutos tarde' },
      { emp_id: 'EMP010', fecha: '2024-12-22', tipo: 'Capacitación', descripcion: 'Curso de seguridad laboral' }
    ]

    console.log('Adding incidents...')
    await db.addMultipleIncidencias(incidencias)

    // Add daily activity for December 2024 (sample days)
    const actividades = [
      // December 1, 2024
      { emp_id: 'EMP001', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP002', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP003', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP004', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP005', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP006', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP007', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP008', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP009', fecha: '2024-12-01', presente: true },
      { emp_id: 'EMP010', fecha: '2024-12-01', presente: true },
      // December 2, 2024
      { emp_id: 'EMP001', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP002', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP003', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP004', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP005', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP006', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP007', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP008', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP009', fecha: '2024-12-02', presente: true },
      { emp_id: 'EMP010', fecha: '2024-12-02', presente: false },
      // December 3, 2024
      { emp_id: 'EMP001', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP002', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP003', fecha: '2024-12-03', presente: false },
      { emp_id: 'EMP004', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP005', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP006', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP007', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP008', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP009', fecha: '2024-12-03', presente: true },
      { emp_id: 'EMP010', fecha: '2024-12-03', presente: true }
    ]

    console.log('Adding activities...')
    await db.addMultipleActividad(actividades)

    console.log('✅ Sample data added successfully!')
    return true

  } catch (error) {
    console.error('❌ Error adding sample data:', error)
    return false
  }
}