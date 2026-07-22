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

// POST: Reportar un pago (apoderado sube comprobante) o registrar pago (admin)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const body = await request.json()
  const { cobro_id, comprobante_url, metodo, monto: montoManual, observaciones } = body

  if (!cobro_id) return NextResponse.json({ error: 'cobro_id requerido' }, { status: 400 })

  // Obtener el cobro
  const { data: cobro } = await admin.from('cobros').select('*').eq('id', cobro_id).single()
  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  const cobroData = cobro as any
  const montoPago = montoManual || cobroData.monto

  // Crear registro de pago
  const { data: pago, error } = await admin.from('pagos').insert({
    cobro_id,
    alumno_id: cobroData.alumno_id,
    colegio_id: cobroData.colegio_id,
    monto: montoPago,
    metodo: metodo || 'transferencia',
    comprobante_url: comprobante_url || null,
    estado: comprobante_url ? 'pendiente' : 'confirmado', // Si tiene comprobante, queda pendiente de validación
    registrado_por: user.id,
    observaciones: observaciones || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si es pago directo (sin comprobante por validar), marcar cobro como pagado
  if (!comprobante_url) {
    const nuevoMontoPagado = (cobroData.monto_pagado ?? 0) + montoPago
    const nuevoEstado = nuevoMontoPagado >= cobroData.monto ? 'pagado' : 'parcial'
    await admin.from('cobros').update({
      monto_pagado: nuevoMontoPagado,
      estado: nuevoEstado,
    }).eq('id', cobro_id)
  }

  return NextResponse.json({ ok: true, pago })
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
