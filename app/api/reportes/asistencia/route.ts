import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMesNombre } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const { searchParams } = new URL(request.url)
  const mes = parseInt(searchParams.get('mes') ?? String(new Date().getMonth() + 1))
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()))

  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('colegio_id', colegioId)
    .gte('fecha', `${anio}-${String(mes).padStart(2, '0')}-01`)
    .lte('fecha', `${anio}-${String(mes).padStart(2, '0')}-31`)
    .order('fecha')

  const porAlumno: Record<string, { nombre: string; apellido: string; curso: string; total: number; presentes: number; ausentes: number; tardanzas: number; justificados: number }> = {}

  for (const a of asistencias ?? []) {
    const al = (a as any).alumno
    const key = al?.nombre + ' ' + al?.apellido
    if (!porAlumno[key]) {
      porAlumno[key] = { nombre: al?.nombre ?? '', apellido: al?.apellido ?? '', curso: al?.curso ?? '', total: 0, presentes: 0, ausentes: 0, tardanzas: 0, justificados: 0 }
    }
    porAlumno[key].total++
    if ((a as any).estado === 'presente')    porAlumno[key].presentes++
    if ((a as any).estado === 'ausente')     porAlumno[key].ausentes++
    if ((a as any).estado === 'tardanza')    porAlumno[key].tardanzas++
    if ((a as any).estado === 'justificado') porAlumno[key].justificados++
  }

  const rows = Object.values(porAlumno).sort((a, b) => a.curso.localeCompare(b.curso) || a.apellido.localeCompare(b.apellido))
  const headers = ['Apellido', 'Nombre', 'Curso', 'Días Registrados', 'Presentes', 'Ausentes', 'Tardanzas', 'Justificados', '% Asistencia']
  const data = rows.map(r => [
    r.apellido, r.nombre, r.curso, r.total, r.presentes, r.ausentes, r.tardanzas, r.justificados,
    r.total > 0 ? `${Math.round(r.presentes / r.total * 100)}%` : '—'
  ])

  const csv = '﻿' + [headers, ...data].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="asistencia_${getMesNombre(mes)}_${anio}.csv"`,
    },
  })
}
