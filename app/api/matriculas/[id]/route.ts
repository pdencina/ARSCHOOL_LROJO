import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { registrarEventoAdmision } from '@/lib/admisionEventos'
import { autorizarMatricula, familiaDeMatricula } from '@/lib/matriculaAcceso'
import { idxMes, idxDeFecha, inicioMatricula, limiteSiguienteMatricula } from '@/lib/matriculaPeriodo'

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
  const { data: ur } = await admin.from('usuarios').select('rol, programa_ids, colegio_id, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params

  // Obtener la matrícula para saber el alumno_id (y el RUT del alumno para revertir la admisión)
  const { data: matricula } = await admin.from('matriculas').select('id, alumno_id, familia_id, programa_id, colegio_id, anio_escolar, fecha_inicio_contrato, fecha_matricula, created_at, firmado_at, firmado_pagare_at, alumno:alumnos(rut, nombre, apellido)').eq('id', id).single()
  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })

  const m = matricula as any

  // Coordinador: solo puede eliminar matrículas de su programa y sede
  if (usuario.rol === 'coordinador') {
    const progOk = !usuario.programa_ids?.length || (m.programa_id && usuario.programa_ids.includes(m.programa_id))
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    const sedeOk = sedes.length === 0 || sedes.includes(m.colegio_id)
    if (!progOk || !sedeOk) {
      return NextResponse.json({ error: 'Sin acceso a esta matrícula' }, { status: 403 })
    }
  }

  // ── Protección: eliminar es solo para matrículas creadas por error ──
  // Antes se borraban TODOS los cobros del alumno (cualquier año, incluso pagados, con sus
  // pagos en cascada) y la evidencia de la firma electrónica.
  if (m.firmado_at || m.firmado_pagare_at) {
    return NextResponse.json({
      error: 'No se puede eliminar: tiene contrato o pagaré firmado (es la evidencia legal de la firma). Si el alumno no continúa, usa "Dar de baja"; si hay datos que corregir, usa "Editar matrícula".',
      bloqueado: 'firmada',
    }, { status: 409 })
  }

  // Cobros de ESTA matrícula (su período), no los de todo el alumno
  const ini = inicioMatricula(m)
  const desdeIdx = ini ? idxDeFecha(ini) : -Infinity
  const hastaIdx = await limiteSiguienteMatricula(admin, m, desdeIdx === -Infinity ? 0 : desdeIdx)
  const { data: cobrosAlumno } = await admin.from('cobros').select('id, mes, anio, estado, monto_pagado').eq('alumno_id', m.alumno_id)
  const cobrosMatricula = ((cobrosAlumno as any[]) ?? []).filter(c => { const i = idxMes(c.anio, c.mes); return i >= desdeIdx && i < hastaIdx })

  // Con pagos registrados no se elimina (se perdería el historial de pagos)
  let conPagos = cobrosMatricula.some(c => (c.monto_pagado ?? 0) > 0 || ['pagado', 'parcial'].includes(c.estado))
  if (!conPagos && cobrosMatricula.length) {
    const { data: pagos } = await admin.from('pagos').select('id').in('cobro_id', cobrosMatricula.map(c => c.id)).in('estado', ['confirmado', 'pendiente']).limit(1)
    conPagos = ((pagos as any[]) ?? []).length > 0
  }
  if (conPagos) {
    return NextResponse.json({
      error: 'No se puede eliminar: tiene pagos registrados o comprobantes por validar. Si el alumno no continúa, usa "Dar de baja".',
      bloqueado: 'con_pagos',
    }, { status: 409 })
  }

  // Eliminar solo los cobros de esta matrícula
  if (cobrosMatricula.length) {
    const { error: eCob } = await admin.from('cobros').delete().in('id', cobrosMatricula.map(c => c.id))
    if (eCob) return NextResponse.json({ error: `No se pudieron eliminar los cobros: ${eCob.message}` }, { status: 500 })
  }

  // Enlaces de firma sin firmar de esta matrícula
  await admin.from('firma_tokens').delete().eq('matricula_id', id)

  // Eliminar la matrícula
  const { error } = await admin.from('matriculas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revertir la admisión: si este alumno venía de una pre-admisión marcada como
  // 'matriculada', devolverla a 'aprobada' para que reaparezca el botón de matricular.
  // Sin esto, la admisión queda en un limbo (marcada como matriculada sin matrícula).
  const rutAlumno = m.alumno?.rut
  const nombreAlumno = m.alumno?.nombre
  const apellidoAlumno = m.alumno?.apellido
  let revertidas: any[] = []
  try {
    if (rutAlumno) {
      const { data: rev } = await admin.from('pre_admisiones')
        .update({ estado: 'aprobada' })
        .eq('alumno_rut', rutAlumno)
        .eq('estado', 'matriculada')
        .select('id, colegio_id')
      revertidas = (rev as any[]) ?? []
    } else if (nombreAlumno && apellidoAlumno) {
      // Fallback para alumnos sin RUT (ej. Music & Play): match por nombre + apellido
      const { data: rev } = await admin.from('pre_admisiones')
        .update({ estado: 'aprobada' })
        .eq('alumno_nombre', nombreAlumno)
        .eq('alumno_apellido', apellidoAlumno)
        .eq('estado', 'matriculada')
        .select('id, colegio_id')
      revertidas = (rev as any[]) ?? []
    }
    for (const r of revertidas) {
      await registrarEventoAdmision(admin, {
        preAdmisionId: r.id,
        colegioId: r.colegio_id,
        usuarioId: user.id,
        accion: 'matricula_eliminada',
        estadoAnterior: 'matriculada',
        estadoNuevo: 'aprobada',
        comentario: 'Se eliminó la matrícula; la solicitud vuelve a aprobada',
      })
    }
  } catch { /* no bloquear el borrado si falla la reversión */ }

  return NextResponse.json({ ok: true })
}

// GET /api/matriculas/[id] — Matrícula completa para el modal de edición
// (la lista de Matrículas trae solo algunas columnas; editar desde ahí perdía datos).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: mat, error } = await admin.from('matriculas').select('*').eq('id', params.id).single()
  if (error || !mat) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const m = mat as any

  const [{ data: alumno }, familia] = await Promise.all([
    admin.from('alumnos').select('id, nombre, apellido, rut, fecha_nacimiento, curso').eq('id', m.alumno_id).maybeSingle(),
    familiaDeMatricula(admin, m),
  ])

  // Las firmas son imágenes base64: al modal solo le importa si existen.
  const { firma_apoderado, firma_pagare, ...resto } = m
  return NextResponse.json({
    ...resto,
    firma_apoderado: !!firma_apoderado || !!m.firmado_at,
    firma_pagare: !!firma_pagare || !!m.firmado_pagare_at,
    alumno,
    familia,
  })
}

// PATCH /api/matriculas/[id] — Editar datos de la matrícula
// Cada escritura se revisa: si algo no se guarda, se informa en `advertencias`
// (antes se ignoraba y el modal decía "guardado" aunque el contrato no cambiara).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { id } = params
  const advertencias: string[] = []

  const { data: mat } = await admin.from('matriculas').select('id, familia_id, alumno_id').eq('id', id).single()
  const m = mat as any
  if (!m) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })

  // ── Familia (datos del apoderado que salen en el contrato) ──
  const famUpd: any = {}
  if (body.direccion_apoderado !== undefined) famUpd.direccion = body.direccion_apoderado
  if (body.comuna_apoderado !== undefined) famUpd.comuna = body.comuna_apoderado
  if (body.nombre_apoderado !== undefined) famUpd.nombre_apoderado = body.nombre_apoderado
  if (body.apellido_apoderado !== undefined) famUpd.apellido_apoderado = body.apellido_apoderado
  if (body.rut_apoderado !== undefined) famUpd.rut = body.rut_apoderado
  if (body.email_apoderado !== undefined) famUpd.email = body.email_apoderado
  if (body.telefono_apoderado !== undefined) famUpd.telefono = body.telefono_apoderado
  if (Object.keys(famUpd).length > 0) {
    const familia = await familiaDeMatricula(admin, m)
    if (!familia) {
      advertencias.push('La matrícula no tiene una familia asociada: los datos del apoderado no se guardaron')
    } else {
      const { error } = await admin.from('familias').update(famUpd).eq('id', familia.id)
      if (error) advertencias.push(`Datos del apoderado no guardados: ${error.message}`)
      // Enlazar la familia a la matrícula para que lista, modal y contrato usen la misma
      if (!m.familia_id) {
        const { error: eLink } = await admin.from('matriculas').update({ familia_id: familia.id }).eq('id', id)
        if (eLink) advertencias.push(`No se pudo enlazar la familia a la matrícula: ${eLink.message}`)
      }
    }
  }

  // ── Alumno (datos que salen en el contrato) ──
  const alUpd: any = {}
  if (body.alumno_nombre !== undefined) alUpd.nombre = body.alumno_nombre
  if (body.alumno_apellido !== undefined) alUpd.apellido = body.alumno_apellido
  if (body.alumno_rut !== undefined) alUpd.rut = body.alumno_rut
  if (body.alumno_fecha_nacimiento !== undefined) alUpd.fecha_nacimiento = body.alumno_fecha_nacimiento || null
  if (Object.keys(alUpd).length > 0 && m.alumno_id) {
    const { error } = await admin.from('alumnos').update(alUpd).eq('id', m.alumno_id)
    if (error) advertencias.push(`Datos del alumno no guardados: ${error.message}`)
  }

  // ── Matrícula: columnas base ──
  const updates: any = {}
  if (body.monto_matricula !== undefined) updates.monto_matricula = Number(body.monto_matricula)
  if (body.monto_mensual !== undefined) updates.monto_mensual = Number(body.monto_mensual)
  if (body.observaciones !== undefined) updates.observaciones = body.observaciones
  if (body.estado !== undefined) updates.estado = body.estado
  if (body.medio_pago_matricula !== undefined) updates.medio_pago_matricula = body.medio_pago_matricula
  if (body.banco_cheque !== undefined) updates.banco_cheque = body.banco_cheque
  if (body.cheques !== undefined) updates.cheques = body.cheques

  let data: any = null
  if (Object.keys(updates).length > 0) {
    const r = await admin.from('matriculas').update(updates).eq('id', id).select('id').single()
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
    data = r.data
  }

  // ── Matrícula: columnas que dependen de migraciones (una por una, para saber cuál falla) ──
  const opcionales: [string, string, any][] = []
  if (body.fecha_inicio_contrato) opcionales.push(['fecha_inicio_contrato', 'fecha de inicio del contrato', body.fecha_inicio_contrato])
  if (body.porcentaje_beca !== undefined) opcionales.push(['porcentaje_beca', '% de beca', Math.max(0, Math.min(100, Number(body.porcentaje_beca) || 0))])
  if (body.anio_escolar !== undefined) opcionales.push(['anio_escolar', 'año escolar', Number(body.anio_escolar)])
  if (body.sede !== undefined) opcionales.push(['sede', 'sede', body.sede])
  // Duración del contrato (meses de cobro): la usa el contrato PDF. Cada contrato es caso a caso.
  if (body.meses_cobro !== undefined && Number(body.meses_cobro) > 0) opcionales.push(['duracion_contrato_meses', 'meses de cobro', Number(body.meses_cobro)])
  // Modalidad del contrato: 'completo' o 'hermanos_2x1' (matrícula exenta).
  if (body.modalidad_contrato !== undefined && ['completo', 'hermanos_2x1'].includes(body.modalidad_contrato)) opcionales.push(['modalidad_contrato', 'modalidad del contrato', body.modalidad_contrato])

  for (const [col, etiqueta, valor] of opcionales) {
    const { error } = await admin.from('matriculas').update({ [col]: valor }).eq('id', id)
    if (error) advertencias.push(`No se guardó ${etiqueta}: ${error.message}`)
  }

  return NextResponse.json({ ...(data ?? { id }), advertencias })
}
