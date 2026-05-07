import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const { data } = await supabase.from('notificaciones')
    .select('*').eq('colegio_id', colegioId)
    .or(`usuario_id.eq.${user.id},usuario_id.is.null`)
    .eq('leida', false).order('created_at', { ascending: false }).limit(20)
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { ids } = await request.json()
  await supabase.from('notificaciones').update({ leida: true }).in('id', ids)
  return NextResponse.json({ ok: true })
}