export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Topbar from '@/components/layout/Topbar'
import { Toaster } from 'react-hot-toast'
import Link from 'next/link'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const NAV_ITEMS = [
  { label: 'Colegios',        href: '/super-admin',          icon: 'ti-building-school' },
  { label: 'Usuarios',        href: '/super-admin/usuarios', icon: 'ti-users' },
  { label: 'Configuración',   href: '/configuracion',        icon: 'ti-settings' },
]

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
        {/* Sidebar super admin */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
          <div className="px-3 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Super Admin
            </div>
          </div>
          <nav className="flex-1 py-2 px-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">Fundación</div>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                <i className={`ti ${item.icon} text-base text-slate-400`} aria-hidden="true"/>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-h-[calc(100vh-56px)] overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
