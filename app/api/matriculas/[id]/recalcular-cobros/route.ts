import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolverArancel, mesesDesdeInicio } from '@/lib/aranceles'
import { idxMes, idxDeFecha, inicioMatricula, limiteSiguienteMatricula } from '@/lib/matriculaPeriodo'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Mapa código de programa -> id (para detectar el programa por id de la matrícula)
const PROGRAMA_ID_A_CODIGO: Record<string, string> = {
  'fc78e2d0-922b-41f9-b4db-267a9af68d72': 'ar_school',
  '30fc7885-7b68-49fd-a7d5-8585ef61d654': 'ar_worship',
  '45681f94-ff27-48dc-a926-ff8eb046c872': 'lions_soccer',
  '93fb9840-31a6-463a-8305-3a18d15b78cf': 'play_group',
}

// POST /api/matriculas/[id]/recalcular-cobros
// Elimina cobros pendientes y regenera con nuevos montos/fechas.
// Si no se pasan montos, los resuelve automáticamente según el programa.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  // Mismos roles que pueden editar la matrícula: el modal guarda y recalcula en un solo paso.
  // (Antes gestor_admision podía editar montos pero no recalcular, y el contrato quedaba desfasado.)
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const { monto_mensual, monto_matricula, fecha_inicio_contrato, proporcional_primer_mes = 0, meses_cobro, anio: anioManual } = body

  // Obtener matrícula
  const { data: matricula } = await admin.from('matriculas').select('*, alumno:alumnos(curso)').eq('id', id).single()
  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const mat = matricula as any
  const porcentaje_beca: number = Math.max(0, Math.min(100, Number(body.porcentaje_beca ?? mat.porcentaje_beca ?? 0) || 0))

  // Coordinador: solo puede recalcular matrículas de su programa y sede
  if (usuario.rol === 'coordinador') {
    const progOk = !usuario.programa_ids?.length || (mat.programa_id && usuario.programa_ids.includes(mat.programa_id))
    const sedes = [usuario.colegio_id, ...(usuario.sedes_ids || [])].filter(Boolean)
    const sedeOk = sedes.length === 0 || sedes.includes(mat.colegio_id)
    if (!progOk || !sedeOk) {
      return NextResponse.json({ error: 'Sin acceso a esta matrícula' }, { status: 403 })
    }
  }

  const colegioId = mat.colegio_id || usuario.colegio_id
  const alumnoId = mat.alumno_id
  const familiaId = mat.familia_id
  const curso = mat.alumno?.curso || ''
  const programaCodigo = mat.programa_id ? PROGRAMA_ID_A_CODIGO[mat.programa_id] : undefined

  // Resolver arancel automáticamente si no vienen montos en el body.
  // Esto permite "generar cobros faltantes" sin ingresar montos manualmente.
  const arancel = resolverArancel(programaCodigo, curso)
  const montoMensualBase = (monto_mensual != null && monto_mensual > 0)
    ? monto_mensual
    : (mat.monto_mensual && mat.monto_mensual > 0 ? mat.monto_mensual : arancel.montoMensual)
  const montoMatricula = (monto_matricula != null)
    ? monto_matricula
    : (mat.monto_matricula && mat.monto_matricula > 0 ? mat.monto_matricula : arancel.montoInicial)

  // Calcular montos con beca
  const montoMensFinal = porcentaje_beca > 0 ? Math.round(montoMensualBase * (1 - porcentaje_beca / 100)) : montoMensualBase

  // Fecha inicio
  const fechaInicio = fecha_inicio_contrato || mat.fecha_inicio_contrato || mat.fecha_matricula || new Date().toISOString().split('T')[0]
  const mesInicio = new Date(fechaInicio + 'T12:00').getMonth() + 1
  // Año: manual si el gestor lo indica (contratos que cruzan de año), si no el de la fecha de inicio.
  const anio = (anioManual && Number(anioManual) > 2000) ? Number(anioManual) : new Date(fechaInicio + 'T12:00').getFullYear()

  // Cantidad de meses: manual si el gestor lo indica (1..N libre), si no el cálculo por programa.
  // Esto permite contratos flexibles: 2 meses, 3, 4, 12, lo que decida admisión.
  const mesesGenerar = (meses_cobro != null && Number(meses_cobro) > 0)
    ? Number(meses_cobro)
    : mesesDesdeInicio(programaCodigo, curso, mesInicio)

  // ── Período de ESTA matrícula ──
  // Los cobros no guardan su matrícula, así que se acota por fechas: desde el inicio
  // (el anterior o el nuevo, el que sea antes) hasta la siguiente matrícula del alumno.
  const idxNuevo = idxMes(anio, mesInicio)
  const inicioAnterior = inicioMatricula(mat)
  const desdeIdx = Math.min(idxNuevo, inicioAnterior ? idxDeFecha(inicioAnterior) : idxNuevo)
  const hastaIdx = await limiteSiguienteMatricula(admin, mat, desdeIdx)
  const enPeriodo = (c: any) => { const i = idxMes(c.anio, c.mes); return i >= desdeIdx && i < hastaIdx }

  const { data: cobrosAlumno } = await admin
    .from('cobros')
    .select('id, mes, anio, estado, tipo_concepto')
    .eq('alumno_id', alumnoId)
  const delPeriodo = ((cobrosAlumno as any[]) ?? []).filter(enPeriodo)

  // Pendientes con pagos asociados (comprobante por validar, Webpay en curso) no se
  // borran: pagos.cobro_id tiene ON DELETE CASCADE y se perdería el pago.
  const pendientes = delPeriodo.filter(c => c.estado === 'pendiente')
  let conPago = new Set<string>()
  if (pendientes.length) {
    const { data: pagosLigados } = await admin.from('pagos').select('cobro_id').in('cobro_id', pendientes.map(c => c.id))
    conPago = new Set(((pagosLigados as any[]) ?? []).map(p => p.cobro_id))
  }
  const borrar = pendientes.filter(c => !conPago.has(c.id)).map(c => c.id)
  let countEliminados = 0
  if (borrar.length) {
    const { data: eliminados, error: eDel } = await admin.from('cobros').delete().in('id', borrar).select('id')
    if (eDel) return NextResponse.json({ error: `No se pudieron reemplazar los cobros: ${eDel.message}` }, { status: 500 })
    countEliminados = eliminados?.length ?? 0
  }

  // Meses ya ocupados (pagados, parciales, en mora o pendientes con pago en curso): no se regeneran,
  // para no duplicar cuotas en la cobranza ni en la tabla del contrato.
  const ocupado = (c: any) => ['pagado', 'parcial', 'mora'].includes(c.estado) || conPago.has(c.id)
  const mesesOcupados = new Set(delPeriodo.filter(c => c.tipo_concepto === 'aporte_mensual' && ocupado(c)).map(c => idxMes(c.anio, c.mes)))
  const inicialOcupado = delPeriodo.some(c => c.tipo_concepto === 'aporte_inicial' && ocupado(c))

  let cobrosGenerados = 0
  let omitidos = 0
  const erroresInsert: string[] = []

  // Aporte inicial
  if (montoMatricula > 0 && inicialOcupado) omitidos++
  if (montoMatricula > 0 && !inicialOcupado) {
    const baseInicial: any = {
      colegio_id: colegioId,
      familia_id: familiaId,
      alumno_id: alumnoId,
      monto: montoMatricula,
      mes: mesInicio,
      anio,
      fecha_vencimiento: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      tipo_concepto: 'aporte_inicial',
    }
    let insIni = await admin.from('cobros').insert({ ...baseInicial, observaciones: `Aporte inicial ${anio} · ${arancel.etiqueta}` })
    // La columna 'observaciones' puede no existir en esta instancia: reintentar sin ella.
    if (insIni.error && /observaciones/.test(insIni.error.message)) {
      insIni = await admin.from('cobros').insert(baseInicial)
    }
    if (insIni.error) erroresInsert.push(insIni.error.message)
    else cobrosGenerados++
  }

  // Cobros mensuales
  for (let i = 0; i < mesesGenerar; i++) {
    const mes = ((mesInicio - 1 + i) % 12) + 1
    // El año avanza cada vez que el índice absoluto de mes cruza diciembre.
    // Soporta contratos que pasan de un año a otro (Pre 12 meses) e incluso >12 meses.
    const anioC = anio + Math.floor((mesInicio - 1 + i) / 12)
    if (mesesOcupados.has(idxMes(anioC, mes))) { omitidos++; continue }
    const vencimiento = `${anioC}-${String(mes).padStart(2, '0')}-05`

    // Primer mes puede ser proporcional
    const montoCobro = (i === 0 && proporcional_primer_mes > 0) ? proporcional_primer_mes : montoMensFinal

    const baseMensual: any = {
      colegio_id: colegioId,
      familia_id: familiaId,
      alumno_id: alumnoId,
      monto: montoCobro,
      mes,
      anio: anioC,
      fecha_vencimiento: vencimiento,
      estado: 'pendiente',
      tipo_concepto: 'aporte_mensual',
    }
    let insMens = await admin.from('cobros').insert({ ...baseMensual, observaciones: `Aporte mensual ${mes}/${anioC}${porcentaje_beca > 0 ? ` (beca ${porcentaje_beca}%)` : ''}` })
    if (insMens.error && /observaciones/.test(insMens.error.message)) {
      insMens = await admin.from('cobros').insert(baseMensual)
    }
    if (insMens.error) erroresInsert.push(insMens.error.message)
    else cobrosGenerados++
  }

  // Persistir la duración usada, para que el contrato PDF y el modal muestren lo mismo.
  const { error: eDur } = await admin.from('matriculas').update({ duracion_contrato_meses: mesesGenerar }).eq('id', id)
  if (eDur) erroresInsert.push(`duración: ${eDur.message}`)

  return NextResponse.json({
    ok: true,
    eliminados: countEliminados,
    generados: cobrosGenerados,
    meses: mesesGenerar,
    arancel: arancel.etiqueta,
    monto_mensual: montoMensFinal,
    monto_inicial: montoMatricula,
    desde: `${mesInicio}/${anio}`,
    // Meses que ya estaban pagados/en mora/con pago en curso y no se duplicaron
    omitidos,
    errores: erroresInsert,
  })
}
