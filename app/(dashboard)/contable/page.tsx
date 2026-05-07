export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ContableClient from '@/components/contable/ContableClient'
import type { KpiContable, MorosidadMes } from '@/types'
import { getMesNombre } from '@/lib/utils'

export const metadata = { title: 'Cobranzas — AR School' }

export default async function ContablePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: ur } = await supabase.from('usuarios').select('colegio_id').eq('id', user!.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''
  const ahora = new Date()
  const mes = ahora.getMonth() + 1
  const anio = ahora.getFullYear()

  const [{ data: cobros }, { data: planes }, { data: ultimosPagos }] = await Promise.all([
    supabase.from('cobros')
      .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
      .eq('colegio_id', colegioId).eq('mes', mes).eq('anio', anio)
      .order('fecha_vencimiento', { ascending: true }),
    supabase.from('planes_cobro').select('*').eq('colegio_id', colegioId).eq('activo', true).order('created_at'),
    supabase.from('pagos')
      .select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const kpis: KpiContable = { recaudado: 0, enMora: 0, moraCritica: 0, familiasAlDia: 0, totalFamilias: cobros?.length ?? 0, proyectado: 0 }
  cobros?.forEach((c: any) => {
    kpis.proyectado += c.monto
    if (c.estado === 'pagado')  { kpis.recaudado += c.monto; kpis.familiasAlDia++ }
    if (c.estado === 'mora')    { kpis.enMora += c.monto }
    if (c.estado === 'parcial') { kpis.recaudado += c.monto_pagado }
  })

  const { count: moraCritica } = await supabase.from('cobros')
    .select('familia_id', { count: 'exact', head: true })
    .eq('colegio_id', colegioId).eq('estado', 'mora').lt('mes', mes - 1)
  kpis.moraCritica = moraCritica ?? 0

  const historico: MorosidadMes[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    historico.push({ mes: getMesNombre(d.getMonth() + 1), porcentaje: 0, monto: 0 })
  }

  return (
    <ContableClient
      cobros={(cobros as any[]) ?? []}
      kpis={kpis} historico={historico}
      ultimosPagos={(ultimosPagos as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
      planes={(planes as any[]) ?? []}
      mes={mes} anio={anio}
    />
  )
}