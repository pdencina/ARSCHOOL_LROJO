import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarCodigo6Digitos(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/contratos/verificar
// Acción 1: enviar código al email del apoderado
// Acción 2: validar código ingresado
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const body = await request.json()
  const { accion, matricula_id, tipo = 'firma_contrato', codigo } = body

  if (!matricula_id) {
    return NextResponse.json({ error: 'matricula_id requerido' }, { status: 400 })
  }

  // Obtener datos de la matrícula y familia
  const { data: matricula } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido), familia:familias(email, nombre_apoderado)')
    .eq('id', matricula_id)
    .single()

  if (!matricula) {
    return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  }

  const m = matricula as any
  const emailApoderado = m.familia?.email

  if (!emailApoderado) {
    return NextResponse.json({ error: 'No hay email de apoderado registrado' }, { status: 400 })
  }

  if (accion === 'enviar') {
    // Invalidar códigos anteriores no usados
    await admin
      .from('codigos_verificacion')
      .update({ usado: true })
      .eq('matricula_id', matricula_id)
      .eq('tipo', tipo)
      .eq('usado', false)

    // Generar nuevo código
    const nuevoCodigo = generarCodigo6Digitos()
    const expiraAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    await admin.from('codigos_verificacion').insert({
      matricula_id,
      email: emailApoderado,
      codigo: nuevoCodigo,
      tipo,
      expira_at: expiraAt.toISOString(),
    })

    // Enviar email con el código
    const tipoLabel = tipo === 'firma_pagare' ? 'Pagaré' : 'Contrato de Servicios Educacionales'
    const alumnoNombre = `${m.alumno?.nombre ?? ''} ${m.alumno?.apellido ?? ''}`.trim()

    await enviarEmail({
      to: emailApoderado,
      subject: `AR School — Código de verificación para firma`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:30px;">
          <div style="text-align:center;margin-bottom:24px;">
            <strong style="font-size:16px;color:#1a2332;">AR SCHOOL</strong>
          </div>
          <h2 style="color:#1a2332;font-size:18px;text-align:center;margin-bottom:8px;">Código de verificación</h2>
          <p style="text-align:center;color:#6b7280;font-size:13px;margin-bottom:24px;">
            Para firmar el <strong>${tipoLabel}</strong> del alumno <strong>${alumnoNombre}</strong>
          </p>
          <div style="background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1B3A5C;font-family:monospace;">
              ${nuevoCodigo}
            </div>
          </div>
          <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:16px;">
            Este código expira en 15 minutos.<br/>
            Si usted no solicitó este código, puede ignorar este mensaje.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="font-size:11px;color:#9ca3af;text-align:center;">
            Fundación Educacional AR Ministries · RUT 65.168.392-0
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      mensaje: `Código enviado a ${emailApoderado.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
      expira_en_minutos: 15,
    })
  }

  if (accion === 'validar') {
    if (!codigo || codigo.length !== 6) {
      return NextResponse.json({ error: 'Código de 6 dígitos requerido' }, { status: 400 })
    }

    // Buscar código válido
    const { data: codigoDb } = await admin
      .from('codigos_verificacion')
      .select('*')
      .eq('matricula_id', matricula_id)
      .eq('tipo', tipo)
      .eq('usado', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!codigoDb) {
      return NextResponse.json({ error: 'No hay código pendiente. Solicite uno nuevo.' }, { status: 400 })
    }

    const cv = codigoDb as any

    // Verificar expiración
    if (new Date(cv.expira_at) < new Date()) {
      await admin.from('codigos_verificacion').update({ usado: true }).eq('id', cv.id)
      return NextResponse.json({ error: 'Código expirado. Solicite uno nuevo.' }, { status: 400 })
    }

    // Verificar intentos
    if (cv.intentos >= cv.max_intentos) {
      await admin.from('codigos_verificacion').update({ usado: true }).eq('id', cv.id)
      return NextResponse.json({ error: 'Demasiados intentos. Solicite un nuevo código.' }, { status: 400 })
    }

    // Verificar código
    if (cv.codigo !== codigo) {
      await admin.from('codigos_verificacion')
        .update({ intentos: cv.intentos + 1 })
        .eq('id', cv.id)
      const restantes = cv.max_intentos - cv.intentos - 1
      return NextResponse.json({
        error: `Código incorrecto. ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.`,
      }, { status: 400 })
    }

    // Código válido — marcar como usado
    await admin.from('codigos_verificacion')
      .update({ usado: true })
      .eq('id', cv.id)

    return NextResponse.json({
      ok: true,
      verificado: true,
      mensaje: 'Código verificado correctamente. Puede proceder con la firma.',
    })
  }

  return NextResponse.json({ error: 'Acción no válida. Use "enviar" o "validar".' }, { status: 400 })
}
