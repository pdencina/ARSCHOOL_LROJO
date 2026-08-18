import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { enviarEmail } from '@/lib/email'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/contratos/firmar-remoto
// Acciones: 'ver' (marca como visto), 'codigo' (envía código), 'firmar' (valida y firma)
export async function POST(request: NextRequest) {
  const admin = getAdmin()
  const body = await request.json()
  const { token, accion, nombre_firma, rut_firma, codigo } = body

  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  // Buscar token
  const { data: firmaToken } = await admin
    .from('firma_tokens')
    .select('*, matricula:matriculas(*, alumno:alumnos(nombre, apellido, curso, rut))')
    .eq('token', token)
    .single()

  if (!firmaToken) return NextResponse.json({ error: 'Enlace no válido' }, { status: 404 })
  const ft = firmaToken as any

  // Verificar expiración
  if (new Date(ft.expira_at) < new Date()) {
    await admin.from('firma_tokens').update({ estado: 'expirado' }).eq('id', ft.id)
    return NextResponse.json({ error: 'Este enlace ha expirado. Solicite uno nuevo al SEDE.' }, { status: 410 })
  }

  // Verificar que no esté ya firmado
  if (ft.estado === 'firmado') {
    return NextResponse.json({ error: 'Este documento ya fue firmado.' }, { status: 400 })
  }

  if (ft.estado === 'cancelado') {
    return NextResponse.json({ error: 'Este enlace fue cancelado. Solicite uno nuevo.' }, { status: 400 })
  }

  // --- ACCIÓN: VER ---
  if (accion === 'ver') {
    if (ft.estado === 'pendiente') {
      await admin.from('firma_tokens').update({ estado: 'visto', visto_at: new Date().toISOString() }).eq('id', ft.id)
    }
    return NextResponse.json({
      ok: true,
      estado: 'visto',
      tipo: ft.tipo,
      alumno: ft.matricula?.alumno,
      nombre_esperado: ft.nombre_completo_esperado,
    })
  }

  // --- ACCIÓN: ENVIAR CÓDIGO ---
  if (accion === 'codigo') {
    const nuevoCodigo = generarCodigo()
    const codigoExpira = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await admin.from('firma_tokens').update({
      codigo_verificacion: nuevoCodigo,
      codigo_expira_at: codigoExpira.toISOString(),
      codigo_intentos: 0,
    }).eq('id', ft.id)

    // Enviar código por email
    await enviarEmail({
      to: ft.email_destino,
      subject: 'AR School — Código de verificación para firma',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:450px;margin:0 auto;padding:30px 20px;text-align:center;">
          <strong style="font-size:15px;color:#1B3A5C;">AR SCHOOL</strong>
          <h2 style="color:#1B3A5C;font-size:17px;margin:16px 0 8px;">Código de verificación</h2>
          <p style="color:#6b7280;font-size:13px;margin-bottom:20px;">Ingrese este código en la página de firma para confirmar su identidad.</p>
          <div style="background:#f0f4f8;border-radius:12px;padding:20px;margin:16px 0;">
            <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1B3A5C;font-family:monospace;">${nuevoCodigo}</div>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin-top:16px;">Este código expira en 10 minutos.</p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      mensaje: 'Código enviado. Revise su correo.',
      expira_en_minutos: 10,
    })
  }

  // --- ACCIÓN: FIRMAR ---
  if (accion === 'firmar') {
    if (!nombre_firma || !codigo) {
      return NextResponse.json({ error: 'Nombre completo y código son requeridos' }, { status: 400 })
    }

    // Validar código
    if (!ft.codigo_verificacion) {
      return NextResponse.json({ error: 'Debe solicitar un código primero' }, { status: 400 })
    }

    if (new Date(ft.codigo_expira_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado. Solicite uno nuevo.' }, { status: 400 })
    }

    if (ft.codigo_intentos >= 5) {
      return NextResponse.json({ error: 'Demasiados intentos. Solicite un nuevo código.' }, { status: 400 })
    }

    if (ft.codigo_verificacion !== codigo) {
      await admin.from('firma_tokens').update({ codigo_intentos: ft.codigo_intentos + 1 }).eq('id', ft.id)
      const restantes = 4 - ft.codigo_intentos
      return NextResponse.json({ error: `Código incorrecto. ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.` }, { status: 400 })
    }

    // Validar que el nombre coincide (normalizado, case-insensitive)
    const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
    const nombreEsperado = normalizar(ft.nombre_completo_esperado)
    const nombreIngresado = normalizar(nombre_firma)

    if (nombreIngresado !== nombreEsperado) {
      return NextResponse.json({
        error: 'El nombre ingresado no coincide con el registrado. Debe escribir su nombre completo exactamente como fue registrado en la matrícula.',
      }, { status: 400 })
    }

    // Firma válida — registrar
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'desconocida'
    const userAgent = request.headers.get('user-agent') ?? 'desconocido'
    const timestamp = new Date().toISOString()

    // Hash de la firma (nombre + RUT + timestamp)
    const firmaTexto = `${nombre_firma}|${rut_firma || ''}|${timestamp}`
    const firmaHash = createHash('sha256').update(firmaTexto).digest('hex')

    // Registro de auditoría
    const auditoria = {
      firmante: {
        nombre: nombre_firma,
        rut: rut_firma || ft.rut_esperado || null,
        email: ft.email_destino,
      },
      timestamp,
      ip: ip.split(',')[0].trim(),
      user_agent: userAgent,
      firma_hash: firmaHash,
      metodo: 'firma_remota_email',
      codigo_verificado: true,
      nombre_coincide: true,
      ley_aplicable: 'Ley 19.799 Chile — Firma Electrónica Simple',
      consentimiento_texto: `Yo, ${nombre_firma}, declaro haber leído íntegramente el documento y acepto sus términos. Confirmo que esta firma electrónica simple tiene plena validez legal.`,
    }

    // Actualizar token
    await admin.from('firma_tokens').update({
      estado: 'firmado',
      firmado_at: timestamp,
      ip_firma: ip.split(',')[0].trim(),
      user_agent_firma: userAgent,
    }).eq('id', ft.id)

    // Actualizar matrícula con la firma
    const firmaData = `FIRMA ELECTRÓNICA: ${nombre_firma} | RUT: ${rut_firma || 'N/A'} | ${timestamp}`

    if (ft.tipo === 'pagare') {
      await admin.from('matriculas').update({
        firma_pagare: firmaData,
        firmado_pagare_at: timestamp,
        auditoria_pagare: auditoria,
        estado_contrato: 'firmado',
      }).eq('id', ft.matricula_id)
    } else {
      await admin.from('matriculas').update({
        firma_apoderado: firmaData,
        firmado_at: timestamp,
        auditoria_contrato: auditoria,
        estado_contrato: 'firmado',
      }).eq('id', ft.matricula_id)
    }

    return NextResponse.json({
      ok: true,
      firmado: true,
      evidencia: {
        timestamp,
        firma_hash: firmaHash,
        nombre: nombre_firma,
        ip: ip.split(',')[0].trim(),
      },
    })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
