export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ContableClient from '@/components/contable/ContableClient'
import type { KpiContable, MorosidadMes } from '@/types'
import { getMesNombre } from '@/lib/utils'

export const metadata = { title: 'Cobranzas — AR School' }

export default async function ContablePage({
  searchParams,
}: {
  searchParams: { mes?: string; anio?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  // Detectar el mes/año con datos más recientes si no viene en params
  let mes: number
  let anio: number

  if (searchParams.mes && searchParams.anio) {
    mes = parseInt(searchParams.mes)
    anio = parseInt(searchParams.anio)
  } else {
    // Buscar el mes más reciente con cobros
    const { data: ultimo } = await supabase
      .from('cobros')
      .select('mes, anio')
      .eq('colegio_id', colegioId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(1)
      .single()

    if (ultimo) {
      mes = (ultimo as any).mes
      anio = (ultimo as any).anio
    } else {
      const ahora = new Date()
      mes = ahora.getMonth() + 1
      anio = ahora.getFullYear()
    }
  }

  const [{ data: cobros }, { data: planes }, { data: ultimosPagos }] = await Promise.all([
    supabase.from('cobros')
      .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
      .eq('colegio_id', colegioId)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('estado')
      .order('fecha_vencimiento'),
    supabase.from('planes_cobro')
      .select('*')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .order('created_at'),
    supabase.from('pagos')
      .select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // KPIs del mes seleccionado
  const kpis: KpiContable = {
    recaudado: 0, enMora: 0, moraCritica: 0,
    familiasAlDia: 0, totalFamilias: cobros?.length ?? 0, proyectado: 0,
  }
  cobros?.forEach((c: any) => {
    kpis.proyectado += c.monto
    if (c.estado === 'pagado')   { kpis.recaudado += c.monto; kpis.familiasAlDia++ }
    if (c.estado === 'mora')     { kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'parcial')  { kpis.recaudado += c.monto_pagado; kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'pendiente'){ kpis.enMora += c.monto }
  })

  // Mora crítica: familias con mora en MÁS de un mes
  const { data: todasMoras } = await supabase
    .from('cobros')
    .select('familia_id')
    .eq('colegio_id', colegioId)
    .eq('estado', 'mora')

  const conteoMoraFamilias: Record<string, number> = {}
  ;(todasMoras ?? []).forEach((c: any) => {
    conteoMoraFamilias[c.familia_id] = (conteoMoraFamilias[c.familia_id] ?? 0) + 1
  })
  kpis.moraCritica = Object.values(conteoMoraFamilias).filter(v => v >= 2).length

  // Histórico real de los últimos 6 meses
  const historico: MorosidadMes[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    const m = d.getMonth() + 1
    const a = d.getFullYear()
    const { data: cobrosHist } = await supabase
      .from('cobros')
      .select('estado, monto')
      .eq('colegio_id', colegioId)
      .eq('mes', m)
      .eq('anio', a)
    const mora = (cobrosHist ?? []).filter((c: any) => c.estado === 'mora').length
    const total = (cobrosHist ?? []).length
    historico.push({
      mes: getMesNombre(m).slice(0, 3),
      porcentaje: total > 0 ? Math.round(mora / total * 100) : 0,
      monto: (cobrosHist ?? []).filter((c: any) => ['mora','parcial','pendiente'].includes(c.estado)).reduce((a: number, c: any) => a + c.monto, 0),
    })
  }

  // Lista de meses disponibles para el selector
  const { data: mesesDisponibles } = await supabase
    .from('cobros')
    .select('mes, anio')
    .eq('colegio_id', colegioId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })

  const mesesUnicos = [...new Map(
    (mesesDisponibles ?? []).map((c: any) => [`${c.anio}-${c.mes}`, { mes: c.mes, anio: c.anio }])
  ).values()].slice(0, 12)

  return (
    <ContableClient
      cobros={(cobros as any[]) ?? []}
      kpis={kpis}
      historico={historico}
      ultimosPagos={(ultimosPagos as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
      planes={(planes as any[]) ?? []}
      mes={mes}
      anio={anio}
      mesesDisponibles={mesesUnicos}
    />
  )
}