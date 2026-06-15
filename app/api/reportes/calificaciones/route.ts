import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const { searchParams } = new URL(request.url)
  const curso = searchParams.get('curso') ?? ''

  let query = supabase
    .from('calificaciones')
    .select('nota, alumno:alumnos(nombre, apellido, curso), evaluacion:evaluaciones(nombre, materia, fecha, curso)')
    .eq('colegio_id_via_evaluacion', colegioId)

  const { data: evals } = await supabase
    .from('evaluaciones')
    .select('id, nombre, materia, fecha, curso, calificaciones(nota, alumno_id, alumno:alumnos(nombre, apellido, curso))')
    .eq('colegio_id', colegioId)
    .order('fecha', { ascending: false })

  const evalsFiltered = curso ? (evals ?? []).filter((e: any) => e.curso === curso) : (evals ?? [])

  const headers = ['Evaluación', 'Materia', 'Curso', 'Fecha', 'Apellido', 'Nombre', 'Nota', 'Estado']
  const rows: any[][] = []

  for (const ev of evalsFiltered as any[]) {
    for (const cal of ev.calificaciones ?? []) {
      rows.push([
        ev.nombre,
        ev.materia,
        ev.curso,
        ev.fecha ? new Date(ev.fecha + 'T12:00').toLocaleDateString('es-CL') : '',
        cal.alumno?.apellido ?? '',
        cal.alumno?.nombre ?? '',
        cal.nota ?? '',
        cal.nota != null ? (cal.nota >= 4 ? 'Aprobado' : 'Reprobado') : '',
      ])
    }
  }

  rows.sort((a, b) => a[2].localeCompare(b[2]) || a[1].localeCompare(b[1]) || a[4].localeCompare(b[4]))

  const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const label = curso ? `_${curso.replace(/[°\s]/g, '')}` : ''
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="calificaciones${label}.csv"`,
    },
  })
}
