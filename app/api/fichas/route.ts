import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase.from('fichas').select('*').order('descargas', { ascending: false })

  const materia = searchParams.get('materia')
  const grado   = searchParams.get('grado')
  const tipo    = searchParams.get('tipo')
  const q       = searchParams.get('q')
  const limit   = parseInt(searchParams.get('limit') ?? '50')

  if (materia) query = query.eq('materia', materia)
  if (grado)   query = query.eq('grado', grado)
  if (tipo)    query = query.eq('tipo', tipo)
  if (q)       query = query.ilike('titulo', `%${q}%`)

  query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { data: usuario } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()

  const { data, error } = await supabase.from('fichas').insert({
    ...body,
    colegio_id: usuario?.colegio_id,
    creado_por: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
