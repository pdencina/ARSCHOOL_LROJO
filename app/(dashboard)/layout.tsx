export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'react-hot-toast'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: usuarioRaw } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as any
  if (!usuario) redirect('/login')

  // Cargar permisos del rol (super_admin ve todo)
  let modulosHabilitados: string[] | null = null
  if (usuario.rol !== 'super_admin') {
    const { data: permisos } = await admin
      .from('permisos_rol')
      .select('modulo, habilitado')
      .is('colegio_id', null)
      .eq('rol', usuario.rol)

    if (permisos && permisos.length > 0) {
      modulosHabilitados = permisos.filter((p: any) => p.habilitado).map((p: any) => p.modulo)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ar-bg)]">
      <Toaster position="top-right"/>
      <Topbar usuario={usuario}/>
      <div className="flex">
        <Sidebar rol={usuario.rol} modulosHabilitados={modulosHabilitados}/>
        <main className="flex-1 min-h-[calc(100vh-56px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
