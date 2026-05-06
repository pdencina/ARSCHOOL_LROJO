import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { cobro_id, monto, medio_pago, observaciones } = body

  if (!cobro_id || !monto || !medio_pago) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const { data: usuarioRaw } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (usuarioRaw as { colegio_id: string } | null)?.colegio_id ?? ''

  const { data: cobro } = await supabase.from('cobros').select('*').eq('id', cobro_id).single()
  const cobroTyped = cobro as { colegio_id: string; monto: number; monto_pagado: number } | null

  if (!cobroTyped || cobroTyped.colegio_id !== colegioId) {
    return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  }

  const { data: pago, error } = await supabase.from('pagos').insert({
    cobro_id,
    monto,
    medio_pago,
    referencia: observaciones ?? null,
    registrado_por: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nuevoMonto = cobroTyped.monto_pagado + monto
  const nuevoEstado = nuevoMonto >= cobroTyped.monto ? 'pagado' : 'parcial'

  await supabase.from('cobros').update({
    monto_pagado: nuevoMonto,
    estado: nuevoEstado,
    medio_pago,
    fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', cobro_id)

  return NextResponse.json({ pago, estado: nuevoEstado })
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const cobro_id = searchParams.get('cobro_id')

  let query = supabase.from('pagos').select('*').order('created_at', { ascending: false })
  if (cobro_id) query = query.eq('cobro_id', cobro_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}