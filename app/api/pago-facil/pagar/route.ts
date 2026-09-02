import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getWebpayTransaction } from '@/lib/transbank'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/pago-facil/pagar — Público, sin login
// Crea una transacción Webpay para un cobro puntual (o monto parcial).
export async function POST(request: NextRequest) {
  const { cobro_id, monto, nombre, email } = await request.json()

  if (!cobro_id) return NextResponse.json({ error: 'Falta el cobro' }, { status: 400 })

  const admin = getAdmin()
  const { data: cobro } = await admin
    .from('cobros')
    .select('id, monto, monto_pagado, estado')
    .eq('id', cobro_id)
    .single()

  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  const c = cobro as any
  if (c.estado === 'pagado') {
    return NextResponse.json({ error: 'Este cobro ya está pagado' }, { status: 400 })
  }

  const pendiente = c.monto - (c.monto_pagado ?? 0)
  // Monto a pagar: el indicado (parcial) o el pendiente total. Nunca mayor al pendiente.
  const montoPagar = monto && Number(monto) > 0 ? Math.min(Number(monto), pendiente) : pendiente
  if (montoPagar < 100) {
    return NextResponse.json({ error: 'El monto mínimo es $100' }, { status: 400 })
  }

  const buyOrder = `PF-${cobro_id.substring(0, 8)}-${Date.now()}`
  const sessionId = `PAGOFACIL-${Date.now()}`
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/api/pagos/webpay/confirmar`

  try {
    const tx = getWebpayTransaction()
    const response = await tx.create(buyOrder, sessionId, montoPagar, returnUrl)

    await admin.from('pagos').insert({
      cobro_id,
      monto: montoPagar,
      medio_pago: 'webpay',
      referencia: buyOrder,
      estado: 'pendiente',
      metadata: {
        token: response.token,
        session_id: sessionId,
        buy_order: buyOrder,
        via: 'pago_facil',
        pagador_nombre: nombre || null,
        pagador_email: email || null,
      },
    })

    return NextResponse.json({ url: response.url, token: response.token })
  } catch (error: any) {
    return NextResponse.json({ error: `Error al iniciar el pago: ${error.message}` }, { status: 500 })
  }
}
