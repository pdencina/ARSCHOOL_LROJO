import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getWebpayTransaction } from '@/lib/transbank'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/pagos/webpay/crear
// Crea una transacción en Webpay Plus y retorna la URL + token para redirigir
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { cobro_id } = body

  if (!cobro_id) {
    return NextResponse.json({ error: 'cobro_id es requerido' }, { status: 400 })
  }

  const admin = getAdmin()

  // Obtener datos del cobro
  const { data: cobro } = await admin
    .from('cobros')
    .select('*, alumno:alumnos(nombre, apellido), familia:familias(nombre_apoderado, email)')
    .eq('id', cobro_id)
    .single()

  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  const c = cobro as any

  if (c.estado === 'pagado') {
    return NextResponse.json({ error: 'Este cobro ya está pagado' }, { status: 400 })
  }

  const montoPendiente = c.monto - (c.monto_pagado ?? 0)
  if (montoPendiente <= 0) {
    return NextResponse.json({ error: 'No hay monto pendiente' }, { status: 400 })
  }

  // Generar orden única
  const buyOrder = `AR-${cobro_id.substring(0, 8)}-${Date.now()}`
  const sessionId = `S-${user.id.substring(0, 8)}-${Date.now()}`
  const amount = montoPendiente

  // URL de retorno después del pago
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/api/pagos/webpay/confirmar`

  try {
    const tx = getWebpayTransaction()
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl)

    // Guardar referencia de la transacción
    await admin.from('pagos').insert({
      cobro_id,
      monto: amount,
      medio_pago: 'webpay',
      referencia: buyOrder,
      estado: 'pendiente',
      metadata: {
        token: response.token,
        session_id: sessionId,
        buy_order: buyOrder,
      },
      registrado_por: user.id,
    })

    return NextResponse.json({
      url: response.url,
      token: response.token,
    })
  } catch (error: any) {
    console.error('Error Transbank:', error)
    return NextResponse.json({ error: `Error al crear transacción: ${error.message}` }, { status: 500 })
  }
}
