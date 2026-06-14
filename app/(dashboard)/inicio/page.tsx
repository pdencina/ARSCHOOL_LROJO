export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardInicio from '@/components/dashboard/DashboardInicio'
import { getMesNombre } from '@/lib/utils'

export const metadata = { title: 'Inicio — AR School' }

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function InicioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdminClient()

  const { data: ur } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  const usuario  = ur as any
  const colegioId = usuario?.colegio_id ?? ''
  const rol       = usuario?.rol ?? 'admin'
  const ahora     = new Date()

  const { data: ultimoCobro } = await admin
    .from('cobros')
    .select('mes, anio')
    .eq('colegio_id', colegioId)
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)
    .single()

  const mes  = ultimoCobro ? (ultimoCobro as any).mes  : ahora.getMonth() + 1
  const anio = ultimoCobro ? (ultimoCobro as any).anio : ahora.getFullYear()

  const [
    { count: totalAlumnos },
    { count: totalComunicados },
    { data: cobros },
    { data: asistenciasHoy },
    { data: notificaciones },
    { data: ultimosComunicados },
  ] = await Promise.all([
    admin.from('alumnos').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('activo', true),
    admin.from('comunicados').select('*', { count: 'exact', head: true }).eq('colegio_id', colegioId),
    admin.from('cobros').select('estado, monto, monto_pagado').eq('colegio_id', colegioId).eq('mes', mes).eq('anio', anio),
    admin.from('asistencias').select('estado').eq('colegio_id', colegioId).eq('fecha', ahora.toISOString().split('T')[0]),
    admin.from('notificaciones').select('*').eq('colegio_id', colegioId).eq('leida', false).order('created_at', { ascending: false }).limit(10),
    admin.from('comunicados').select('*').eq('colegio_id', colegioId).order('created_at', { ascending: false }).limit(5),
  ])

  const recaudado = (cobros ?? []).filter((c: any) => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0)
  const enMora    = (cobros ?? []).filter((c: any) => ['mora','parcial','pendiente'].includes(c.estado)).reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)
  const pctAsistencia = (asistenciasHoy ?? []).length > 0
    ? Math.round((asistenciasHoy ?? []).filter((a: any) => a.estado === 'presente').length / (asistenciasHoy ?? []).length * 100)
    : null

  return (
    <DashboardInicio
      usuario={usuario}
      rol={rol}
      stats={{
        totalAlumnos:     totalAlumnos ?? 0,
        totalComunicados: totalComunicados ?? 0,
        recaudado,
        enMora,
        pctAsistencia,
        moraCritica: (cobros ?? []).filter((c: any) => c.estado === 'mora').length,
      }}
      notificaciones={(notificaciones as any[]) ?? []}
      ultimosComunicados={(ultimosComunicados as any[]) ?? []}
      mesActual={`${getMesNombre(mes)} ${anio}`}
    />
  )
}
