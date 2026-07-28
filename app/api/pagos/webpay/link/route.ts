import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { getWebpayTransaction } from '@/lib/transbank'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarToken(cobroId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'arschool-secret'
  return createHash('sha256').update(`${cobroId}-${secret}`).digest('hex').slice(0, 16)
}

// POST /api/pagos/webpay/link — Crear transacción Webpay SIN requerir login (usa token del link)
export async function POST(request: NextRequest) {
  const { cobro_id, token } = await request.json()

  if (!cobro_id || !token) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Verificar token
  const expectedToken = generarToken(cobro_id)
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Link inválido' }, { status: 403 })
  }

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

  const montoPendiente = c.monto - (c.monto_pagado ?? 0)
  const buyOrder = `AR-${cobro_id.substring(0, 8)}-${Date.now()}`
  const sessionId = `LINK-${Date.now()}`

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/api/pagos/webpay/confirmar`

  try {
    const tx = getWebpayTransaction()
    const response = await tx.create(buyOrder, sessionId, montoPendiente, returnUrl)

    // Guardar pago pendiente
    await admin.from('pagos').insert({
      cobro_id,
      monto: montoPendiente,
      medio_pago: 'webpay',
      referencia: buyOrder,
      estado: 'pendiente',
      metadata: {
        token: response.token,
        session_id: sessionId,
        buy_order: buyOrder,
        via: 'link_compartido',
      },
    })

    return NextResponse.json({
      url: response.url,
      token: response.token,
    })
  } catch (error: any) {
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 })
  }
}
