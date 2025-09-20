import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { labelForIncidencia, normalizeDepartamento, normalizeIncidenciaCode } from '@/lib/normalizers'

export async function GET() {
  try {
    // Obtener listas distintas desde Supabase
    const [departamentosRaw, areasRaw, inciCodesRaw] = await Promise.all([
      db.getDepartamentos(),
      db.getAreas(),
      db.getIncidenciaCodes().catch(() => [] as string[]), // si no existe la tabla, continuamos
    ]);

    // Normalizar departamentos y códigos
    const departamentos = Array.from(new Set(
      (departamentosRaw || []).map(v => normalizeDepartamento(v))
    )).sort();

    const areas = Array.from(new Set((areasRaw || []).filter(Boolean))).sort();

    const incidencia_codes = Array.from(new Set(
      (inciCodesRaw || []).map(c => normalizeIncidenciaCode(c)).filter(Boolean)
    )).sort();

    const incidencia_labels = incidencia_codes.map(c => ({ code: c, label: labelForIncidencia(c) }));

    return NextResponse.json({
      ok: true,
      departamentos,
      areas,
      incidencia_codes,
      incidencia_labels,
    });
  } catch (err: any) {
    console.error('❌ MCP scan failed:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

