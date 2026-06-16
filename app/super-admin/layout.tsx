export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Topbar from '@/components/layout/Topbar'
import { Toaster } from 'react-hot-toast'
import SuperAdminSidebar from '@/components/admin/SuperAdminSidebar'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(*)').eq('id', user.id).single()
  const usuario = ur as any
  if (usuario?.rol !== 'super_admin') redirect('/inicio')

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right"/>
      <Topbar usuario={usuario}/>
      <div className="flex">
        <SuperAdminSidebar/>
        <main className="flex-1 min-h-[calc(100vh-56px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
