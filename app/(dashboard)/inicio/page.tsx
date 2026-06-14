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

  const { data: ur, error: urError } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  // DEBUG: mostrar info cruda
  if (!ur) {
    return (
      <div style={{padding:'2rem',fontFamily:'monospace'}}>
        <h2>DEBUG — usuario no encontrado</h2>
        <p><b>auth.user.id:</b> {user.id}</p>
        <p><b>auth.user.email:</b> {user.email}</p>
        <p><b>Error:</b> {JSON.stringify(urError)}</p>
        <p>Ejecuta en Supabase SQL Editor:</p>
        <pre>SELECT id, email, rol, colegio_id FROM public.usuarios WHERE id = &apos;{user.id}&apos;;</pre>
      </div>
    )
  }

  const usuario = ur as any
  const colegioId = usuario?.colegio_id ?? ''
  const rol = usuario?.rol ?? 'admin'
  const ahora = new Date()

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

  // DEBUG: mostrar datos crudos
  const { count: alumnosCount } = await admin
    .from('alumnos')
    .select('*', { count: 'exact', head: true })
    .eq('colegio_id', colegioId)

  if (process.env.NODE_ENV !== 'production' || true) {
    console.log('DEBUG inicio:', { userId: user.id, colegioId, rol, mes, anio, alumnosCount, ultimoCobro })
  }

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

  // Mostrar debug en pantalla temporalmente
  return (
    <div>
      <div style={{background:'#1e293b',color:'#94a3b8',padding:'1rem',fontFamily:'monospace',fontSize:'12px',margin:'1rem'}}>
        <b style={{color:'#60a5fa'}}>DEBUG</b> —
        usuario: <b style={{color:'#34d399'}}>{usuario?.nombre} {usuario?.apellido}</b> |
        rol: <b style={{color:'#f59e0b'}}>{rol}</b> |
        colegio_id: <b style={{color:'#f59e0b'}}>{colegioId || 'NULL'}</b> |
        alumnos: <b style={{color:'#34d399'}}>{totalAlumnos}</b> |
        comunicados: <b style={{color:'#34d399'}}>{totalComunicados}</b> |
        cobros mes {mes}/{anio}: <b style={{color:'#34d399'}}>{cobros?.length ?? 0}</b>
      </div>
      <DashboardInicio
        usuario={usuario}
        rol={rol}
        stats={{
          totalAlumnos:     totalAlumnos ?? 0,
          totalComunicados: totalComunicados ?? 0,
          recaudado: (cobros ?? []).filter((c: any) => c.estado === 'pagado').reduce((a: number, c: any) => a + c.monto, 0),
          enMora:    (cobros ?? []).filter((c: any) => ['mora','parcial','pendiente'].includes(c.estado)).reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0),
          pctAsistencia: (asistenciasHoy ?? []).length > 0
            ? Math.round((asistenciasHoy ?? []).filter((a: any) => a.estado === 'presente').length / (asistenciasHoy ?? []).length * 100)
            : null,
          moraCritica: (cobros ?? []).filter((c: any) => c.estado === 'mora').length,
        }}
        notificaciones={(notificaciones as any[]) ?? []}
        ultimosComunicados={(ultimosComunicados as any[]) ?? []}
        mesActual={`${getMesNombre(mes)} ${anio}`}
      />
    </div>
  )
}
