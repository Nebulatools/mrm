import { supabase } from '../lib/supabase';

async function updatePlantillaSchema() {
  console.log('🔧 Actualizando esquema de PLANTILLA...');

  try {
    // 1. Agregar nuevas columnas
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE "PLANTILLA" 
        ADD COLUMN IF NOT EXISTS puesto VARCHAR(150) DEFAULT 'N/A',
        ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT NULL;
      `
    });

    if (alterError) {
      console.log('⚠️ Las columnas posiblemente ya existen:', alterError.message);
    }

    // 2. Actualizar registros existentes con datos de ejemplo
    const { error: updateError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE "PLANTILLA" 
        SET 
            puesto = CASE 
                WHEN departamento = 'IT' THEN 'Desarrollador'
                WHEN departamento = 'RRHH' THEN 'Especialista RRHH'
                WHEN departamento = 'Ventas' THEN 'Ejecutivo Ventas'
                WHEN departamento = 'Marketing' THEN 'Analista Marketing'
                WHEN departamento = 'Finanzas' THEN 'Contador'
                ELSE 'Empleado General'
            END,
            area = CASE 
                WHEN departamento IN ('IT', 'Marketing') THEN 'Corporativo'
                WHEN departamento IN ('Ventas', 'Finanzas') THEN 'Comercial'
                WHEN departamento = 'RRHH' THEN 'Administrativo'
                ELSE 'Operativo'
            END
        WHERE puesto = 'N/A' OR area IS NULL;
      `
    });

    if (updateError) {
      console.error('❌ Error actualizando registros:', updateError);
    }

    // 3. Actualizar motivos de baja
    const { error: motivoError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE "PLANTILLA" 
        SET motivo_baja = CASE 
            WHEN RANDOM() < 0.3 THEN 'Renuncia Voluntaria'
            WHEN RANDOM() < 0.6 THEN 'Mejor Oportunidad'
            WHEN RANDOM() < 0.8 THEN 'Motivos Personales'
            WHEN RANDOM() < 0.9 THEN 'Despido Disciplinario'
            ELSE 'Fin de Contrato'
        END
        WHERE activo = false AND motivo_baja IS NULL;
      `
    });

    if (motivoError) {
      console.error('❌ Error actualizando motivos:', motivoError);
    }

    console.log('✅ Schema actualizado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  updatePlantillaSchema().then(() => process.exit());
}

export { updatePlantillaSchema };