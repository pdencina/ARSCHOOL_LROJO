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

const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const TIPO_PAGO: Record<string, string> = {
  VD: 'Tarjeta de débito',
  VN: 'Tarjeta de crédito',
  VC: 'Crédito en cuotas',
  SI: 'Crédito sin interés',
  S2: 'Crédito en 2 cuotas sin interés',
  NC: 'Crédito con cuotas normales',
  VP: 'Prepago',
}

/**
 * Envía el comprobante de pago al apoderado.
 * Nunca lanza: si falla el email, el pago ya quedó registrado igual.
 */
async function enviarComprobante(admin: any, pago: any, result: any, meta: any) {
  try {
    // Datos del cobro + alumno + familia para armar el comprobante
    const { data: cobro } = await admin
      .from('cobros')
      .select('mes, anio, tipo_concepto, alumno_id, familia_id, alumno:alumnos(nombre, apellido)')
      .eq('id', pago.cobro_id)
      .single()
    if (!cobro) return

    const c = cobro as any
    const alumnoNombre = `${c.alumno?.nombre ?? ''} ${c.alumno?.apellido ?? ''}`.trim() || 'Alumno'

    // Email destino: el que dejó el pagador en la landing, o el de la familia
    let email: string | null = meta?.pagador_email ?? null
    let pagador: string | null = meta?.pagador_nombre ?? null
    if (!email) {
      let familia: any = null
      if (c.familia_id) {
        const { data: f } = await admin.from('familias').select('email, nombre_apoderado, apellido_apoderado').eq('id', c.familia_id).single()
        familia = f
      }
      if (!familia && c.alumno_id) {
        const { data: f } = await admin.from('familias').select('email, nombre_apoderado, apellido_apoderado').eq('alumno_id', c.alumno_id).limit(1).single()
        familia = f
      }
      email = familia?.email ?? null
      pagador = pagador || `${familia?.nombre_apoderado ?? ''} ${familia?.apellido_apoderado ?? ''}`.trim() || null
    }
    if (!email) return // sin destinatario, no hay nada que enviar

    const concepto = c.tipo_concepto === 'aporte_inicial'
      ? 'Aporte inicial'
      : c.tipo_concepto === 'aporte_mensual'
        ? `Aporte mensual ${MESES[c.mes] ?? c.mes} ${c.anio}`
        : `Aporte ${c.mes}/${c.anio}`

    const { enviarEmail, templateComprobantePago } = await import('@/lib/email')
    await enviarEmail({
      to: email,
      subject: `AR School — Comprobante de pago ${`$${pago.monto.toLocaleString('es-CL')}`}`,
      html: templateComprobantePago({
        pagador: pagador || 'Apoderado',
        alumno: alumnoNombre,
        concepto,
        monto: pago.monto,
        ordenCompra: result.buy_order,
        codigoAutorizacion: result.authorization_code ?? null,
        ultimosDigitos: result.card_detail?.card_number ?? null,
        fecha: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }),
        tipoPago: TIPO_PAGO[result.payment_type_code] ?? null,
        cuotas: result.installments_number ?? null,
      }),
    })
  } catch (e) {
    console.error('Error enviando comprobante de pago:', e)
  }
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

  // Los pagos hechos desde la landing pública "Pago fácil" (buy_order PF-...)
  // vuelven a /pago; el resto al portal del apoderado.
  const destino = (orden?: string | null) =>
    orden && orden.startsWith('PF-') ? '/pago' : '/portal/pagos'

  // Si viene TBK_TOKEN en vez de token_ws, el usuario canceló o hubo timeout
  if (!tokenWs && tbkToken) {
    // Pago anulado por el usuario
    await admin.from('pagos')
      .update({ estado: 'rechazado', metadata: { motivo: 'Anulado por usuario', tbk_token: tbkToken } })
      .eq('referencia', tbkOrdenCompra ?? '')

    return NextResponse.redirect(`${baseUrl}${destino(tbkOrdenCompra)}?resultado=cancelado`)
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
      .select('id, cobro_id, monto, metadata')
      .eq('referencia', result.buy_order)
      .single()

    if (result.response_code === 0) {
      // PAGO EXITOSO
      if (pago) {
        const metaPrevia = (pago as any).metadata ?? {}
        // Actualizar pago
        await admin.from('pagos').update({
          estado: 'confirmado',
          metadata: {
            ...metaPrevia,
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

        // Enviar comprobante por email
        await enviarComprobante(admin, pago, result, metaPrevia)
      }

      return NextResponse.redirect(`${baseUrl}${destino(result.buy_order)}?resultado=exito&orden=${result.buy_order}`)
    } else {
      // PAGO RECHAZADO
      if (pago) {
        await admin.from('pagos').update({
          estado: 'rechazado',
          metadata: { response_code: result.response_code, motivo: 'Rechazado por emisor' },
        }).eq('id', pago.id)
      }

      return NextResponse.redirect(`${baseUrl}${destino(result.buy_order)}?resultado=rechazado`)
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
      .select('id, cobro_id, monto, metadata')
      .eq('referencia', result.buy_order)
      .single()

    if (result.response_code === 0 && pago) {
      const metaPrevia = (pago as any).metadata ?? {}
      await admin.from('pagos').update({
        estado: 'confirmado',
        metadata: {
          ...metaPrevia,
          authorization_code: result.authorization_code,
          transaction_date: result.transaction_date,
          payment_type_code: result.payment_type_code,
          installments_number: result.installments_number,
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

      // Enviar comprobante por email
      await enviarComprobante(admin, pago, result, metaPrevia)

      const dest = result.buy_order?.startsWith('PF-') ? '/pago' : '/portal/pagos'
      return NextResponse.redirect(`${baseUrl}${dest}?resultado=exito&orden=${result.buy_order}`)
    }

    const destRech = result.buy_order?.startsWith('PF-') ? '/pago' : '/portal/pagos'
    return NextResponse.redirect(`${baseUrl}${destRech}?resultado=rechazado`)
  } catch (error: any) {
    console.error('Error confirmar GET:', error)
    return NextResponse.redirect(`${baseUrl}/portal/pagos?resultado=error`)
  }
}
