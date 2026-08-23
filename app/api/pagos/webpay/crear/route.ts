import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getWebpayTransaction } from '@/lib/transbank'
import { webpayCreateLimiter, webpayGlobalLimiter, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'

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
  // --- Rate limiting ---
  // Global limiter: protect Transbank API quota
  const globalCheck = webpayGlobalLimiter.check('global')
  if (!globalCheck.success) {
    return rateLimitResponse(globalCheck)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Per-user limiter: prevent rapid-fire payment attempts
  const userIdentifier = getClientIdentifier(request, user.id)
  const userCheck = webpayCreateLimiter.check(userIdentifier)
  if (!userCheck.success) {
    return rateLimitResponse(userCheck)
  }

  const body = await request.json()
  const { cobro_id, matricula_id, tipo } = body

  let cobroId = cobro_id

  // Si viene matricula_id, buscar el cobro de aporte_inicial o el primer cobro pendiente
  if (!cobroId && matricula_id) {
    const { data: mat } = await admin.from('matriculas').select('alumno_id').eq('id', matricula_id).single()
    if (!mat) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })

    const tipoConcepto = tipo === 'aporte_inicial' ? 'aporte_inicial' : 'aporte_mensual'
    const { data: cobroBuscado } = await admin
      .from('cobros')
      .select('id')
      .eq('alumno_id', (mat as any).alumno_id)
      .eq('tipo_concepto', tipoConcepto)
      .eq('estado', 'pendiente')
      .order('anio').order('mes')
      .limit(1)
      .single()

    if (!cobroBuscado) return NextResponse.json({ error: 'No hay cobro pendiente para pagar' }, { status: 404 })
    cobroId = (cobroBuscado as any).id
  }

  if (!cobroId) {
    return NextResponse.json({ error: 'cobro_id o matricula_id es requerido' }, { status: 400 })
  }

  const admin = getAdmin()

  // Obtener datos del cobro
  const { data: cobro } = await admin
    .from('cobros')
    .select('*, alumno:alumnos(nombre, apellido), familia:familias(nombre_apoderado, email)')
    .eq('id', cobroId)
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
  const buyOrder = `AR-${cobroId.substring(0, 8)}-${Date.now()}`
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
      cobro_id: cobroId,
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
