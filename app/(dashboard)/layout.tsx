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

  // Usar service role para leer usuario (evita bloqueo RLS para super_admin con colegio_id NULL)
  const admin = getAdmin()
  const { data: usuarioRaw } = await admin
    .from('usuarios')
    .select('*, colegio:colegios(*)')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as any
  if (!usuario) redirect('/login')

  // Super admin sin colegio asignado: redirigir al panel de super admin
  if (usuario.rol === 'super_admin' && !usuario.colegio_id) {
    redirect('/super-admin')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right"/>
      <Topbar usuario={usuario}/>
      <div className="flex">
        <Sidebar rol={usuario.rol}/>
        <main className="flex-1 min-h-[calc(100vh-56px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}