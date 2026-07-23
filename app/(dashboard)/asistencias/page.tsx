export const dynamic = 'force-dynamic'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AsistenciasClient from '@/components/asistencias/AsistenciasClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AsistenciasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('colegio_id, rol, nombre, apellido').eq('id', user.id).single()
  const usuario = ur as any
  const colegioId = usuario?.colegio_id ?? ''
  const hoy = new Date().toISOString().split('T')[0]

  // Obtener horario publicado para extraer bloques del tutor
  const { data: horarioPublicado } = await admin
    .from('propuestas_horario')
    .select('propuesta')
    .eq('colegio_id', colegioId)
    .eq('estado', 'publicado')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Extraer bloques del día actual para este tutor
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const diaHoy = diasSemana[new Date().getDay()]
  const propuesta = horarioPublicado?.propuesta as any
  let bloquesDelDia: any[] = []

  if (propuesta?.horario?.[diaHoy]) {
    const nombreTutor = `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim()
    const todosLosBloques = propuesta.horario[diaHoy] as any[]

    if (['admin', 'super_admin', 'pastor_campus'].includes(usuario?.rol)) {
      // Admin ve todos los bloques
      bloquesDelDia = todosLosBloques
    } else {
      // Tutor solo ve sus bloques
      bloquesDelDia = todosLosBloques.filter((b: any) => b.tutor === nombreTutor)
    }
  }

  const [{ data: alumnos }, { data: asistenciasHoy }] = await Promise.all([
    admin.from('alumnos').select('*').eq('colegio_id', colegioId).eq('activo', true).order('apellido'),
    admin.from('asistencias').select('*, alumno:alumnos(*)').eq('colegio_id', colegioId).eq('fecha', hoy),
  ])

  const cursos = [...new Set((alumnos ?? []).map((a: any) => a.curso))].sort()

  return (
    <AsistenciasClient
      alumnos={(alumnos as any[]) ?? []}
      asistenciasHoy={(asistenciasHoy as any[]) ?? []}
      cursos={cursos}
      colegioId={colegioId}
      fecha={hoy}
      bloquesDelDia={bloquesDelDia}
      rol={usuario?.rol ?? 'tutor'}
    />
  )
}
