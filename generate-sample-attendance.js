const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSampleAttendance() {
  console.log('📅 Generando datos de asistencia de muestra...');
  
  try {
    // Obtener primeros 20 empleados
    const { data: empleados } = await supabase
      .from('empleados_sftp')
      .select('numero_empleado')
      .order('numero_empleado')
      .limit(20);

    console.log(`👥 Generando asistencia para ${empleados.length} empleados`);

    const asistencias = [];
    
    // Generar asistencia para septiembre 2025 (30 días)
    for (let dia = 1; dia <= 30; dia++) {
      const fecha = `2025-09-${dia.toString().padStart(2, '0')}`;
      const fechaObj = new Date(fecha);
      const diaSemana = fechaObj.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
      
      let diaNombre;
      let horas;
      
      switch (diaSemana) {
        case 0: diaNombre = 'DOM'; horas = 0; break;
        case 1: diaNombre = 'LUN'; horas = 8; break;
        case 2: diaNombre = 'MAR'; horas = 8; break;
        case 3: diaNombre = 'MIE'; horas = 8; break;
        case 4: diaNombre = 'JUE'; horas = 8; break;
        case 5: diaNombre = 'VIE'; horas = 8; break;
        case 6: diaNombre = 'SAB'; horas = 4; break;
      }

      for (const empleado of empleados) {
        // Añadir algo de variabilidad realista
        let horasTrabajadas = horas;
        let horasIncidencia = 0;
        
        // 5% de probabilidad de tardanza (menos horas)
        if (Math.random() < 0.05 && horas > 0) {
          horasTrabajadas = Math.max(0, horas - 2);
          horasIncidencia = 2;
        }
        
        // 2% de probabilidad de ausencia
        if (Math.random() < 0.02) {
          horasTrabajadas = 0;
          horasIncidencia = horas;
        }

        asistencias.push({
          numero_empleado: empleado.numero_empleado,
          fecha,
          dia_semana: diaNombre,
          horas_trabajadas: horasTrabajadas,
          horas_incidencia: horasIncidencia
        });
      }
    }

    console.log(`📊 Insertando ${asistencias.length} registros de asistencia...`);

    // Insertar en lotes de 500
    const batchSize = 500;
    let insertados = 0;
    
    for (let i = 0; i < asistencias.length; i += batchSize) {
      const batch = asistencias.slice(i, i + batchSize);
      const { error } = await supabase
        .from('asistencia_diaria')
        .insert(batch);

      if (error) {
        console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        insertados += batch.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} registros`);
      }
    }

    console.log(`\n🎉 Asistencia generada exitosamente: ${insertados} registros`);

    // Verificar datos
    const { count } = await supabase
      .from('asistencia_diaria')
      .select('*', { count: 'exact', head: true });

    const { count: actCount } = await supabase
      .from('act')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Estadísticas finales:`);
    console.log(`  asistencia_diaria: ${count} registros`);
    console.log(`  act (vista): ${actCount} registros`);
    
  } catch (error) {
    console.error('❌ Error generando asistencia:', error.message);
  }
}

generateSampleAttendance();