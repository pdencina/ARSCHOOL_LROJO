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
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, programa_ids, sedes_ids').eq('id', user.id).single()
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

  // El módulo ahora trabaja por AÑO completo (estado de cuenta anual por alumno),
  // no por un solo mes. Se auto-detecta el año más reciente con datos.
  let anio: number
  if (searchParams.anio) {
    anio = parseInt(searchParams.anio)
  } else {
    const { data: ultimo } = await admin.from('cobros').select('anio')
      .in('colegio_id', colegioIdsSafe)
      .order('anio', { ascending: false })
      .limit(1).single()
    anio = ultimo ? (ultimo as any).anio : new Date().getFullYear()
  }

  const [{ data: planes }, { data: ultimosPagos }] = await Promise.all([
    admin.from('planes_cobro').select('*').in('colegio_id', colegioIdsSafe).eq('activo', true),
    admin.from('pagos').select('*, cobro:cobros(*, familia:familias(nombre_apoderado, apellido_apoderado))')
      .neq('estado', 'rechazado')
      .order('created_at', { ascending: false }).limit(8),
  ])

  // TODOS los cobros del año (no de un solo mes). Filtrado por programa si es coordinador.
  let cobrosQuery = admin.from('cobros')
    .select('*, familia:familias(*, alumno:alumnos(*)), concepto:conceptos_cobro(*)')
    .in('colegio_id', colegioIdsSafe).eq('anio', anio)
    .order('mes')

  if (alumnoIdsFilter && alumnoIdsFilter.length > 0) {
    cobrosQuery = cobrosQuery.in('alumno_id', alumnoIdsFilter)
  }

  const { data: cobros } = alumnoIdsFilter && alumnoIdsFilter.length === 0
    ? { data: [] }
    : await cobrosQuery

  const listaCobros = (cobros as any[]) ?? []

  // ─── KPIs sobre el AÑO completo, contando ALUMNOS únicos ───
  // recaudado = todo lo efectivamente pagado; porCobrar = saldo pendiente total.
  const hoy = new Date().toISOString().split('T')[0]
  const porAlumno = new Map<string, { pendiente: number; cuotasMora: number }>()
  const kpis: KpiContable = { recaudado: 0, enMora: 0, moraCritica: 0, familiasAlDia: 0, totalFamilias: 0, proyectado: 0 }

  listaCobros.forEach((c: any) => {
    if (c.estado === 'anulado') return
    const saldo = Math.max(0, c.monto - (c.monto_pagado ?? 0))
    kpis.proyectado += c.monto
    kpis.recaudado += Math.min(c.monto, c.monto_pagado ?? 0)
    kpis.enMora += saldo

    const aid = c.alumno_id ?? c.familia_id ?? 'sin_id'
    const prev = porAlumno.get(aid) ?? { pendiente: 0, cuotasMora: 0 }
    prev.pendiente += saldo
    // Cuota vencida sin pagar del todo => cuenta para mora
    if (saldo > 0 && c.fecha_vencimiento && c.fecha_vencimiento < hoy) prev.cuotasMora += 1
    porAlumno.set(aid, prev)
  })

  kpis.totalFamilias = porAlumno.size
  kpis.familiasAlDia = [...porAlumno.values()].filter(a => a.pendiente === 0).length
  // Mora crítica: alumnos con 2 o más cuotas vencidas impagas
  kpis.moraCritica = [...porAlumno.values()].filter(a => a.cuotasMora >= 2).length

  // Histórico de morosidad: % de cuotas vencidas impagas por mes del año
  const historico: MorosidadMes[] = []
  for (let m = 1; m <= 12; m++) {
    const delMes = listaCobros.filter((c: any) => c.mes === m && c.estado !== 'anulado')
    if (delMes.length === 0) continue
    const vencidosImpagos = delMes.filter((c: any) => (c.monto - (c.monto_pagado ?? 0)) > 0 && c.fecha_vencimiento && c.fecha_vencimiento < hoy).length
    historico.push({ mes: getMesNombre(m).slice(0, 3), porcentaje: Math.round(vencidosImpagos / delMes.length * 100), monto: 0 })
  }

  // Años disponibles para el selector
  const { data: aniosRaw } = await admin.from('cobros').select('anio').in('colegio_id', colegioIdsSafe).order('anio', { ascending: false })
  const aniosDisponibles = [...new Set((aniosRaw ?? []).map((c: any) => c.anio))].slice(0, 6)
  if (!aniosDisponibles.includes(anio)) aniosDisponibles.unshift(anio)

  return (
    <ContableClient
      cobros={listaCobros}
      kpis={kpis} historico={historico}
      ultimosPagos={(ultimosPagos as any[]) ?? []}
      mesActual={`Año ${anio}`}
      planes={(planes as any[]) ?? []}
      mes={new Date().getMonth() + 1} anio={anio}
      aniosDisponibles={aniosDisponibles}
    />
  )
}
