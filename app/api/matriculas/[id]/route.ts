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

// DELETE /api/matriculas/[id] — Eliminar matrícula y cobros asociados
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params

  // Obtener la matrícula para saber el alumno_id
  const { data: matricula } = await admin.from('matriculas').select('alumno_id, familia_id').eq('id', id).single()
  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })

  const m = matricula as any

  // Eliminar cobros asociados
  await admin.from('cobros').delete().eq('alumno_id', m.alumno_id)

  // Eliminar firma tokens
  await admin.from('firma_tokens').delete().eq('matricula_id', id)

  // Eliminar la matrícula
  const { error } = await admin.from('matriculas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// PATCH /api/matriculas/[id] — Editar datos de la matrícula
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { id } = params

  // Campos editables de la matrícula (solo los que existen seguro en la tabla)
  const updates: any = {}
  if (body.monto_matricula !== undefined) updates.monto_matricula = Number(body.monto_matricula)
  if (body.monto_mensual !== undefined) updates.monto_mensual = Number(body.monto_mensual)
  if (body.observaciones !== undefined) updates.observaciones = body.observaciones
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.medio_pago_matricula !== undefined) updates.medio_pago_matricula = body.medio_pago_matricula
  if (body.banco_cheque !== undefined) updates.banco_cheque = body.banco_cheque
  if (body.cheques !== undefined) updates.cheques = body.cheques

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  try {
    const { data, error } = await admin.from('matriculas').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Campos opcionales que pueden no existir en la BD (migraciones pendientes)
    if (body.fecha_inicio_contrato) {
      await admin.from('matriculas').update({ fecha_inicio_contrato: body.fecha_inicio_contrato }).eq('id', id).then(() => {}).catch(() => {})
    }
    if (body.porcentaje_beca !== undefined && body.porcentaje_beca > 0) {
      await admin.from('matriculas').update({ porcentaje_beca: Number(body.porcentaje_beca) }).eq('id', id).then(() => {}).catch(() => {})
    }
    if (body.anio_escolar !== undefined) {
      await admin.from('matriculas').update({ anio_escolar: Number(body.anio_escolar) }).eq('id', id).then(() => {}).catch(() => {})
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }

  return NextResponse.json(data)
}
