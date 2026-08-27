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

// POST /api/pagos/confirmar — Admin confirma un pago con comprobante
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { pago_id, cobro_id, accion } = await request.json()
  // accion: 'aprobar' (default) | 'rechazar'
  const esRechazo = accion === 'rechazar'

  // ── Rechazar el comprobante ──────────────────────────────────────
  if (esRechazo) {
    if (!pago_id) return NextResponse.json({ error: 'pago_id requerido para rechazar' }, { status: 400 })
    await admin.from('pagos').update({ estado: 'rechazado' }).eq('id', pago_id)
    return NextResponse.json({ ok: true, accion: 'rechazado' })
  }

  // ── Aprobar el comprobante ───────────────────────────────────────
  if (!cobro_id) return NextResponse.json({ error: 'cobro_id requerido' }, { status: 400 })

  // Obtener cobro
  const { data: cobro } = await admin.from('cobros').select('monto, monto_pagado').eq('id', cobro_id).single()
  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  const c = cobro as any

  // Obtener monto del pago
  let montoPago = c.monto
  if (pago_id) {
    const { data: pago } = await admin.from('pagos').select('monto').eq('id', pago_id).single()
    if (pago) montoPago = (pago as any).monto
  }

  // Marcar el pago como confirmado
  if (pago_id) {
    await admin.from('pagos').update({ estado: 'confirmado' }).eq('id', pago_id)
  }

  // Marcar cobro como pagado
  const nuevoMontoPagado = Math.max(montoPago, c.monto_pagado ?? 0)
  await admin.from('cobros').update({
    monto_pagado: nuevoMontoPagado >= c.monto ? c.monto : nuevoMontoPagado,
    estado: nuevoMontoPagado >= c.monto ? 'pagado' : 'parcial',
    fecha_pago: new Date().toISOString().split('T')[0],
  }).eq('id', cobro_id)

  return NextResponse.json({ ok: true, accion: 'aprobado' })
}
