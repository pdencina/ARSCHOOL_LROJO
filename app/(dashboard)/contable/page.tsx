export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContableClient from '@/components/contable/ContableClient'
import type { KpiContable, MorosidadMes } from '@/types'
import { getMesNombre } from '@/lib/utils'
import { getColegioScope } from '@/lib/colegioScope'

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
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, programa_ids').eq('id', user.id).single()
  const usuario = ur as any
  // Control de acceso: solo roles con visibilidad financiera
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) redirect('/inicio')

  // Alcance de sedes (super_admin puede ver todas o una elegida)
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : ['__none__']
  const colegioId = scope.colegioId ?? usuario?.colegio_id ?? (colegioIds[0] ?? '')

  // Si es coordinador, obtener alumno_ids de sus programas
  let alumnoIdsFilter: string[] | null = null
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
    const { data: inscripciones } = await admin
      .from('inscripciones_programa')
      .select('alumno_id')
      .in('programa_id', usuario.programa_ids)
      .in('colegio_id', colegioIdsSafe)
      .in('estado', ['activa', 'prueba'])
    alumnoIdsFilter = (inscripciones ?? []).map((i: any) => i.alumno_id)
  }

  // Auto-detectar mes más reciente con datos
  let mes: number, anio: number
  if (searchParams.mes && searchParams.anio) {
    mes = parseInt(searchParams.mes); anio = parseInt(searchParams.anio)
  } else {
    const { data: ultimo } = await admin.from('cobros').select('mes, anio')
      .in('colegio_id', colegioIdsSafe)
      .order('anio', { ascending: false }).order('mes', { ascending: false })
      .limit(1).single()
    mes  = ultimo ? (ultimo as any).mes  : new Date().getMonth() + 1
    anio = ultimo ? (ultimo as any).anio : new Date().getFullYear()
  }

  const [{ data: planes }, { data: ultimosPagos }] = await Promise.all([
    admin.from('planes_cobro').select('*').in('colegio_id', colegioIdsSafe).eq('activo', true),
    admin.from('pagos').select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
      .neq('estado', 'rechazado')
      .order('created_at', { ascending: false }).limit(8),
  ])

  // Cobros filtrados por programa si es coordinador
  let cobrosQuery = admin.from('cobros')
    .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
    .in('colegio_id', colegioIdsSafe).eq('mes', mes).eq('anio', anio)
    .order('estado')

  if (alumnoIdsFilter && alumnoIdsFilter.length > 0) {
    cobrosQuery = cobrosQuery.in('alumno_id', alumnoIdsFilter)
  }

  const { data: cobros } = alumnoIdsFilter && alumnoIdsFilter.length === 0
    ? { data: [] }
    : await cobrosQuery

  const kpis: KpiContable = { recaudado: 0, enMora: 0, moraCritica: 0, familiasAlDia: 0, totalFamilias: cobros?.length ?? 0, proyectado: 0 }
  cobros?.forEach((c: any) => {
    kpis.proyectado += c.monto
    if (c.estado === 'pagado')  { kpis.recaudado += c.monto; kpis.familiasAlDia++ }
    if (c.estado === 'mora')    { kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'parcial') { kpis.recaudado += c.monto_pagado; kpis.enMora += (c.monto - c.monto_pagado) }
    if (c.estado === 'pendiente') { kpis.enMora += c.monto }
  })

  const { data: todasMoras } = await admin.from('cobros').select('familia_id').in('colegio_id', colegioIdsSafe).eq('estado', 'mora')
  const conteo: Record<string, number> = {}
  ;(todasMoras ?? []).forEach((c: any) => { conteo[c.familia_id] = (conteo[c.familia_id] ?? 0) + 1 })
  kpis.moraCritica = Object.values(conteo).filter(v => v >= 2).length

  const historico: MorosidadMes[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    const m = d.getMonth() + 1; const a = d.getFullYear()
    const { data: h } = await admin.from('cobros').select('estado, monto').in('colegio_id', colegioIdsSafe).eq('mes', m).eq('anio', a)
    const mora = (h ?? []).filter((c: any) => c.estado === 'mora').length
    const total = (h ?? []).length
    historico.push({ mes: getMesNombre(m).slice(0, 3), porcentaje: total > 0 ? Math.round(mora/total*100) : 0, monto: 0 })
  }

  const { data: mesesRaw } = await admin.from('cobros').select('mes, anio').in('colegio_id', colegioIdsSafe).order('anio', { ascending: false }).order('mes', { ascending: false })
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
