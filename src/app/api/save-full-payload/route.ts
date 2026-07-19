import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase config missing on server' }, { status: 500 })
    }

    const body = await req.json()
    const { sessionId, payload } = body || {}
    if (!sessionId || !payload) {
      return NextResponse.json({ error: 'Missing sessionId or payload' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Validate token and get user
    const { data: userData, error: userErr } = await svc.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const userId = userData.user.id

    // Ensure session exists and belongs to this user
    const { data: sessionRow, error: fetchErr } = await svc.from('analysis_sessions').select('id, user_id').eq('id', sessionId).single()
    if (fetchErr || !sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (sessionRow.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update data_payload with full payload
    const { error: updateErr } = await svc.from('analysis_sessions').update({ data_payload: payload }).eq('id', sessionId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
