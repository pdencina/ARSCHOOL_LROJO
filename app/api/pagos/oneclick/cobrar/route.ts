import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Oneclick, Options, Environment } from 'transbank-sdk'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function getOneclickOptions() {
  const isProduction = process.env.TRANSBANK_ENVIRONMENT === 'production'
  const commerceCode = isProduction
    ? process.env.TRANSBANK_ONECLICK_COMMERCE_CODE!
    : '597055555542'
  const childCommerceCode = isProduction
    ? process.env.TRANSBANK_ONECLICK_CHILD_CODE!
    : '597055555543' // Child commerce code de pruebas
  const apiKey = isProduction
    ? process.env.TRANSBANK_ONECLICK_API_KEY!
    : '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C'
  return { options: new Options(commerceCode, apiKey, isProduction ? Environment.Production : Environment.Integration), childCommerceCode }
}

// POST /api/pagos/oneclick/cobrar
// Cobra automáticamente a una tarjeta inscrita (usado por el cron mensual)
export async function POST(request: NextRequest) {
  // Verificar autorización (cron o admin)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'arschool-cron-2027'
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = getAdmin()
  const { cobro_id } = await request.json()

  if (!cobro_id) {
    return NextResponse.json({ error: 'cobro_id requerido' }, { status: 400 })
  }

  // Obtener cobro
  const { data: cobro } = await admin
    .from('cobros')
    .select('id, familia_id, monto, monto_pagado, estado')
    .eq('id', cobro_id)
    .single()

  if (!cobro || (cobro as any).estado === 'pagado') {
    return NextResponse.json({ error: 'Cobro no encontrado o ya pagado' }, { status: 400 })
  }

  const c = cobro as any
  const montoPendiente = c.monto - (c.monto_pagado ?? 0)

  // Buscar tarjeta activa de la familia
  const { data: tarjeta } = await admin
    .from('tarjetas_recurrentes')
    .select('*')
    .eq('familia_id', c.familia_id)
    .eq('activa', true)
    .limit(1)
    .single()

  if (!tarjeta || !(tarjeta as any).tbk_token) {
    return NextResponse.json({ error: 'No hay tarjeta inscrita activa para esta familia' }, { status: 400 })
  }

  const t = tarjeta as any
  const { options, childCommerceCode } = getOneclickOptions()
  const buyOrder = `AR-OC-${cobro_id.substring(0, 8)}-${Date.now()}`
  const childBuyOrder = `CH-${cobro_id.substring(0, 8)}-${Date.now()}`

  try {
    const transaction = new Oneclick.MallTransaction(options)
    const result = await transaction.authorize(
      t.tbk_user,
      t.tbk_token,
      buyOrder,
      [{
        commerce_code: childCommerceCode,
        buy_order: childBuyOrder,
        amount: montoPendiente,
        installments_number: 0,
      }]
    )

    const detail = result.details?.[0]

    if (detail?.response_code === 0) {
      // Cobro exitoso
      await admin.from('cobros').update({
        monto_pagado: c.monto,
        estado: 'pagado',
        medio_pago: 'oneclick',
        fecha_pago: new Date().toISOString().split('T')[0],
      }).eq('id', cobro_id)

      await admin.from('pagos').insert({
        cobro_id,
        monto: montoPendiente,
        medio_pago: 'oneclick',
        referencia: buyOrder,
        estado: 'confirmado',
        metadata: {
          authorization_code: detail.authorization_code,
          card_last_four: t.card_last_four,
          installments: detail.installments_number,
        },
      })

      // Actualizar tarjeta
      await admin.from('tarjetas_recurrentes').update({
        ultimo_cobro_at: new Date().toISOString(),
        cobros_exitosos: (t.cobros_exitosos ?? 0) + 1,
      }).eq('id', t.id)

      // Log
      await admin.from('log_cobranza').insert({
        colegio_id: (await admin.from('cobros').select('colegio_id').eq('id', cobro_id).single()).data?.colegio_id,
        cobro_id,
        familia_id: c.familia_id,
        tipo: 'pago_confirmado',
        detalle: `Cobro automático Oneclick exitoso — $${montoPendiente.toLocaleString('es-CL')} (****${t.card_last_four})`,
        metadata: { buy_order: buyOrder, authorization_code: detail.authorization_code },
      })

      return NextResponse.json({ ok: true, monto: montoPendiente, authorization_code: detail.authorization_code })
    } else {
      // Cobro rechazado
      await admin.from('tarjetas_recurrentes').update({
        cobros_fallidos: (t.cobros_fallidos ?? 0) + 1,
      }).eq('id', t.id)

      return NextResponse.json({ ok: false, error: 'Cobro rechazado por el banco', response_code: detail?.response_code }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error Oneclick cobrar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
