export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getMesNombre } from '@/lib/utils'
import ReportesClient from '@/components/reportes/ReportesClient'

export const metadata = { title: 'Reportes — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ReportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const ahora = new Date()
  const mes  = ahora.getMonth() + 1
  const anio = ahora.getFullYear()

  const [
    { count: totalAlumnos },
    { count: totalEvaluaciones },
    { count: totalCobros },
    { count: totalComunicados },
    { data: alumnos },
    { data: asistenciasHoy },
    { data: calificaciones },
    { data: cobrosDelMes },
    { data: mesesDisponibles },
  ] = await Promise.all([
    admin.from('alumnos').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('activo', true),
    admin.from('evaluaciones').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    admin.from('cobros').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    admin.from('comunicados').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    admin.from('alumnos').select('id, curso').eq('colegio_id', colegioId).eq('activo', true),
    admin.from('asistencias').select('estado, alumno_id').eq('colegio_id', colegioId).gte('fecha', `${anio}-${String(mes).padStart(2,'0')}-01`).lte('fecha', `${anio}-${String(mes).padStart(2,'0')}-31`),
    admin.from('calificaciones').select('nota, evaluacion:evaluaciones(colegio_id)').eq('evaluaciones.colegio_id', colegioId),
    admin.from('cobros').select('estado, monto, monto_pagado').eq('colegio_id', colegioId).eq('mes', mes).eq('anio', anio),
    admin.from('cobros').select('mes, anio').eq('colegio_id', colegioId).order('anio', { ascending: false }).order('mes', { ascending: false }),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  // Asistencia global del mes
  const totalAsist = (asistenciasHoy ?? []).length
  const presentes = (asistenciasHoy ?? []).filter((a: any) => a.estado === 'presente').length
  const pctAsistenciaGlobal = totalAsist > 0 ? Math.round(presentes / totalAsist * 100) : null

  // Promedio general de calificaciones
  const notasValidas = (calificaciones ?? []).map((c: any) => c.nota).filter((n: any) => n != null && !isNaN(n))
  const promedioGeneral = notasValidas.length > 0
    ? notasValidas.reduce((a: number, b: number) => a + b, 0) / notasValidas.length
    : null

  // Recaudación del mes
  const recaudadoMes = (cobrosDelMes ?? []).filter((c: any) => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0)
  const moraMes = (cobrosDelMes ?? []).filter((c: any) => ['mora','parcial','pendiente'].includes(c.estado)).reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)

  // Resumen por curso
  const resumenPorCurso = cursos.map(curso => {
    const alumnosCurso = (alumnos ?? []).filter((a: any) => a.curso === curso)
    const alumnoIds = alumnosCurso.map((a: any) => a.id)
    const asistCurso = (asistenciasHoy ?? []).filter((a: any) => alumnoIds.includes(a.alumno_id))
    const pct = asistCurso.length > 0
      ? Math.round(asistCurso.filter((a: any) => a.estado === 'presente').length / asistCurso.length * 100)
      : null
    return { curso, alumnos: alumnosCurso.length, pctAsistencia: pct, promedio: null as number | null }
  })

  // Meses únicos para el selector
  const mesesUnicos = [...new Map((mesesDisponibles ?? []).map((m: any) => [`${m.anio}-${m.mes}`, m])).values()]
  const mesesOpts = mesesUnicos.map((m: any) => ({
    mes: m.mes, anio: m.anio,
    label: `${getMesNombre(m.mes)} ${m.anio}`
  }))
  // Asegurar que el mes actual siempre aparezca
  if (!mesesOpts.find(m => m.mes === mes && m.anio === anio)) {
    mesesOpts.unshift({ mes, anio, label: `${getMesNombre(mes)} ${anio}` })
  }

  return (
    <ReportesClient
      stats={{
        totalAlumnos: totalAlumnos ?? 0,
        totalEvaluaciones: totalEvaluaciones ?? 0,
        totalCobros: totalCobros ?? 0,
        totalComunicados: totalComunicados ?? 0,
        pctAsistenciaGlobal,
        promedioGeneral,
        recaudadoMes,
        moraMes,
      }}
      cursos={cursos}
      meses={mesesOpts}
      mesActual={{ mes, anio }}
      resumenPorCurso={resumenPorCurso}
    />
  )
}
