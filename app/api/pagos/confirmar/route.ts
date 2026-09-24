import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Quienes pueden validar comprobantes enviados por apoderados
// (Cobranza y módulo "Pagos y vouchers").
const ROLES_VALIDAR = ['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador']

// POST /api/pagos/confirmar — Aprobar o rechazar un comprobante (voucher) de apoderado
// Body: { pago_id, cobro_id?, accion: 'aprobar' | 'rechazar', motivo? }
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!ROLES_VALIDAR.includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { pago_id, cobro_id, accion, motivo } = await request.json()
  const esRechazo = accion === 'rechazar'
  if (!pago_id) return NextResponse.json({ error: 'pago_id requerido' }, { status: 400 })

  // El pago debe existir, seguir pendiente y corresponder a la cuota indicada
  const { data: pagoRow } = await admin
    .from('pagos')
    .select('id, cobro_id, monto, estado, metadata, registrado_por')
    .eq('id', pago_id)
    .single()
  const pago = pagoRow as any
  if (!pago) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  if (cobro_id && pago.cobro_id !== cobro_id) return NextResponse.json({ error: 'El pago no corresponde a esa cuota' }, { status: 400 })
  if (pago.estado !== 'pendiente') {
    return NextResponse.json({ error: `Este comprobante ya fue ${pago.estado === 'confirmado' ? 'aprobado' : pago.estado}` }, { status: 409 })
  }

  const { data: cobroRow } = await admin
    .from('cobros')
    .select('id, monto, monto_pagado, colegio_id, alumno_id, mes, anio, alumno:alumnos(nombre, apellido)')
    .eq('id', pago.cobro_id)
    .single()
  const cobro = cobroRow as any
  if (!cobro) return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 })

  // Roles de sede: solo cuotas de su(s) sede(s)
  if (usuario.rol !== 'super_admin') {
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    if (sedes.length && cobro.colegio_id && !sedes.includes(cobro.colegio_id)) {
      return NextResponse.json({ error: 'Esta cuota es de otra sede' }, { status: 403 })
    }
  }

  const ahora = new Date().toISOString()
  const metaPrevia = pago.metadata ?? {}

  // ── Rechazar ──
  if (esRechazo) {
    const { error } = await admin.from('pagos').update({
      estado: 'rechazado',
      metadata: { ...metaPrevia, rechazado_por: user.id, rechazado_at: ahora, motivo_rechazo: motivo || null },
    }).eq('id', pago_id).eq('estado', 'pendiente')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Avisar al apoderado que envió el comprobante
    if (pago.registrado_por) {
      try {
        const { data: apo } = await admin.from('usuarios').select('email, nombre').eq('id', pago.registrado_por).single()
        const a = apo as any
        if (a?.email) {
          const { enviarEmail } = await import('@/lib/email')
          const alumno = `${cobro.alumno?.nombre ?? ''} ${cobro.alumno?.apellido ?? ''}`.trim()
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.arschoolglobal.com'
          await enviarEmail({
            to: a.email,
            subject: 'AR School — Comprobante de pago rechazado',
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                <strong style="font-size:15px;color:#1B3A5C;">AR SCHOOL</strong>
                <h2 style="color:#1B3A5C;font-size:16px;margin:16px 0 8px;">Comprobante rechazado</h2>
                <p style="color:#4b5563;font-size:13px;">Hola ${a.nombre ?? ''}, revisamos el comprobante de <strong>$${Number(pago.monto).toLocaleString('es-CL')}</strong> enviado para ${alumno || 'su alumno'} y no pudimos validarlo.</p>
                ${motivo ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin:12px 0;font-size:13px;color:#9a3412;"><strong>Motivo:</strong> ${String(motivo).replace(/</g, '&lt;')}</div>` : ''}
                <p style="color:#4b5563;font-size:13px;">Por favor envíe un nuevo comprobante desde el portal.</p>
                <div style="margin-top:20px;text-align:center;">
                  <a href="${baseUrl}/portal/pagos" style="background:#1B3A5C;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Ir a mis pagos</a>
                </div>
              </div>`,
          })
        }
      } catch (e) {
        console.error('Aviso de rechazo:', e)
      }
    }
    return NextResponse.json({ ok: true, accion: 'rechazado' })
  }

  // ── Aprobar ──
  // Se suma a lo ya pagado (antes se usaba el mayor de los dos y se perdían abonos previos).
  const nuevoPagado = Math.min(cobro.monto, (cobro.monto_pagado ?? 0) + (pago.monto ?? 0))
  const nuevoEstado = nuevoPagado >= cobro.monto ? 'pagado' : 'parcial'

  // Solo si sigue pendiente (evita aprobar dos veces con doble clic)
  const { data: aprobado, error: ePago } = await admin.from('pagos').update({
    estado: 'confirmado',
    metadata: { ...metaPrevia, validado_por: user.id, validado_at: ahora },
  }).eq('id', pago_id).eq('estado', 'pendiente').select('id')
  if (ePago) return NextResponse.json({ error: ePago.message }, { status: 500 })
  if (!aprobado || (aprobado as any[]).length === 0) return NextResponse.json({ error: 'Este comprobante ya fue procesado' }, { status: 409 })

  const { error: eCobro } = await admin.from('cobros').update({
    monto_pagado: nuevoPagado,
    estado: nuevoEstado,
    medio_pago: 'transferencia',
    fecha_pago: nuevoEstado === 'pagado' ? ahora.slice(0, 10) : null,
  }).eq('id', cobro.id)
  if (eCobro) {
    // Revertir el pago para no dejarlo confirmado con la cuota sin actualizar
    await admin.from('pagos').update({ estado: 'pendiente', metadata: metaPrevia }).eq('id', pago_id)
    return NextResponse.json({ error: `No se pudo actualizar la cuota: ${eCobro.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, accion: 'aprobado', estado_cuota: nuevoEstado, monto_pagado: nuevoPagado })
}
