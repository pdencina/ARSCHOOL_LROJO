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
  const apiKey = isProduction
    ? process.env.TRANSBANK_ONECLICK_API_KEY!
    : '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C'
  return new Options(commerceCode, apiKey, isProduction ? Environment.Production : Environment.Integration)
}

// POST /api/pagos/oneclick/confirmar
// Transbank redirige aquí después de que el apoderado inscribe su tarjeta
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const tbkToken = formData.get('TBK_TOKEN') as string | null

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arschool-lrojo-six.vercel.app'
  const admin = getAdmin()

  if (!tbkToken) {
    return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=error`)
  }

  try {
    const inscription = new Oneclick.MallInscription(getOneclickOptions())
    const result = await inscription.finish(tbkToken)

    if (result.response_code === 0) {
      // Inscripción exitosa — guardar token
      await admin.from('tarjetas_recurrentes')
        .update({
          tbk_token: result.tbk_user, // El token autorizado
          card_type: result.card_type,
          card_last_four: result.card_number?.slice(-4) ?? null,
          activa: true,
          fecha_inscripcion: new Date().toISOString(),
        })
        .eq('tbk_user', result.tbk_user)

      return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=exito`)
    } else {
      return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=rechazado`)
    }
  } catch (error: any) {
    console.error('Error Oneclick confirmar:', error)
    return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=error`)
  }
}

// GET — por si Transbank redirige por GET
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tbkToken = searchParams.get('TBK_TOKEN')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arschool-lrojo-six.vercel.app'

  if (!tbkToken) {
    return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=error`)
  }

  const admin = getAdmin()
  try {
    const inscription = new Oneclick.MallInscription(getOneclickOptions())
    const result = await inscription.finish(tbkToken)

    if (result.response_code === 0) {
      await admin.from('tarjetas_recurrentes')
        .update({
          tbk_token: result.tbk_user,
          card_type: result.card_type,
          card_last_four: result.card_number?.slice(-4) ?? null,
          activa: true,
          fecha_inscripcion: new Date().toISOString(),
        })
        .eq('tbk_user', result.tbk_user)

      return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=exito`)
    }
    return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=rechazado`)
  } catch {
    return NextResponse.redirect(`${baseUrl}/portal/pagos?oneclick=error`)
  }
}
