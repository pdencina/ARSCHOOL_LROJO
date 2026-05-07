import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const mes = new Date().getMonth() + 1
  const anio = new Date().getFullYear()

  const { data: cobros } = await supabase
    .from('cobros')
    .select('*, familia:familias(nombre_apoderado, apellido_apoderado), concepto:conceptos_cobro(nombre)')
    .eq('colegio_id', colegioId)
    .in('estado', ['mora','pendiente','parcial'])
    .eq('mes', mes).eq('anio', anio)

  if (!cobros?.length) return NextResponse.json({ message: 'No hay cobros pendientes', count: 0 })

  const comunicados = cobros.map((c: any) => ({
    colegio_id: colegioId,
    titulo: `Aviso de cobro — ${c.concepto?.nombre ?? 'Mensualidad'} ${mes}/${anio}`,
    contenido: `Estimada familia ${c.familia?.apellido_apoderado}, tiene un pago pendiente de $${c.monto.toLocaleString('es-CL')} con vencimiento ${new Date(c.fecha_vencimiento).toLocaleDateString('es-CL')}. Por favor regularice su situación a la brevedad.`,
    tipo: 'cobro',
    enviado_at: new Date().toISOString(),
  }))

  await supabase.from('comunicados').insert(comunicados)
  return NextResponse.json({ message: `Avisos enviados a ${cobros.length} familias`, count: cobros.length })
}