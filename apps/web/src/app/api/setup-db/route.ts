import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Sample employee data for RH department
const generateEmployeeData = () => {
  const positions = ['Gerente RH', 'Analista RH', 'Reclutador', 'Especialista Nómina', 'Coordinador RH', 'Asistente RH'];
  const firstNames = ['Ana', 'Carlos', 'María', 'Luis', 'Carmen', 'José', 'Laura', 'Miguel', 'Sofia', 'David', 'Elena', 'Roberto', 'Patricia', 'Fernando', 'Valeria', 'Javier', 'Mónica', 'Diego', 'Isabel', 'Alejandro'];
  const lastNames = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez'];
  
  const employees = [];
  
  // Generate 35 employees (30 active, 5 inactive)
  for (let i = 1; i <= 35; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
    const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const isActive = i <= 30; // First 30 are active
    const hireDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const baseSalary = position.includes('Gerente') ? 35000 : position.includes('Especialista') ? 25000 : 18000;
    const salary = baseSalary + Math.floor(Math.random() * 10000);
    
    employees.push({
      empleado_id: `EMP${i.toString().padStart(3, '0')}`,
      first_name: firstName,
      last_name: `${lastName1} ${lastName2}`,
      active_status: isActive ? 'Activo' : 'Baja',
      department: 'RH',
      position,
      hire_date: hireDate.toISOString().split('T')[0],
      salary
    });
  }
  
  return employees;
};

// Generate incidents data
const generateIncidentsData = (employees: any[]) => {
  const incidentTypes = ['Ausencia', 'Retraso', 'Falta', 'Permiso Personal', 'Incapacidad', 'Vacaciones no autorizadas'];
  const incidents = [];
  
  // Generate incidents for last 12 months
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  
  // Generate random incidents
  for (let i = 1; i <= 150; i++) {
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
    const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const randomDate = new Date(oneYearAgo.getTime() + Math.random() * (today.getTime() - oneYearAgo.getTime()));
    
    incidents.push({
      incident_id: `INC${i.toString().padStart(3, '0')}`,
      employee_id: randomEmployee.empleado_id,
      incident_type: incidentType,
      incident_date: randomDate.toISOString().split('T')[0],
      description: `${incidentType} reportada para ${randomEmployee.first_name} ${randomEmployee.last_name}`,
      status: 'Active'
    });
  }
  
  return incidents;
};

// Generate ACT data (monthly snapshots)
const generateActData = () => {
  const actData = [];
  const today = new Date();
  
  // Generate monthly snapshots for last 18 months
  for (let i = 18; i >= 0; i--) {
    const snapshotDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const lastDay = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth() + 1, 0);
    
    // Simulate seasonal variations and growth trend
    const baseCount = 25;
    const seasonalVariation = Math.sin((snapshotDate.getMonth() * Math.PI) / 6) * 3;
    const growthTrend = Math.floor(i / 3); // Slight growth over time
    const randomVariation = Math.floor(Math.random() * 5) - 2;
    
    const activeCount = Math.max(20, Math.min(35, baseCount + seasonalVariation + growthTrend + randomVariation));
    
    actData.push({
      snapshot_date: lastDay.toISOString().split('T')[0],
      active_employee_count: Math.floor(activeCount),
      department: 'RH',
      notes: `Snapshot mensual - ${snapshotDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`
    });
  }
  
  return actData;
};

export async function POST() {
  try {
    console.log('Starting database setup...');

    // First, create tables if they don't exist
    const createTablesQuery = `
      -- Create plantilla table
      CREATE TABLE IF NOT EXISTS plantilla (
        id SERIAL PRIMARY KEY,
        empleado_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        active_status VARCHAR(10) NOT NULL,
        department VARCHAR(50) DEFAULT 'RH',
        position VARCHAR(100),
        hire_date DATE,
        salary DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create incidencias table
      CREATE TABLE IF NOT EXISTS incidencias (
        id SERIAL PRIMARY KEY,
        incident_id VARCHAR(20) UNIQUE NOT NULL,
        employee_id VARCHAR(20) NOT NULL,
        incident_type VARCHAR(50) NOT NULL,
        incident_date DATE NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create act table
      CREATE TABLE IF NOT EXISTS act (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE NOT NULL,
        active_employee_count INTEGER NOT NULL,
        department VARCHAR(50) DEFAULT 'RH',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_plantilla_active_status ON plantilla(active_status);
      CREATE INDEX IF NOT EXISTS idx_plantilla_department ON plantilla(department);
      CREATE INDEX IF NOT EXISTS idx_incidencias_employee_id ON incidencias(employee_id);
      CREATE INDEX IF NOT EXISTS idx_incidencias_date ON incidencias(incident_date);
      CREATE INDEX IF NOT EXISTS idx_act_date ON act(snapshot_date);
    `;

    // Execute table creation
    const { error: tablesError } = await supabase.rpc('exec', { sql: createTablesQuery });
    if (tablesError) {
      console.log('Tables might already exist or using alternative approach...');
    }

    // Generate sample data
    const employees = generateEmployeeData();
    const incidents = generateIncidentsData(employees);
    const actData = generateActData();

    console.log(`Generated ${employees.length} employees, ${incidents.length} incidents, ${actData.length} ACT records`);

    // Clear existing data and insert new data
    await supabase.from('plantilla').delete().neq('id', 0);
    await supabase.from('incidencias').delete().neq('id', 0);
    await supabase.from('act').delete().neq('id', 0);

    // Insert employees
    const { error: employeesError } = await supabase
      .from('plantilla')
      .insert(employees);

    if (employeesError) {
      console.error('Error inserting employees:', employeesError);
      return NextResponse.json({ error: 'Error inserting employees', details: employeesError }, { status: 500 });
    }

    // Insert incidents
    const { error: incidentsError } = await supabase
      .from('incidencias')
      .insert(incidents);

    if (incidentsError) {
      console.error('Error inserting incidents:', incidentsError);
      return NextResponse.json({ error: 'Error inserting incidents', details: incidentsError }, { status: 500 });
    }

    // Insert ACT data
    const { error: actError } = await supabase
      .from('act')
      .insert(actData);

    if (actError) {
      console.error('Error inserting ACT data:', actError);
      return NextResponse.json({ error: 'Error inserting ACT data', details: actError }, { status: 500 });
    }

    console.log('Database setup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Database populated successfully',
      data: {
        employees: employees.length,
        incidents: incidents.length,
        actRecords: actData.length
      }
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { error: 'Database setup failed', details: error },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database setup endpoint',
    instruction: 'Send a POST request to populate the database with sample HR data'
  });
}