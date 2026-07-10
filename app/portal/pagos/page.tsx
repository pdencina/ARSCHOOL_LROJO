export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PortalPagosClient from '@/components/portal/PortalPagosClient'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PortalPagosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  const rol = (ur as any)?.rol

  // Obtener alumno_ids
  let alumnoIds: string[] = []
  if (rol === 'alumno') {
    const { data: va } = await admin.from('usuario_alumno').select('alumno_id').eq('usuario_id', user.id)
    alumnoIds = (va ?? []).map((r: any) => r.alumno_id)
  } else {
    const { data: ta } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
    alumnoIds = (ta ?? []).map((r: any) => r.alumno_id)
  }

  if (alumnoIds.length === 0) {
    return (
      <div className="p-6">
        <h1 className="page-title">Estado de aportes</h1>
        <div className="mt-8 bg-white border border-[var(--ar-border)] rounded-xl p-10 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <i className="ti ti-cash text-3xl text-[#d1d5db] block mb-2" aria-hidden="true"/>
          <p className="text-[#9ca3af] text-sm">No hay alumnos vinculados a tu cuenta.</p>
        </div>
      </div>
    )
  }

  const { data: cobros } = await admin
    .from('cobros')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .in('alumno_id', alumnoIds)
    .order('anio', { ascending: true })
    .order('mes', { ascending: true })

  return <PortalPagosClient cobros={(cobros as any[]) ?? []} />
}
