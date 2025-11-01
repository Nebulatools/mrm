import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';
import {
  computeNextRun,
  normalizeDayOfWeek,
  normalizeFrequency,
  normalizeRunTime,
  type SyncFrequency,
} from '@/lib/utils/sync-schedule';

interface SyncSettingsRow {
  singleton: boolean;
  frequency: SyncFrequency;
  day_of_week: string | null;
  run_time: string | null;
  last_run: string | null;
  next_run: string | null;
}

function mapRow(row: SyncSettingsRow | null) {
  const frequency = normalizeFrequency(row?.frequency);
  const day = normalizeDayOfWeek(row?.day_of_week);
  const time = normalizeRunTime(row?.run_time);

  return {
    frequency,
    day_of_week: day,
    run_time: time,
    last_run: row?.last_run ?? null,
    next_run: row?.next_run ?? null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const { data, error } = await supabaseAdmin
    .from('sync_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle<SyncSettingsRow>();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, settings: mapRow(data) });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const frequency = normalizeFrequency(payload?.frequency);
  const dayOfWeek = frequency === 'weekly'
    ? normalizeDayOfWeek(payload?.day_of_week)
    : normalizeDayOfWeek(payload?.day_of_week ?? 'monday');
  const runTime = normalizeRunTime(payload?.run_time);

  const nextRun = computeNextRun(frequency, dayOfWeek, runTime);

  const { data, error } = await supabaseAdmin
    .from('sync_settings')
    .upsert(
      {
        singleton: true,
        frequency,
        day_of_week: dayOfWeek,
        run_time: runTime,
        next_run: nextRun ? nextRun.toISOString() : null,
      },
      { onConflict: 'singleton' }
    )
    .select('*')
    .single<SyncSettingsRow>();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, settings: mapRow(data) });
}
