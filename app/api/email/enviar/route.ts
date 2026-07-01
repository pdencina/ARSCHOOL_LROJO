import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail, templateComunicado, templateReporteDiario, templatePagoMora } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'tutor'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { tipo, datos } = await request.json()

  if (tipo === 'comunicado') {
    // Enviar comunicado por email a los apoderados
    const { comunicado_id } = datos
    const { data: comunicado } = await admin.from('comunicados').select('*, colegio:colegios(nombre)').eq('id', comunicado_id).single()
    if (!comunicado) return NextResponse.json({ error: 'Comunicado no encontrado' }, { status: 404 })

    // Obtener emails de familias del colegio (o del curso si aplica)
    let query = admin.from('familias').select('email').eq('colegio_id', (comunicado as any).colegio_id)
    if ((comunicado as any).curso) {
      const { data: als } = await admin.from('alumnos').select('id').eq('curso', (comunicado as any).curso).eq('colegio_id', (comunicado as any).colegio_id)
      if (als?.length) query = query.in('alumno_id', als.map((a: any) => a.id))
    }
    const { data: familias } = await query
    const emails = [...new Set((familias ?? []).map((f: any) => f.email).filter(Boolean))]

    if (emails.length === 0) return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 })

    const html = templateComunicado(
      (comunicado as any).titulo,
      (comunicado as any).contenido,
      (comunicado as any).colegio?.nombre ?? 'AR School'
    )

    // Enviar en lotes de 50
    let enviados = 0
    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50)
      const result = await enviarEmail({ to: batch, subject: `${(comunicado as any).titulo} — AR School`, html })
      if (result.ok) enviados += batch.length
    }

    return NextResponse.json({ ok: true, enviados })

  } else if (tipo === 'reporte_diario') {
    // Notificar al apoderado que se publicó el reporte
    const { alumno_id, fecha } = datos
    const { data: alumno } = await admin.from('alumnos').select('*, familias(email, nombre_apoderado)').eq('id', alumno_id).single()
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const email = (alumno as any).familias?.[0]?.email
    if (!email) return NextResponse.json({ error: 'Apoderado sin email' }, { status: 400 })

    const html = templateReporteDiario(
      `${(alumno as any).nombre} ${(alumno as any).apellido}`,
      (alumno as any).curso,
      fecha,
      'El reporte diario de tu hijo/a ha sido publicado. Ingresa a la plataforma para ver los detalles.'
    )

    const result = await enviarEmail({
      to: email,
      subject: `Reporte diario de ${(alumno as any).nombre} — AR School`,
      html,
    })

    return NextResponse.json(result)

  } else if (tipo === 'pago_mora') {
    // Recordatorio de pago
    const { familia_id, monto, alumno_nombre } = datos
    const { data: familia } = await admin.from('familias').select('email, nombre_apoderado').eq('id', familia_id).single()
    if (!familia || !(familia as any).email) return NextResponse.json({ error: 'Sin email' }, { status: 400 })

    const html = templatePagoMora(
      (familia as any).nombre_apoderado,
      alumno_nombre,
      monto
    )

    const result = await enviarEmail({
      to: (familia as any).email,
      subject: `Recordatorio de pago — AR School`,
      html,
    })

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Tipo de email no válido' }, { status: 400 })
}
