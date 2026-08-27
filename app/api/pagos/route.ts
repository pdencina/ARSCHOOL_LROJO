import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { paymentApiLimiter, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST: Reportar un pago (apoderado sube comprobante) o registrar pago (admin)
export async function POST(request: NextRequest) {
  // Rate limiting per IP/user
  const ipIdentifier = getClientIdentifier(request)
  const ipCheck = paymentApiLimiter.check(ipIdentifier)
  if (!ipCheck.success) {
    return rateLimitResponse(ipCheck)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const body = await request.json()
  const { cobro_id, matricula_id, tipo_cobro, comprobante_url, metodo, monto: montoManual, observaciones } = body

  let cobroIdFinal = cobro_id

  // Si viene matricula_id, buscar el cobro por tipo
  if (!cobroIdFinal && matricula_id) {
    const { data: mat } = await admin.from('matriculas').select('alumno_id').eq('id', matricula_id).single()
    if (mat) {
      const tipoBuscar = tipo_cobro || 'aporte_inicial'
      const { data: cobroBuscado } = await admin.from('cobros')
        .select('id')
        .eq('alumno_id', (mat as any).alumno_id)
        .eq('tipo_concepto', tipoBuscar)
        .eq('estado', 'pendiente')
        .order('anio').order('mes')
        .limit(1)
        .single()
      if (cobroBuscado) cobroIdFinal = (cobroBuscado as any).id
    }
  }

  if (!cobroIdFinal) return NextResponse.json({ error: 'No se encontró cobro pendiente' }, { status: 400 })

  // Obtener el cobro
  const { data: cobro } = await admin.from('cobros').select('*, alumno:alumnos(nombre, apellido)').eq('id', cobroIdFinal).single()
  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  const cobroData = cobro as any
  const montoPago = montoManual || cobroData.monto

  // Un comprobante (voucher) de apoderado queda PENDIENTE de validación por el pastor de campus.
  // Un pago directo registrado por admin (sin comprobante) queda CONFIRMADO de inmediato.
  const esVoucher = !!comprobante_url
  const estadoPago = esVoucher ? 'pendiente' : 'confirmado'

  // Crear registro de pago
  // referencia guarda el comprobante (voucher) o las observaciones del registro manual
  const { data: pago, error } = await admin.from('pagos').insert({
    cobro_id: cobroIdFinal,
    monto: montoPago,
    medio_pago: metodo || 'transferencia',
    referencia: comprobante_url || observaciones || null,
    estado: estadoPago,
    registrado_por: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Solo marcar el cobro como pagado si NO es un voucher pendiente de validación.
  // Los vouchers los aprueba el pastor de campus en Cobranza.
  if (!esVoucher) {
    const nuevoMontoPagado = (cobroData.monto_pagado ?? 0) + montoPago
    const nuevoEstado = nuevoMontoPagado >= cobroData.monto ? 'pagado' : 'parcial'
    await admin.from('cobros').update({
      monto_pagado: nuevoMontoPagado,
      estado: nuevoEstado,
      medio_pago: metodo || 'transferencia',
      fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', cobroIdFinal)
  }

  // Notificar al admin si es pago con comprobante (voucher)
  if (comprobante_url) {
    const { enviarEmail } = await import('@/lib/email')
    const alumnoNombre = `${cobroData.alumno?.nombre || ''} ${cobroData.alumno?.apellido || ''}`.trim() || 'Alumno'
    // Notificar a admins del colegio
    const { data: admins } = await admin
      .from('usuarios')
      .select('email')
      .eq('colegio_id', cobroData.colegio_id)
      .in('rol', ['super_admin', 'admin', 'pastor_campus'])
      .eq('activo', true)
    const emailsAdmin = (admins ?? []).map((a: any) => a.email).filter(Boolean).slice(0, 5)
    if (emailsAdmin.length > 0) {
      await enviarEmail({
        to: emailsAdmin,
        subject: `AR School — Comprobante de pago recibido: ${alumnoNombre}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
            <strong style="font-size:15px;color:#1B3A5C;">AR SCHOOL</strong>
            <h2 style="color:#1B3A5C;font-size:16px;margin:16px 0 8px;">Comprobante de pago recibido</h2>
            <p style="color:#4b5563;font-size:13px;">Un apoderado ha reportado un pago por transferencia:</p>
            <div style="background:#f8f9fb;border-radius:8px;padding:14px;margin:12px 0;">
              <p style="margin:0;font-size:13px;color:#1a2332;"><strong>Alumno:</strong> ${alumnoNombre}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#1a2332;"><strong>Monto:</strong> $${montoPago.toLocaleString('es-CL')} CLP</p>
              <p style="margin:4px 0 0;font-size:13px;color:#b45309;"><strong>Estado:</strong> Por validar</p>
            </div>
            <p style="color:#6b7280;font-size:12px;">Ingrese a la sección de <strong>Cobranza</strong> para revisar el comprobante y aprobar o rechazar el pago.</p>
            <div style="margin-top:20px;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.arschoolglobal.com'}/cobranza" style="background:#1B3A5C;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Ver en Cobranza</a>
            </div>
          </div>
        `,
      }).catch(() => {}) // No bloquear si falla el email
    }
  }

  return NextResponse.json({ ok: true, pago, por_validar: esVoucher })
}

// GET: Listar pagos (para admin: todos del colegio, para apoderado: solo los suyos)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado') // pendiente, confirmado

  let query = admin.from('pagos').select('*, cobro:cobros(mes, anio, alumno:alumnos(nombre, apellido))').order('created_at', { ascending: false })

  if (['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes(usuario?.rol)) {
    if (usuario.colegio_id) query = query.eq('colegio_id', usuario.colegio_id)
  } else {
    query = query.eq('registrado_por', user.id)
  }

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PUT: Validar/rechazar pago (admin)
export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { pago_id, accion } = await request.json() // accion: 'confirmar' | 'rechazar'
  if (!pago_id || !accion) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const { data: pago } = await admin.from('pagos').select('*').eq('id', pago_id).single()
  if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

  const pagoData = pago as any

  if (accion === 'confirmar') {
    // Marcar pago como confirmado
    await admin.from('pagos').update({ estado: 'confirmado' }).eq('id', pago_id)
    // Actualizar cobro
    const { data: cobro } = await admin.from('cobros').select('monto, monto_pagado').eq('id', pagoData.cobro_id).single()
    if (cobro) {
      const nuevoMonto = ((cobro as any).monto_pagado ?? 0) + pagoData.monto
      const nuevoEstado = nuevoMonto >= (cobro as any).monto ? 'pagado' : 'parcial'
      await admin.from('cobros').update({ monto_pagado: nuevoMonto, estado: nuevoEstado }).eq('id', pagoData.cobro_id)
    }
  } else {
    // Rechazar
    await admin.from('pagos').update({ estado: 'rechazado' }).eq('id', pago_id)
  }

  return NextResponse.json({ ok: true })
}
