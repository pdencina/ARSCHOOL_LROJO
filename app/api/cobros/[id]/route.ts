import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH /api/cobros/[id] — Editar un cobro puntual (monto, vencimiento, anular)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params
  const body = await request.json()

  const { data: cobro } = await admin.from('cobros').select('*').eq('id', id).single()
  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  const c = cobro as any

  const accion = body.accion // 'editar' | 'anular' | 'reactivar'
  const updates: any = { updated_at: new Date().toISOString() }

  if (accion === 'anular') {
    if (c.estado === 'pagado' || (c.monto_pagado ?? 0) > 0) {
      return NextResponse.json({ error: 'No se puede anular un cobro con pagos registrados' }, { status: 400 })
    }
    updates.estado = 'anulado'
    if (body.motivo) updates.observaciones = `[Anulado] ${body.motivo}`
  } else if (accion === 'reactivar') {
    updates.estado = 'pendiente'
  } else {
    // Editar campos puntuales
    if (body.monto !== undefined) {
      const nuevoMonto = Number(body.monto)
      if (nuevoMonto < 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
      updates.monto = nuevoMonto
      // Recalcular estado según lo ya pagado
      const pagado = c.monto_pagado ?? 0
      if (pagado >= nuevoMonto && nuevoMonto > 0) updates.estado = 'pagado'
      else if (pagado > 0) updates.estado = 'parcial'
      else if (c.estado !== 'anulado') updates.estado = 'pendiente'
    }
    if (body.fecha_vencimiento) updates.fecha_vencimiento = body.fecha_vencimiento
    if (body.observaciones !== undefined) updates.observaciones = body.observaciones
  }

  const { error } = await admin.from('cobros').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, estado: updates.estado ?? c.estado })
}
