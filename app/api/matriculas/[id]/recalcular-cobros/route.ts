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

// POST /api/matriculas/[id]/recalcular-cobros
// Elimina cobros pendientes y regenera con nuevos montos/fechas
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = params
  const body = await request.json()
  const { monto_mensual, monto_matricula, fecha_inicio_contrato, porcentaje_beca = 0, proporcional_primer_mes = 0 } = body

  // Obtener matrícula
  const { data: matricula } = await admin.from('matriculas').select('*, alumno:alumnos(curso)').eq('id', id).single()
  if (!matricula) return NextResponse.json({ error: 'Matrícula no encontrada' }, { status: 404 })
  const mat = matricula as any

  const colegioId = (ur as any).colegio_id
  const alumnoId = mat.alumno_id
  const familiaId = mat.familia_id

  // Determinar programa
  const cursoLower = (mat.alumno?.curso || '').toLowerCase()
  const esPreschool = cursoLower.includes('play') || cursoLower.includes('pre school') || cursoLower.includes('sala cuna')
  const esLions = cursoLower.includes('lions') || cursoLower.includes('soccer')

  // Calcular montos con beca
  const montoMensFinal = porcentaje_beca > 0 ? Math.round(monto_mensual * (1 - porcentaje_beca / 100)) : monto_mensual

  // Fecha inicio
  const fechaInicio = fecha_inicio_contrato || mat.fecha_inicio_contrato || mat.fecha_matricula || new Date().toISOString().split('T')[0]
  const mesInicio = new Date(fechaInicio + 'T12:00').getMonth() + 1
  const anio = new Date(fechaInicio + 'T12:00').getFullYear()

  // Eliminar cobros pendientes (no pagados)
  const { data: eliminados } = await admin
    .from('cobros')
    .delete()
    .eq('alumno_id', alumnoId)
    .in('estado', ['pendiente'])
    .select('id')

  const countEliminados = eliminados?.length ?? 0

  // Regenerar cobros
  const mesesGenerar = esPreschool ? 12 : esLions ? Math.max(1, 13 - mesInicio) : Math.max(1, 12 - mesInicio + 1)
  let cobrosGenerados = 0

  // Aporte inicial
  if (monto_matricula > 0) {
    await admin.from('cobros').insert({
      colegio_id: colegioId,
      familia_id: familiaId,
      alumno_id: alumnoId,
      monto: monto_matricula,
      mes: mesInicio,
      anio,
      fecha_vencimiento: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      tipo_concepto: 'aporte_inicial',
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
    })
    cobrosGenerados++
  }

  return NextResponse.json({
    ok: true,
    eliminados: countEliminados,
    generados: cobrosGenerados,
    meses: mesesGenerar,
    desde: `${mesInicio}/${anio}`,
  })
}
