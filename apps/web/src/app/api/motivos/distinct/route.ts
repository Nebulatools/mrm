import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { prettyMotivo, normalizeMotivo } from '@/lib/normalizers';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('motivos_baja')
      .select('motivo, descripcion, fecha_baja')
      .order('fecha_baja', { ascending: false });

    if (error) throw error;

    const seen = new Map<string, { raw: string; pretty: string; canonical: string; count: number }>();

    (data || []).forEach((row: any) => {
      const raw = (row.descripcion || row.motivo || 'No especificado') as string;
      const pretty = prettyMotivo(raw);
      const canonical = normalizeMotivo(raw);
      const key = pretty.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { raw, pretty, canonical, count: 0 });
      }
      seen.get(key)!.count++;
    });

    const list = Array.from(seen.values()).sort((a, b) => b.count - a.count);
    return NextResponse.json({ success: true, total: list.length, motivos: list });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
