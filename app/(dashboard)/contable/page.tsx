export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContableClient from '@/components/contable/ContableClient'
import type { KpiContable, MorosidadMes } from '@/types'
import { getMesNombre } from '@/lib/utils'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ContablePage({ searchParams }: { searchParams: { mes?: string; anio?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id').eq('id', user.id).single()
  const colegioId = (ur as any)?.colegio_id ?? ''

  // Auto-detectar mes más reciente con datos
  let mes: number, anio: number
  if (searchParams.mes && searchParams.anio) {
    mes = parseInt(searchParams.mes); anio = parseInt(searchParams.anio)
  } else {
    const { data: ultimo } = await admin.from('cobros').select('mes, anio')
      .eq('colegio_id', colegioId)
      .order('anio', { ascending: false }).order('mes', { ascending: false })
      .limit(1).single()
    mes  = ultimo ? (ultimo as any).mes  : new Date().getMonth() + 1
    anio = ultimo ? (ultimo as any).anio : new Date().getFullYear()
  }

  const [{ data: cobros }, { data: planes }, { data: ultimosPagos }] = await Promise.all([
    admin.from('cobros')
      .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
      .eq('colegio_id', colegioId).eq('mes', mes).eq('anio', anio)
      .order('estado'),
    admin.from('planes_cobro').select('*').eq('colegio_id', colegioId).eq('activo', true),
    admin.from('pagos').select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
      .order('created_at', { ascending: false }).limit(8),
  ])

  const kpis: KpiContable = { recaudado: 0, enMora: 0, moraCritica: 0, familiasAlDia: 0, totalFamilias: cobros?.length ?? 0, proyectado: 0 }
  cobros?.forEach((c: any) => {
    kpis.proyectado += c.monto
    if (c.estado === 'pagado')  { kpis.recaudado += c.monto; kpis.familiasAlDia++ }
    if (c.estado === 'mora')    { kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'parcial') { kpis.recaudado += c.monto_pagado; kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'pendiente') { kpis.enMora += c.monto }
  })

  const { data: todasMoras } = await admin.from('cobros').select('familia_id').eq('colegio_id', colegioId).eq('estado', 'mora')
  const conteo: Record<string, number> = {}
  ;(todasMoras ?? []).forEach((c: any) => { conteo[c.familia_id] = (conteo[c.familia_id] ?? 0) + 1 })
  kpis.moraCritica = Object.values(conteo).filter(v => v >= 2).length

  const historico: MorosidadMes[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    const m = d.getMonth() + 1; const a = d.getFullYear()
    const { data: h } = await admin.from('cobros').select('estado, monto').eq('colegio_id', colegioId).eq('mes', m).eq('anio', a)
    const mora = (h ?? []).filter((c: any) => c.estado === 'mora').length
    const total = (h ?? []).length
    historico.push({ mes: getMesNombre(m).slice(0, 3), porcentaje: total > 0 ? Math.round(mora/total*100) : 0, monto: 0 })
  }

  const { data: mesesRaw } = await admin.from('cobros').select('mes, anio').eq('colegio_id', colegioId).order('anio', { ascending: false }).order('mes', { ascending: false })
  const mesesDisponibles = [...new Map((mesesRaw ?? []).map((c: any) => [`${c.anio}-${c.mes}`, { mes: c.mes, anio: c.anio }])).values()].slice(0, 12)

  return (
    <ContableClient
      cobros={(cobros as any[]) ?? []}
      kpis={kpis} historico={historico}
      ultimosPagos={(ultimosPagos as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
      planes={(planes as any[]) ?? []}
      mes={mes} anio={anio}
      mesesDisponibles={mesesDisponibles}
    />
  )
}
