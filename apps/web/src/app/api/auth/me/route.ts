import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const started = Date.now()
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const userInfo = user ? { id: user.id, email: user.email } : null

    let profile: any = null
    let profileError: any = null
    let profileDuration: number | null = null

    if (user?.id) {
      const t0 = Date.now()
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      profile = data || null
      profileError = error ? { message: error.message, details: (error as any).details } : null
      profileDuration = Date.now() - t0
    }

    return NextResponse.json({
      ok: true,
      tookMs: Date.now() - started,
      user: userInfo,
      userError: userError ? { message: userError.message } : null,
      profile,
      profileError,
      profileDurationMs: profileDuration,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}

