export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getColegioScope } from '@/lib/colegioScope'
import { ROLES_GESTION_MATRICULA } from '@/lib/matriculaAcceso'
import { idxMes, idxDeFecha, inicioMatricula, limiteEntre } from '@/lib/matriculaPeriodo'
import PagosVouchersClient from '@/components/pagos/PagosVouchersClient'

export const metadata = { title: 'Pagos y vouchers — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// .in() con listas largas: de a trozos para no exceder el largo de la URL
async function enTrozos<T>(ids: string[], consulta: (trozo: string[]) => PromiseLike<{ data: any }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await consulta(ids.slice(i, i + 100))
    out.push(...(((data as T[]) ?? [])))
  }
  return out
}

export default async function PagosPage({ searchParams }: { searchParams: { anio?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids, sedes_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!ROLES_GESTION_MATRICULA.includes(usuario?.rol)) redirect('/inicio')

  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : ['__none__']

  // Años escolares disponibles (por defecto el más reciente que no sea futuro lejano)
  let qAnios = admin.from('matriculas').select('anio_escolar').not('anio_escolar', 'is', null)
  if (!scope.all) qAnios = qAnios.in('colegio_id', colegioIdsSafe)
  const { data: aniosRaw } = await qAnios
  const anioActual = new Date().getFullYear()
  const anios = Array.from(new Set(((aniosRaw as any[]) ?? []).map(a => Number(a.anio_escolar)))).sort((a, b) => b - a)
  const anio = Number(searchParams.anio) || (anios.find(a => a <= anioActual) ?? anios[0] ?? anioActual)
  if (!anios.includes(anio)) anios.unshift(anio)

  // Matrículas del año (con alumno, programa y apoderado)
  let qMat = admin
    .from('matriculas')
    .select('id, alumno_id, familia_id, colegio_id, programa_id, anio_escolar, estado, fecha_matricula, fecha_inicio_contrato, duracion_contrato_meses, created_at, alumno:alumnos(nombre, apellido, curso), programa:programas(codigo, nombre), familia:familias(nombre_apoderado, apellido_apoderado, telefono, email)')
    .eq('anio_escolar', anio)
    .order('created_at', { ascending: false })
  if (!scope.all) qMat = qMat.in('colegio_id', colegioIdsSafe)
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) qMat = qMat.in('programa_id', usuario.programa_ids)
  const { data: matsRaw } = await qMat
  const matriculas = (matsRaw as any[]) ?? []

  const alumnoIds = Array.from(new Set(matriculas.map(m => m.alumno_id).filter(Boolean)))

  // Todas las matrículas de esos alumnos (para acotar el período de cada contrato),
  // sus cobros, los comprobantes adjuntados y los pagos con voucher / por validar.
  const [todasMats, cobros, comprobantes] = await Promise.all([
    enTrozos<any>(alumnoIds, t => admin.from('matriculas').select('id, alumno_id, anio_escolar, fecha_inicio_contrato, fecha_matricula, created_at').in('alumno_id', t)),
    enTrozos<any>(alumnoIds, t => admin.from('cobros').select('id, alumno_id, mes, anio, monto, monto_pagado, estado, tipo_concepto, fecha_vencimiento').in('alumno_id', t).neq('estado', 'anulado')),
    enTrozos<any>(alumnoIds, t => admin.from('cobro_comprobantes').select('cobro_id').in('alumno_id', t)),
  ])
  const cobroIds = cobros.map(c => c.id)
  const pagosInfo = await enTrozos<any>(cobroIds, t => admin.from('pagos').select('cobro_id, estado, tiene_comprobante').in('cobro_id', t).in('estado', ['pendiente', 'confirmado']))

  const conVoucher = new Set<string>(comprobantes.map(c => c.cobro_id))
  const porValidar: Record<string, number> = {}
  for (const p of pagosInfo) {
    if (p.tiene_comprobante) conVoucher.add(p.cobro_id)
    if (p.estado === 'pendiente') porValidar[p.cobro_id] = (porValidar[p.cobro_id] ?? 0) + 1
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const matsPorAlumno: Record<string, any[]> = {}
  for (const m of todasMats) (matsPorAlumno[m.alumno_id] ??= []).push(m)
  const cobrosPorAlumno: Record<string, any[]> = {}
  for (const c of cobros) (cobrosPorAlumno[c.alumno_id] ??= []).push(c)

  const contratos = matriculas.map(m => {
    const ini = inicioMatricula(m)
    const desde = ini ? idxDeFecha(ini) : -Infinity
    const hasta = limiteEntre(m, matsPorAlumno[m.alumno_id] ?? [], desde === -Infinity ? 0 : desde)
    const cuotas = (cobrosPorAlumno[m.alumno_id] ?? []).filter(c => { const i = idxMes(c.anio, c.mes); return i >= desde && i < hasta })
    const saldo = (c: any) => Math.max(0, (c.monto ?? 0) - (c.monto_pagado ?? 0))
    const mensuales = cuotas.filter(c => c.tipo_concepto === 'aporte_mensual')
    const pendientes = cuotas.filter(c => saldo(c) > 0).sort((a, b) => idxMes(a.anio, a.mes) - idxMes(b.anio, b.mes))
    const duracion = Number(m.duracion_contrato_meses) || 0
    return {
      id: m.id,
      alumno: m.alumno,
      programa: m.programa,
      apoderado: m.familia ? `${m.familia.nombre_apoderado ?? ''} ${m.familia.apellido_apoderado ?? ''}`.trim() : null,
      estado: m.estado,
      fecha_inicio: ini,
      duracion: duracion || null,
      total: cuotas.reduce((s, c) => s + (c.monto ?? 0), 0),
      pagado: cuotas.reduce((s, c) => s + Math.min(c.monto ?? 0, c.monto_pagado ?? 0), 0),
      pendiente: cuotas.reduce((s, c) => s + saldo(c), 0),
      cuotas_mensuales: mensuales.length,
      cuotas_pagadas: mensuales.filter(c => saldo(c) === 0).length,
      vencidas: pendientes.filter(c => c.fecha_vencimiento && c.fecha_vencimiento < hoy).length,
      sin_voucher: cuotas.filter(c => (c.monto_pagado ?? 0) > 0 && !conVoucher.has(c.id)).length,
      por_validar: cuotas.reduce((s, c) => s + (porValidar[c.id] ?? 0), 0),
      descuadre: duracion > 0 && mensuales.length !== duracion,
      proximo: pendientes[0] ? { mes: pendientes[0].mes, anio: pendientes[0].anio, monto: saldo(pendientes[0]), vence: pendientes[0].fecha_vencimiento } : null,
    }
  })

  return <PagosVouchersClient contratos={contratos} anio={anio} anios={anios.slice(0, 6)}/>
}
