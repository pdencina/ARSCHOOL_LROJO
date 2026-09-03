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

  // Datos que aparecen en el contrato: se guardan en familias y alumnos
  const tocaFamilia = ['direccion_apoderado', 'comuna_apoderado', 'nombre_apoderado', 'apellido_apoderado', 'rut_apoderado', 'email_apoderado', 'telefono_apoderado']
    .some(k => body[k] !== undefined)
  const tocaAlumno = ['alumno_nombre', 'alumno_apellido', 'alumno_rut', 'alumno_fecha_nacimiento']
    .some(k => body[k] !== undefined)

  if (tocaFamilia || tocaAlumno) {
    const { data: mat } = await admin.from('matriculas').select('familia_id, alumno_id').eq('id', id).single()
    const m = mat as any

    // Familia (datos del apoderado)
    if (tocaFamilia) {
      const famUpd: any = {}
      if (body.direccion_apoderado !== undefined) famUpd.direccion = body.direccion_apoderado
      if (body.comuna_apoderado !== undefined) famUpd.comuna = body.comuna_apoderado
      if (body.nombre_apoderado !== undefined) famUpd.nombre_apoderado = body.nombre_apoderado
      if (body.apellido_apoderado !== undefined) famUpd.apellido_apoderado = body.apellido_apoderado
      if (body.rut_apoderado !== undefined) famUpd.rut = body.rut_apoderado
      if (body.email_apoderado !== undefined) famUpd.email = body.email_apoderado
      if (body.telefono_apoderado !== undefined) famUpd.telefono = body.telefono_apoderado
      if (Object.keys(famUpd).length > 0) {
        if (m?.familia_id) {
          await admin.from('familias').update(famUpd).eq('id', m.familia_id).then(() => {}, () => {})
        } else if (m?.alumno_id) {
          await admin.from('familias').update(famUpd).eq('alumno_id', m.alumno_id).then(() => {}, () => {})
        }
      }
    }

    // Alumno (datos que salen en el contrato)
    if (tocaAlumno && m?.alumno_id) {
      const alUpd: any = {}
      if (body.alumno_nombre !== undefined) alUpd.nombre = body.alumno_nombre
      if (body.alumno_apellido !== undefined) alUpd.apellido = body.alumno_apellido
      if (body.alumno_rut !== undefined) alUpd.rut = body.alumno_rut
      if (body.alumno_fecha_nacimiento !== undefined) alUpd.fecha_nacimiento = body.alumno_fecha_nacimiento || null
      if (Object.keys(alUpd).length > 0) {
        await admin.from('alumnos').update(alUpd).eq('id', m.alumno_id).then(() => {}, () => {})
      }
    }
  }

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
    if (body.sede !== undefined) {
      await admin.from('matriculas').update({ sede: body.sede }).eq('id', id).then(() => {}).catch(() => {})
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }

  return NextResponse.json(data)
}
