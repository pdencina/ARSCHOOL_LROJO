export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SuperAdminColegiosClient from '@/components/super-admin/ColegiosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SuperAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') redirect('/inicio')

  // Obtener colegios con conteos
  const { data: colegios } = await admin.from('colegios').select('*').order('nombre')

  // Conteo de usuarios y alumnos por colegio
  const { data: usuarios } = await admin.from('usuarios').select('colegio_id, activo')
  const { data: alumnos } = await admin.from('alumnos').select('colegio_id, activo')

  const stats: Record<string, { usuarios: number; alumnos: number }> = {}
  ;(colegios ?? []).forEach((c: any) => { stats[c.id] = { usuarios: 0, alumnos: 0 } })
  ;(usuarios ?? []).forEach((u: any) => {
    if (u.activo && stats[u.colegio_id]) stats[u.colegio_id].usuarios++
  })
  ;(alumnos ?? []).forEach((a: any) => {
    if (a.activo && stats[a.colegio_id]) stats[a.colegio_id].alumnos++
  })

  return (
    <SuperAdminColegiosClient
      colegios={(colegios as any[]) ?? []}
      stats={stats}
    />
  )
}
