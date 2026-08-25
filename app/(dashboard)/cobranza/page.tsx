export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import CobranzaClient from '@/components/cobranza/CobranzaClient'

export const metadata = { title: 'Cobranza — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function CobranzaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id, programa_ids').eq('id', user.id).single()
  const usuario = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'coordinador'].includes(usuario?.rol)) redirect('/inicio')

  const colegioId = usuario?.colegio_id
  const anio = new Date().getFullYear()

  // Si es coordinador, filtrar solo alumnos de sus programas
  let alumnoIdsFilter: string[] | null = null
  if (usuario.rol === 'coordinador' && usuario.programa_ids?.length > 0) {
    const { data: inscripciones } = await admin
      .from('inscripciones_programa')
      .select('alumno_id')
      .in('programa_id', usuario.programa_ids)
      .eq('colegio_id', colegioId)
      .in('estado', ['activa', 'prueba'])
    alumnoIdsFilter = (inscripciones ?? []).map((i: any) => i.alumno_id)
  }

  // Cargar cobros con alumno y familia
  let query = admin
    .from('cobros')
    .select('*, alumno:alumnos(nombre, apellido, curso), familia:familias(nombre_apoderado, apellido_apoderado, email, telefono)')
    .eq('colegio_id', colegioId)
    .eq('anio', anio)
    .order('fecha_vencimiento', { ascending: true })

  if (alumnoIdsFilter && alumnoIdsFilter.length > 0) {
    query = query.in('alumno_id', alumnoIdsFilter)
  } else if (alumnoIdsFilter && alumnoIdsFilter.length === 0) {
    // Coordinador sin alumnos inscritos — no mostrar nada
    return <CobranzaClient cobros={[]} logReciente={[]} anio={anio} />
  }

  const { data: cobros } = await query

  // Log reciente de cobranza
  const { data: logReciente } = await admin
    .from('log_cobranza')
    .select('*')
    .eq('colegio_id', colegioId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Pagos con comprobante (vouchers por revisar)
  const { data: pagosConVoucher } = await admin
    .from('pagos')
    .select('*, cobro:cobros(*, alumno:alumnos(nombre, apellido, curso), familia:familias(nombre_apoderado, email))')
    .not('referencia', 'is', null)
    .eq('medio_pago', 'transferencia')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <CobranzaClient
      cobros={(cobros as any[]) ?? []}
      logReciente={(logReciente as any[]) ?? []}
      pagosConVoucher={(pagosConVoucher as any[]) ?? []}
      anio={anio}
    />
  )
}
