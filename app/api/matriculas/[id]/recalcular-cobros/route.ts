import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolverArancel, mesesDesdeInicio } from '@/lib/aranceles'

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
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params
  const body = await request.json().catch(() => ({}))
  const { monto_mensual, monto_matricula, fecha_inicio_contrato, porcentaje_beca = 0, proporcional_primer_mes = 0 } = body

  // Obtener matrícula
  const { data: matricula } = await admin.from('matriculas').select('*, alumno:alumnos(curso)').eq('id', id).single()
  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const mat = matricula as any

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
  const anio = new Date(fechaInicio + 'T12:00').getFullYear()

  // Eliminar cobros pendientes (no pagados). Los pagados NUNCA se tocan.
  const { data: eliminados } = await admin
    .from('cobros')
    .delete()
    .eq('alumno_id', alumnoId)
    .in('estado', ['pendiente'])
    .select('id')

  const countEliminados = eliminados?.length ?? 0

  // Regenerar cobros: cantidad de meses según el programa
  const mesesGenerar = mesesDesdeInicio(programaCodigo, curso, mesInicio)
  let cobrosGenerados = 0

  // Aporte inicial
  if (montoMatricula > 0) {
    await admin.from('cobros').insert({
      colegio_id: colegioId,
      familia_id: familiaId,
      alumno_id: alumnoId,
      monto: montoMatricula,
      mes: mesInicio,
      anio,
      fecha_vencimiento: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      tipo_concepto: 'aporte_inicial',
      observaciones: `Aporte inicial ${anio} · ${arancel.etiqueta}`,
    })
    cobrosGenerados++
  }

  // Cobros mensuales
  for (let i = 0; i < mesesGenerar; i++) {
    const mes = ((mesInicio - 1 + i) % 12) + 1
    const anioC = (mesInicio - 1 + i) >= 12 ? anio + 1 : anio
    const vencimiento = `${anioC}-${String(mes).padStart(2, '0')}-05`

    // Primer mes puede ser proporcional
    const montoCobro = (i === 0 && proporcional_primer_mes > 0) ? proporcional_primer_mes : montoMensFinal

    await admin.from('cobros').insert({
      colegio_id: colegioId,
      familia_id: familiaId,
      alumno_id: alumnoId,
      monto: montoCobro,
      mes,
      anio: anioC,
      fecha_vencimiento: vencimiento,
      estado: 'pendiente',
      tipo_concepto: 'aporte_mensual',
      observaciones: `Aporte mensual ${mes}/${anioC}${porcentaje_beca > 0 ? ` (beca ${porcentaje_beca}%)` : ''}`,
    })
    cobrosGenerados++
  }

  return NextResponse.json({
    ok: true,
    eliminados: countEliminados,
    generados: cobrosGenerados,
    meses: mesesGenerar,
    arancel: arancel.etiqueta,
    monto_mensual: montoMensFinal,
    monto_inicial: montoMatricula,
    desde: `${mesInicio}/${anio}`,
  })
}
