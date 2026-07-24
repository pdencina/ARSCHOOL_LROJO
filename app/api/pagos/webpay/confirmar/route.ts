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

// POST /api/pagos/webpay/confirmar
// Transbank redirige aquí con token_ws después del pago
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const tokenWs = formData.get('token_ws') as string | null
  const tbkToken = formData.get('TBK_TOKEN') as string | null
  const tbkOrdenCompra = formData.get('TBK_ORDEN_COMPRA') as string | null

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const admin = getAdmin()

  // Si viene TBK_TOKEN en vez de token_ws, el usuario canceló o hubo timeout
  if (!tokenWs && tbkToken) {
    // Pago anulado por el usuario
    await admin.from('pagos')
      .update({ estado: 'rechazado', metadata: { motivo: 'Anulado por usuario', tbk_token: tbkToken } })
      .eq('referencia', tbkOrdenCompra ?? '')

    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=cancelado`)
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=error`)
  }

  try {
    const tx = getWebpayTransaction()
    const result = await tx.commit(tokenWs)

    // Buscar el pago por referencia (buy_order)
    const { data: pago } = await admin
      .from('pagos')
      .select('id, cobro_id, monto')
      .eq('referencia', result.buy_order)
      .single()

    if (result.response_code === 0) {
      // PAGO EXITOSO
      if (pago) {
        // Actualizar pago
        await admin.from('pagos').update({
          estado: 'confirmado',
          metadata: {
            authorization_code: result.authorization_code,
            transaction_date: result.transaction_date,
            payment_type_code: result.payment_type_code,
            installments_number: result.installments_number,
            card_number: result.card_detail?.card_number,
            response_code: result.response_code,
            vci: result.vci,
          },
        }).eq('id', pago.id)

        // Actualizar cobro
        const { data: cobro } = await admin.from('cobros').select('monto, monto_pagado').eq('id', pago.cobro_id).single()
        if (cobro) {
          const nuevoMontoPagado = ((cobro as any).monto_pagado ?? 0) + pago.monto
          const nuevoEstado = nuevoMontoPagado >= (cobro as any).monto ? 'pagado' : 'parcial'
          await admin.from('cobros').update({
            monto_pagado: nuevoMontoPagado,
            estado: nuevoEstado,
            medio_pago: 'webpay',
            fecha_pago: new Date().toISOString().split('T')[0],
          }).eq('id', pago.cobro_id)
        }
      }

      return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=exito&orden=${result.buy_order}`)
    } else {
      // PAGO RECHAZADO
      if (pago) {
        await admin.from('pagos').update({
          estado: 'rechazado',
          metadata: { response_code: result.response_code, motivo: 'Rechazado por emisor' },
        }).eq('id', pago.id)
      }

      return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=rechazado`)
    }
  } catch (error: any) {
    console.error('Error al confirmar Transbank:', error)
    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=error`)
  }
}

// GET - Transbank también puede enviar por GET en algunos casos
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenWs = searchParams.get('token_ws')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=error`)
  }

  const admin = getAdmin()
  try {
    const tx = getWebpayTransaction()
    const result = await tx.commit(tokenWs)

    const { data: pago } = await admin
      .from('pagos')
      .select('id, cobro_id, monto')
      .eq('referencia', result.buy_order)
      .single()

    if (result.response_code === 0 && pago) {
      await admin.from('pagos').update({
        estado: 'confirmado',
        metadata: {
          authorization_code: result.authorization_code,
          transaction_date: result.transaction_date,
          payment_type_code: result.payment_type_code,
          card_number: result.card_detail?.card_number,
          response_code: result.response_code,
        },
      }).eq('id', pago.id)

      const { data: cobro } = await admin.from('cobros').select('monto, monto_pagado').eq('id', pago.cobro_id).single()
      if (cobro) {
        const nuevoMontoPagado = ((cobro as any).monto_pagado ?? 0) + pago.monto
        const nuevoEstado = nuevoMontoPagado >= (cobro as any).monto ? 'pagado' : 'parcial'
        await admin.from('cobros').update({
          monto_pagado: nuevoMontoPagado,
          estado: nuevoEstado,
          medio_pago: 'webpay',
          fecha_pago: new Date().toISOString().split('T')[0],
        }).eq('id', pago.cobro_id)
      }

      return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=exito&orden=${result.buy_order}`)
    }

    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=rechazado`)
  } catch (error: any) {
    console.error('Error confirmar GET:', error)
    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=error`)
  }
}
