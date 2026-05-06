import { createClient } from '@/lib/supabase/server'
import ContableClient from '@/components/contable/ContableClient'
import type { KpiContable, MorosidadMes } from '@/types'
import { getMesNombre } from '@/lib/utils'

export const metadata = { title: 'Solución Contable — Folio Verde' }

export default async function ContablePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('colegio_id')
    .eq('id', user!.id)
    .single()

  const colegioId = (usuarioRaw as { colegio_id: string } | null)?.colegio_id ?? ''

  const ahora = new Date()
  const mes = ahora.getMonth() + 1
  const anio = ahora.getFullYear()

  // Cobros del mes actual
  const { data: cobros } = await supabase
    .from('cobros')
    .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
    .eq('colegio_id', colegioId)
    .eq('mes', mes)
    .eq('anio', anio)
    .order('fecha_vencimiento', { ascending: true })

  // KPIs
  const kpis: KpiContable = {
    recaudado: 0, enMora: 0, moraCritica: 0,
    familiasAlDia: 0, totalFamilias: cobros?.length ?? 0, proyectado: 0,
  }
  cobros?.forEach((c: any) => {
    kpis.proyectado += c.monto
    if (c.estado === 'pagado') { kpis.recaudado += c.monto; kpis.familiasAlDia++ }
    if (c.estado === 'mora')   { kpis.enMora += c.monto }
    if (c.estado === 'parcial'){ kpis.recaudado += c.monto_pagado }
  })

  // Morosidad crítica (2+ meses)
  const { count: moraCritica } = await supabase
    .from('cobros')
    .select('familia_id', { count: 'exact', head: true })
    .eq('colegio_id', colegioId)
    .eq('estado', 'mora')
    .lt('mes', mes - 1)

  kpis.moraCritica = moraCritica ?? 0

  // Historial morosidad (últimos 6 meses)
  const historico: MorosidadMes[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    historico.push({ mes: getMesNombre(d.getMonth() + 1), porcentaje: 0, monto: 0 })
  }

  // Últimos pagos
  const { data: ultimosPagos } = await supabase
    .from('pagos')
    .select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <ContableClient
      cobros={(cobros as any[]) ?? []}
      kpis={kpis}
      historico={historico}
      ultimosPagos={(ultimosPagos as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
    />
  )
}