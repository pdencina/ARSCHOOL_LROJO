import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const { searchParams } = new URL(request.url)
  const mesParam = searchParams.get('mes')
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()))

  // Si viene 'mes' se exporta ese mes; si no, se exporta el año completo.
  let query = supabase
    .from('cobros')
    .select('*, familia:familias(nombre_apoderado, apellido_apoderado, email, alumno:alumnos(nombre, apellido, curso)), concepto:conceptos_cobro(nombre)')
    .eq('colegio_id', colegioId).eq('anio', anio)
  if (mesParam) query = query.eq('mes', parseInt(mesParam))
  const { data: cobros } = await query.order('mes').order('estado')

  const headers = ['Familia','Alumno','Curso','Concepto','Monto','Monto Pagado','Vencimiento','Estado','Email']
  const rows = (cobros ?? []).map((c: any) => [
    `${c.familia?.nombre_apoderado ?? ''} ${c.familia?.apellido_apoderado ?? ''}`.trim(),
    `${c.familia?.alumno?.nombre ?? ''} ${c.familia?.alumno?.apellido ?? ''}`.trim(),
    c.familia?.alumno?.curso ?? '',
    c.concepto?.nombre ?? 'Mensualidad',
    c.monto, c.monto_pagado, c.fecha_vencimiento, c.estado,
    c.familia?.email ?? '',
  ])
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cobros_${mes}_${anio}.csv"`,
    },
  })
}