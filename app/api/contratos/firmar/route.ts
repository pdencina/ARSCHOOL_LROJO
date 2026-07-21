import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Mapeo de colegio_id a sede (mismo que en /api/contratos)
const SEDES_POR_COLEGIO: Record<string, string> = {
  '11111111-1111-1111-1111-111111111111': 'santiago',
  '22222222-2222-2222-2222-222222222222': 'puente_alto',
  '33333333-3333-3333-3333-333333333333': 'punta_arenas',
}

// POST: Guardar firma digital con evidencia legal (FES Ley 19.799)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { matricula_id, firma_data, tipo = 'contrato', consentimiento, documento_html } = body

  if (!matricula_id || !firma_data) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  if (!consentimiento) {
    return NextResponse.json({ error: 'Debe aceptar la declaración de consentimiento' }, { status: 400 })
  }

  const admin = getAdmin()

  // Obtener datos del firmante (quien firma: apoderado)
  const { data: usuario } = await admin
    .from('usuarios')
    .select('nombre, apellido, email, rol, colegio_id')
    .eq('id', user.id)
    .single()

  const firmante = usuario as any

  // Determinar sede desde el colegio del usuario
  const sedeId = SEDES_POR_COLEGIO[firmante?.colegio_id] ?? 'santiago'

  // Generar evidencia de auditoría
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'desconocida'
  const userAgent = request.headers.get('user-agent') ?? 'desconocido'
  const timestamp = new Date().toISOString()

  // Hash SHA-256 del documento HTML (prueba de integridad)
  const documentoHash = documento_html
    ? createHash('sha256').update(documento_html).digest('hex')
    : null

  // Hash de la firma misma
  const firmaHash = createHash('sha256').update(firma_data).digest('hex')

  // Registro de auditoría completo
  const registroAuditoria = {
    firmante: {
      id: user.id,
      nombre: `${firmante?.nombre ?? ''} ${firmante?.apellido ?? ''}`.trim(),
      email: firmante?.email ?? user.email,
      rol: firmante?.rol,
    },
    representante_institucional: {
      id: user.id,
      nombre: `${firmante?.nombre ?? ''} ${firmante?.apellido ?? ''}`.trim(),
      email: firmante?.email ?? user.email,
      rol: firmante?.rol,
      sede: sedeId,
    },
    timestamp,
    ip: ip.split(',')[0].trim(), // Tomar primera IP si hay varias
    user_agent: userAgent,
    documento_hash: documentoHash,
    firma_hash: firmaHash,
    tipo_documento: tipo,
    consentimiento_texto: 'Declaro haber leído íntegramente el documento y acepto sus términos. Confirmo que esta firma electrónica simple tiene plena validez legal conforme a la Ley 19.799.',
    consentimiento_aceptado: true,
    metodo: 'firma_electronica_simple',
    ley_aplicable: 'Ley 19.799 Chile',
    sede: sedeId,
  }

  if (tipo === 'pagare') {
    const { error } = await admin.from('matriculas').update({
      firma_pagare: firma_data,
      firmado_pagare_at: timestamp,
      auditoria_pagare: registroAuditoria,
      gestionado_por: user.id,
      sede_firma: sedeId,
    }).eq('id', matricula_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.from('matriculas').update({
      firma_apoderado: firma_data,
      firmado_at: timestamp,
      auditoria_contrato: registroAuditoria,
      gestionado_por: user.id,
      sede_firma: sedeId,
    }).eq('id', matricula_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tipo,
    evidencia: {
      timestamp,
      documento_hash: documentoHash,
      firma_hash: firmaHash,
      ip: ip.split(',')[0].trim(),
      sede: sedeId,
      gestionado_por: `${firmante?.nombre ?? ''} ${firmante?.apellido ?? ''}`.trim(),
    },
  })
}
