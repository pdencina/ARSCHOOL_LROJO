export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProgramaClient from '@/components/programas/ProgramaClient'
import { getColegioScope } from '@/lib/colegioScope'

export const metadata = { title: 'AR Worship School — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function WorshipPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user.id).single()
  const usuario = ur as any
  if (!usuario) redirect('/login')

  // Obtener programa Worship
  const { data: programa } = await admin.from('programas').select('*').eq('codigo', 'ar_worship').single()
  if (!programa) redirect('/inicio')

  const programaId = (programa as any).id

  // Verificar acceso
  if (usuario.programa_ids && usuario.programa_ids.length > 0 && !usuario.programa_ids.includes(programaId)) {
    if (!['super_admin', 'admin', 'pastor_campus'].includes(usuario.rol)) redirect('/inicio')
  }

  // Alcance de sedes: coordinador multi-sede ve todas sus sedes; super_admin según selección.
  const scope = await getColegioScope(usuario)
  const colegioIds = scope.all ? scope.colegioIds : (scope.colegioId ? [scope.colegioId] : [])
  const colegioIdsSafe = colegioIds.length ? colegioIds : [usuario.colegio_id ?? '__none__']

  // Obtener inscripciones del programa
  const { data: inscripciones } = await admin
    .from('inscripciones_programa')
    .select('*, alumno:alumnos(id, nombre, apellido, rut, curso, fecha_nacimiento, sexo)')
    .eq('programa_id', programaId)
    .in('colegio_id', colegioIdsSafe)
    .in('estado', ['activa', 'prueba'])
    .order('created_at', { ascending: false })

  // Obtener matrículas del programa
  const { data: matriculas } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('programa_id', programaId)
    .in('colegio_id', colegioIdsSafe)
    .order('created_at', { ascending: false })

  // Obtener asistencias últimas 4 semanas para gráfico + alertas
  const hace4Semanas = new Date()
  hace4Semanas.setDate(hace4Semanas.getDate() - 28)
  const { data: asistencias4w } = await admin
    .from('asistencias_sesion')
    .select('alumno_id, fecha, estado')
    .eq('programa_id', programaId)
    .in('colegio_id', colegioIdsSafe)
    .gte('fecha', hace4Semanas.toISOString().split('T')[0])
    .order('fecha', { ascending: true })

  // Obtener cobros pendientes (para indicador de mora)
  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()
  const { data: cobrosPendientes } = await admin
    .from('cobros')
    .select('alumno_id, monto, mes, anio, pagado')
    .in('colegio_id', colegioIdsSafe)
    .eq('pagado', false)
    .lte('mes', mesActual)
    .lte('anio', anioActual)

  return (
    <ProgramaClient
      programa={programa as any}
      inscripciones={(inscripciones as any[]) ?? []}
      matriculas={(matriculas as any[]) ?? []}
      colegioId={usuario.colegio_id}
      asistencias4w={(asistencias4w as any[]) ?? []}
      cobrosPendientes={(cobrosPendientes as any[]) ?? []}
    />
  )
}
