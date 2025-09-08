#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vnyzjdtqruvofefexaue.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZueXpqZHRxcnV2b2ZlZmV4YXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIyODIyOSwiZXhwIjoyMDcyODA0MjI5fQ.JDedpFBfL5oDITavffmdYxbEaVk6dL-LPvH_9EidhF8';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function setupDatabase() {
  console.log('🗄️ Configurando base de datos de RRHH...');
  
  try {
    // For now, let's just check if we can connect and prepare for manual table creation
    const { data, error } = await supabaseAdmin.from('plantilla').select('id').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️ Las tablas no existen aún. Necesitas crearlas manualmente en Supabase SQL Editor:');
      console.log('\n📝 Ejecuta este SQL en https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue/sql/new:\n');
      
      console.log(`-- Tabla PLANTILLA (Empleados)
CREATE TABLE IF NOT EXISTS plantilla (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  departamento VARCHAR(50) NOT NULL DEFAULT 'RH',
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_ingreso DATE NOT NULL,
  fecha_baja DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantilla_activo ON plantilla(activo);
CREATE INDEX IF NOT EXISTS idx_plantilla_departamento ON plantilla(departamento);

-- Tabla INCIDENCIAS
CREATE TABLE IF NOT EXISTS incidencias (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON incidencias(fecha);
CREATE INDEX IF NOT EXISTS idx_incidencias_emp_id ON incidencias(emp_id);

-- Tabla ACTIVIDAD_DIARIA
CREATE TABLE IF NOT EXISTS actividad_diaria (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(emp_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_actividad_fecha ON actividad_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_actividad_emp_id ON actividad_diaria(emp_id);`);

      console.log('\n🔗 Después de crear las tablas, vuelve a ejecutar este script.\n');
      return false;
    }
    
    if (error) {
      console.error('Error conectando con Supabase:', error);
      return false;
    }

    console.log('✅ Tablas detectadas o conexión exitosa');
    return true;

  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
    return false;
  }
}

async function populateDatabase() {
  console.log('📊 Poblando base de datos con datos mock...');

  try {
    // Check if data already exists
    const { data: existingData } = await supabaseAdmin
      .from('plantilla')
      .select('id')
      .limit(1);

    if (existingData && existingData.length > 0) {
      console.log('⚠️ Base de datos ya tiene datos. Saltando población.');
      return true;
    }

    // Generate employees (PLANTILLA)
    const employees = [];
    const nombres = [
      'Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Luis Rodríguez',
      'Carmen Silva', 'José García', 'Laura Hernández', 'Pedro Torres', 'Isabel Ramírez',
      'Miguel Flores', 'Elena Castro', 'Roberto Morales', 'Patricia Vega', 'Fernando Ruiz',
      'Claudia Jiménez', 'Diego Mendoza', 'Gabriela Vargas', 'Andrés Ortiz', 'Mónica Reyes',
      'Ricardo Aguilar', 'Adriana Guerrero', 'Javier Medina', 'Valeria Romero', 'Sebastián Cruz',
      'Natalia Herrera', 'Alejandro Delgado', 'Paola Soto', 'Mateo Rivera', 'Camila Peña',
      'Santiago Moreno', 'Lucía Contreras', 'Nicolás Guzmán', 'Andrea Navarro', 'Tomás Valdez'
    ];

    for (let i = 0; i < 35; i++) {
      const fechaIngreso = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const isActive = i < 32; // 3 employees are inactive (bajas)
      
      employees.push({
        emp_id: `EMP${(i + 1).toString().padStart(3, '0')}`,
        nombre: nombres[i % nombres.length],
        departamento: 'RH',
        activo: isActive,
        fecha_ingreso: fechaIngreso.toISOString().split('T')[0],
        fecha_baja: !isActive ? new Date(2024, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0] : null
      });
    }

    // Insert employees
    const { error: employeesError } = await supabaseAdmin
      .from('plantilla')
      .insert(employees);

    if (employeesError) {
      console.error('Error insertando empleados:', employeesError);
      throw employeesError;
    }

    // Generate incidents for current month
    const incidents = [];
    const tiposIncidencias = ['Tardanza', 'Falta', 'Capacitación', 'Reunión', 'Permiso'];
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    for (let i = 0; i < 15; i++) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      const randomDate = new Date(
        startOfMonth.getTime() + Math.random() * (endOfMonth.getTime() - startOfMonth.getTime())
      );
      
      incidents.push({
        emp_id: randomEmployee.emp_id,
        fecha: randomDate.toISOString().split('T')[0],
        tipo: tiposIncidencias[Math.floor(Math.random() * tiposIncidencias.length)],
        descripcion: `Incidencia de tipo ${tiposIncidencias[Math.floor(Math.random() * tiposIncidencias.length)]}`
      });
    }

    // Insert incidents
    const { error: incidentsError } = await supabaseAdmin
      .from('incidencias')
      .insert(incidents);

    if (incidentsError) {
      console.error('Error insertando incidencias:', incidentsError);
      throw incidentsError;
    }

    // Generate activity for current month
    const activities = [];
    const currentDateIter = new Date(startOfMonth);
    
    while (currentDateIter <= endOfMonth) {
      employees.forEach(employee => {
        if (employee.activo && new Date(employee.fecha_ingreso) <= currentDateIter) {
          activities.push({
            emp_id: employee.emp_id,
            fecha: currentDateIter.toISOString().split('T')[0],
            presente: Math.random() > 0.05 // 95% attendance rate
          });
        }
      });
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }

    // Insert activities
    const { error: activitiesError } = await supabaseAdmin
      .from('actividad_diaria')
      .insert(activities);

    if (activitiesError) {
      console.error('Error insertando actividades:', activitiesError);
      throw activitiesError;
    }

    console.log('✅ Base de datos poblada exitosamente');
    console.log(`📊 Insertados: ${employees.length} empleados, ${incidents.length} incidencias, ${activities.length} registros de actividad`);
    
    return true;

  } catch (error) {
    console.error('❌ Error poblando base de datos:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Inicializando base de datos de RRHH...\n');
  
  try {
    // Setup database tables
    const setupResult = await setupDatabase();
    
    if (!setupResult) {
      console.error('❌ Falló la configuración de la base de datos');
      process.exit(1);
    }
    
    // Populate with mock data
    const populateResult = await populateDatabase();
    
    if (!populateResult) {
      console.error('❌ Falló la población de la base de datos');
      process.exit(1);
    }
    
    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
    console.log('📊 Ahora puedes ver las tablas en tu dashboard de Supabase');
    console.log('🔗 https://supabase.com/dashboard/project/vnyzjdtqruvofefexaue');
    
  } catch (error) {
    console.error('💥 Error durante la configuración:', error);
    process.exit(1);
  }
}

main();