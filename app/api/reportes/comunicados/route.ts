import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('titulo, tipo, enviado_at, cursos, comunicado_recepciones(estado, familia_id)')
    .eq('colegio_id', colegioId)
    .order('enviado_at', { ascending: false })

  const headers = ['Título', 'Tipo', 'Fecha Envío', 'Cursos', 'Total Destinatarios', 'Abiertos', 'Confirmados', '% Lectura']
  const rows = (comunicados ?? []).map((c: any) => {
    const recs = c.comunicado_recepciones ?? []
    const total = recs.length
    const abiertos = recs.filter((r: any) => r.estado === 'abierto' || r.estado === 'confirmado').length
    const confirmados = recs.filter((r: any) => r.estado === 'confirmado').length
    const pct = total > 0 ? `${Math.round(abiertos / total * 100)}%` : '—'
    return [
      c.titulo,
      c.tipo,
      c.enviado_at ? new Date(c.enviado_at).toLocaleDateString('es-CL') : 'Borrador',
      Array.isArray(c.cursos) ? c.cursos.join(', ') : 'Todos',
      total, abiertos, confirmados, pct,
    ]
  })

  const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="comunicados.csv"',
    },
  })
}
