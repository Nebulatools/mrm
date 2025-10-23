import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Consultar incidencias por mes en 2025
    const { data: incidencias, error: incError } = await supabase
      .from('incidencias')
      .select('id, emp, fecha, inci')
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31')
      .order('fecha');

    if (incError) {
      console.error('Error consultando incidencias:', incError);
    }

    // Consultar asistencia_diaria por mes en 2025
    const { data: asistencia, error: asistError } = await supabase
      .from('asistencia_diaria')
      .select('id, numero_empleado, fecha, horas_incidencia')
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31')
      .gt('horas_incidencia', 0)
      .order('fecha');

    if (asistError) {
      console.error('Error consultando asistencia_diaria:', asistError);
    }

    // Agrupar por mes
    const incidenciasPorMes: Record<string, number> = {};
    const asistenciaPorMes: Record<string, number> = {};

    (incidencias || []).forEach((inc: any) => {
      const mes = inc.fecha.substring(0, 7); // YYYY-MM
      incidenciasPorMes[mes] = (incidenciasPorMes[mes] || 0) + 1;
    });

    (asistencia || []).forEach((asist: any) => {
      const mes = asist.fecha.substring(0, 7); // YYYY-MM
      asistenciaPorMes[mes] = (asistenciaPorMes[mes] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        incidencias_tabla: {
          total: incidencias?.length || 0,
          por_mes: incidenciasPorMes,
          primeros_5: incidencias?.slice(0, 5) || []
        },
        asistencia_diaria_tabla: {
          total: asistencia?.length || 0,
          por_mes: asistenciaPorMes,
          primeros_5: asistencia?.slice(0, 5) || []
        }
      }
    });
  } catch (error: any) {
    console.error('Error en debug-data:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
