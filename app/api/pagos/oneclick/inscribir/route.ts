import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { WebpayPlus, Oneclick, Options, Environment } from 'transbank-sdk'

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
    : '597055555542' // Código Oneclick de pruebas
  const apiKey = isProduction
    ? process.env.TRANSBANK_ONECLICK_API_KEY!
    : '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C'
  return new Options(commerceCode, apiKey, isProduction ? Environment.Production : Environment.Integration)
}

// POST /api/pagos/oneclick/inscribir
// Inicia el proceso de inscripción de tarjeta para cobro recurrente
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()

  // Obtener familia del apoderado
  const { data: vinculos } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
  if (!vinculos || vinculos.length === 0) {
    return NextResponse.json({ error: 'No hay alumnos vinculados' }, { status: 400 })
  }

  const { data: familia } = await admin
    .from('familias')
    .select('id')
    .eq('alumno_id', vinculos[0].alumno_id)
    .limit(1)
    .single()

  if (!familia) return NextResponse.json({ error: 'Familia no encontrada' }, { status: 404 })

  // Username único para Oneclick
  const username = `arschool-${user.id.substring(0, 8)}-${Date.now()}`
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arschool-lrojo-six.vercel.app'
  const responseUrl = `${baseUrl}/api/pagos/oneclick/confirmar`

  try {
    const inscription = new Oneclick.MallInscription(getOneclickOptions())
    const response = await inscription.start(username, user.email!, responseUrl)

    // Guardar registro pendiente
    await admin.from('tarjetas_recurrentes').insert({
      familia_id: familia.id,
      alumno_id: vinculos[0].alumno_id,
      tbk_user: username,
      activa: false,
    })

    return NextResponse.json({
      url: response.url_webpay,
      token: response.token,
    })
  } catch (error: any) {
    console.error('Error Oneclick inscribir:', error)
    return NextResponse.json({ error: `Error: ${error.message}` }, { status: 500 })
  }
}
