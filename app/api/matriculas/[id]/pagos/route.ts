import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { autorizarMatricula } from '@/lib/matriculaAcceso'
import { idxMes, idxDeFecha, inicioMatricula, limiteSiguienteMatricula } from '@/lib/matriculaPeriodo'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const BUCKET = 'comprobantes'
// Vercel limita el cuerpo de la petición a ~4,5 MB
const MAX_BYTES = 4 * 1024 * 1024
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
// Deben coincidir con el CHECK de cobros.medio_pago
const MEDIOS_OK = ['transferencia', 'efectivo', 'cheque', 'webpay', 'app']

/**
 * Cuotas del contrato de una matrícula: los cobros del alumno dentro del período
 * de la matrícula (misma regla que el contrato), sin anulados.
 */
async function cuotasDelContrato(admin: any, mat: any) {
  const ini = inicioMatricula(mat)
  const desdeIdx = ini ? idxDeFecha(ini) : -Infinity
  const hastaIdx = await limiteSiguienteMatricula(admin, mat, desdeIdx === -Infinity ? 0 : desdeIdx)
  const { data } = await admin
    .from('cobros')
    .select('id, mes, anio, monto, monto_pagado, estado, tipo_concepto, fecha_vencimiento, fecha_pago, medio_pago, colegio_id')
    .eq('alumno_id', mat.alumno_id)
  return ((data as any[]) ?? [])
    .filter(c => c.estado !== 'anulado')
    .filter(c => { const i = idxMes(c.anio, c.mes); return i >= desdeIdx && i < hastaIdx })
    .sort((a, b) => {
      // Aporte inicial primero, luego por mes
      const ai = a.tipo_concepto === 'aporte_inicial' ? 0 : 1
      const bi = b.tipo_concepto === 'aporte_inicial' ? 0 : 1
      return (ai - bi) || (idxMes(a.anio, a.mes) - idxMes(b.anio, b.mes))
    })
}

async function cargarMatricula(admin: any, id: string) {
  const { data } = await admin
    .from('matriculas')
    .select('id, alumno_id, familia_id, colegio_id, programa_id, anio_escolar, fecha_matricula, fecha_inicio_contrato, duracion_contrato_meses, monto_matricula, monto_mensual, modalidad_contrato, created_at, alumno:alumnos(nombre, apellido, curso), programa:programas(codigo, nombre)')
    .eq('id', id)
    .single()
  return data as any
}

// GET /api/matriculas/[id]/pagos — Cuotas del contrato con sus pagos y comprobantes
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const mat = await cargarMatricula(admin, params.id)
  if (!mat) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })

  const cuotas = await cuotasDelContrato(admin, mat)
  const ids = cuotas.map(c => c.id)

  // Pagos (sin la imagen base64: solo si tiene) y comprobantes adjuntados por el equipo
  let pagos: any[] = []
  let comprobantes: any[] = []
  const advertencias: string[] = []
  if (ids.length) {
    let rp: any = await admin.from('pagos').select('id, cobro_id, monto, medio_pago, estado, created_at, registrado_por, tiene_comprobante').in('cobro_id', ids).order('created_at')
    if (rp.error && /tiene_comprobante/.test(rp.error.message)) {
      rp = await admin.from('pagos').select('id, cobro_id, monto, medio_pago, estado, created_at, registrado_por').in('cobro_id', ids).order('created_at')
    }
    pagos = (rp.data as any[]) ?? []
    const rc = await admin.from('cobro_comprobantes')
      .select('id, cobro_id, pago_id, nombre_archivo, tipo_mime, monto, medio_pago, fecha_pago, nota, subido_por, created_at')
      .in('cobro_id', ids).order('created_at')
    if (rc.error) advertencias.push('Falta ejecutar la migración 058 (comprobantes de pago): aún no se pueden adjuntar vouchers.')
    comprobantes = (rc.data as any[]) ?? []
  }

  // Nombres de quienes registraron/subieron
  const userIds = Array.from(new Set([...pagos.map(p => p.registrado_por), ...comprobantes.map(c => c.subido_por)].filter(Boolean)))
  const nombres: Record<string, string> = {}
  if (userIds.length) {
    const { data: us } = await admin.from('usuarios').select('id, nombre, apellido, rol').in('id', userIds)
    for (const u of (us as any[]) ?? []) nombres[u.id] = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() + (u.rol === 'apoderado' ? ' (apoderado)' : '')
  }

  const mensuales = cuotas.filter(c => c.tipo_concepto === 'aporte_mensual')
  const duracion = Number(mat.duracion_contrato_meses) || 0
  if (duracion > 0 && mensuales.length !== duracion) {
    advertencias.push(`El contrato indica ${duracion} cuotas mensuales pero hay ${mensuales.length} generadas. Revisa la matrícula (Editar matrícula → Guardar y recalcular).`)
  }

  const saldo = (c: any) => Math.max(0, (c.monto ?? 0) - (c.monto_pagado ?? 0))
  return NextResponse.json({
    matricula: {
      id: mat.id,
      alumno: mat.alumno,
      programa: mat.programa,
      anio_escolar: mat.anio_escolar,
      fecha_inicio: inicioMatricula(mat),
      duracion_contrato_meses: duracion || null,
      monto_mensual: mat.monto_mensual,
      monto_matricula: mat.monto_matricula,
    },
    cuotas: cuotas.map(c => ({
      ...c,
      saldo: saldo(c),
      pagos: pagos.filter(p => p.cobro_id === c.id).map(p => ({ ...p, registrado_por_nombre: nombres[p.registrado_por] ?? null })),
      comprobantes: comprobantes.filter(v => v.cobro_id === c.id).map(v => ({ ...v, subido_por_nombre: nombres[v.subido_por] ?? null })),
    })),
    resumen: {
      total: cuotas.reduce((s, c) => s + (c.monto ?? 0), 0),
      pagado: cuotas.reduce((s, c) => s + Math.min(c.monto ?? 0, c.monto_pagado ?? 0), 0),
      pendiente: cuotas.reduce((s, c) => s + saldo(c), 0),
      cuotas_mensuales: mensuales.length,
      cuotas_pagadas: mensuales.filter(c => saldo(c) === 0).length,
      sin_comprobante: cuotas.filter(c => (c.monto_pagado ?? 0) > 0
        && !comprobantes.some(v => v.cobro_id === c.id)
        && !pagos.some(p => p.cobro_id === c.id && p.tiene_comprobante)).length,
    },
    advertencias,
  })
}

// POST /api/matriculas/[id]/pagos — Adjuntar voucher a una cuota (multipart/form-data)
// Campos: cobro_id, archivo, registrar_pago ('1' = además registra el pago), monto, medio_pago, fecha_pago, nota
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let form: FormData
  try { form = await request.formData() } catch {
    return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 4 MB). Sube una foto o captura del comprobante.' }, { status: 413 })
  }
  const cobroId = String(form.get('cobro_id') || '')
  const archivo = form.get('archivo') as File | null
  const registrarPago = form.get('registrar_pago') === '1'
  const medio = String(form.get('medio_pago') || 'transferencia')
  const fechaPago = String(form.get('fecha_pago') || '') || new Date().toISOString().slice(0, 10)
  const nota = String(form.get('nota') || '').trim() || null
  const monto = Math.round(Number(form.get('monto') || 0))

  if (!cobroId) return NextResponse.json({ error: 'Falta la cuota' }, { status: 400 })
  if (!archivo || typeof archivo === 'string' || archivo.size === 0) return NextResponse.json({ error: 'Adjunta el comprobante' }, { status: 400 })
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera 4 MB. Sube una foto o captura del comprobante.' }, { status: 413 })
  if (archivo.type && !TIPOS_OK.includes(archivo.type)) return NextResponse.json({ error: 'Formato no permitido. Usa imagen (JPG, PNG, WEBP, HEIC) o PDF.' }, { status: 400 })
  if (!MEDIOS_OK.includes(medio)) return NextResponse.json({ error: 'Medio de pago no válido' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) return NextResponse.json({ error: 'Fecha de pago no válida' }, { status: 400 })

  // La cuota debe pertenecer al contrato de esta matrícula
  const mat = await cargarMatricula(admin, params.id)
  if (!mat) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const cuotas = await cuotasDelContrato(admin, mat)
  const cuota = cuotas.find(c => c.id === cobroId)
  if (!cuota) return NextResponse.json({ error: 'La cuota no pertenece a este contrato' }, { status: 400 })

  const saldo = Math.max(0, (cuota.monto ?? 0) - (cuota.monto_pagado ?? 0))
  if (registrarPago) {
    if (saldo === 0) return NextResponse.json({ error: 'La cuota ya está pagada. Adjunta el voucher como respaldo, sin registrar pago.' }, { status: 400 })
    if (!(monto > 0)) return NextResponse.json({ error: 'Indica el monto pagado' }, { status: 400 })
    if (monto > saldo) return NextResponse.json({ error: `El monto supera el saldo de la cuota ($${saldo.toLocaleString('es-CL')})` }, { status: 400 })
  }

  // 1) Subir archivo al bucket privado
  const ext = (archivo.name.split('.').pop() || (archivo.type === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${mat.colegio_id ?? 'sin-sede'}/${mat.alumno_id}/${cobroId}/${Date.now()}.${ext || 'bin'}`
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const up = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: archivo.type || 'application/octet-stream', upsert: false })
  if (up.error) {
    const msg = /bucket/i.test(up.error.message) ? 'Falta ejecutar la migración 058 (bucket de comprobantes)' : up.error.message
    return NextResponse.json({ error: `No se pudo subir el archivo: ${msg}` }, { status: 500 })
  }
  const limpiarArchivo = () => admin.storage.from(BUCKET).remove([path]).then(() => {}, () => {})

  // 2) Registrar el pago (opcional): confirmado de inmediato, lo registra el equipo
  let pagoId: string | null = null
  if (registrarPago) {
    const { data: pago, error: ePago } = await admin.from('pagos').insert({
      cobro_id: cobroId,
      monto,
      medio_pago: medio,
      referencia: nota,
      estado: 'confirmado',
      registrado_por: user.id,
      metadata: { comprobante_path: path, fecha_pago: fechaPago, origen: 'voucher_equipo' },
    }).select('id').single()
    if (ePago || !pago) {
      await limpiarArchivo()
      return NextResponse.json({ error: `No se pudo registrar el pago: ${ePago?.message ?? 'error desconocido'}` }, { status: 500 })
    }
    pagoId = (pago as any).id

    const nuevoPagado = (cuota.monto_pagado ?? 0) + monto
    const nuevoEstado = nuevoPagado >= cuota.monto ? 'pagado' : 'parcial'
    const { error: eCobro } = await admin.from('cobros').update({
      monto_pagado: nuevoPagado,
      estado: nuevoEstado,
      medio_pago: medio,
      fecha_pago: nuevoEstado === 'pagado' ? fechaPago : null,
    }).eq('id', cobroId)
    if (eCobro) {
      await admin.from('pagos').delete().eq('id', pagoId)
      await limpiarArchivo()
      return NextResponse.json({ error: `No se pudo actualizar la cuota: ${eCobro.message}` }, { status: 500 })
    }
  }

  // 3) Registro del comprobante
  const { data: comp, error: eComp } = await admin.from('cobro_comprobantes').insert({
    cobro_id: cobroId,
    pago_id: pagoId,
    colegio_id: mat.colegio_id,
    alumno_id: mat.alumno_id,
    archivo_path: path,
    nombre_archivo: archivo.name?.slice(0, 200) || null,
    tipo_mime: archivo.type || null,
    monto: registrarPago ? monto : (monto > 0 ? monto : null),
    medio_pago: medio,
    fecha_pago: fechaPago,
    nota,
    subido_por: user.id,
  }).select('id').single()
  if (eComp) {
    // Si el pago ya quedó registrado se mantiene (el dinero entró); solo se informa.
    if (!pagoId) await limpiarArchivo()
    const msg = /cobro_comprobantes/.test(eComp.message) ? 'Falta ejecutar la migración 058 (comprobantes de pago)' : eComp.message
    return NextResponse.json({ error: pagoId ? `El pago se registró, pero el voucher no quedó asociado: ${msg}` : msg }, { status: 500 })
  }

  return NextResponse.json({ ok: true, comprobante_id: (comp as any).id, pago_id: pagoId })
}

// DELETE /api/matriculas/[id]/pagos?comprobante=<id> — Quitar un voucher adjuntado por error.
// No anula el pago registrado (eso se hace aparte); solo el archivo de respaldo.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const auth = await autorizarMatricula(admin, user.id, params.id)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const compId = new URL(request.url).searchParams.get('comprobante')
  if (!compId) return NextResponse.json({ error: 'Falta el comprobante' }, { status: 400 })

  const mat = await cargarMatricula(admin, params.id)
  const { data: comp } = await admin.from('cobro_comprobantes').select('id, archivo_path, alumno_id, subido_por').eq('id', compId).maybeSingle()
  const c = comp as any
  if (!c || !mat || c.alumno_id !== mat.alumno_id) return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })

  // Solo quien lo subió o administración de la sede
  const esAdmin = ['super_admin', 'admin', 'pastor_campus'].includes(auth.usuario.rol)
  if (!esAdmin && c.subido_por !== user.id) return NextResponse.json({ error: 'Solo quien lo subió o administración puede quitarlo' }, { status: 403 })

  const { error } = await admin.from('cobro_comprobantes').delete().eq('id', compId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await admin.storage.from(BUCKET).remove([c.archivo_path]).then(() => {}, () => {})
  return NextResponse.json({ ok: true })
}
