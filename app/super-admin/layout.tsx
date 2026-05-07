export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { Toaster } from 'react-hot-toast'

const SUPER_ADMIN_NAV = [
  { label: 'Colegios',  href: '/super-admin',           icon: 'ti-building-school' },
  { label: 'Usuarios',  href: '/super-admin/usuarios',  icon: 'ti-users' },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ur } = await supabase.from('usuarios').select('*, colegio:colegios(*)').eq('id', user.id).single()
  const usuario = ur as any
  if (usuario?.rol !== 'super_admin') redirect('/fichas')

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right"/>
      <Topbar usuario={usuario}/>
      <div className="flex">
        {/* Sidebar super admin */}
        <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
          <div className="px-3 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
              <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Super Admin
            </div>
          </div>
          <nav className="flex-1 py-2 px-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">Fundación</div>
            {SUPER_ADMIN_NAV.map(item => (
              <a key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                <i className={`ti ${item.icon} text-base text-slate-400`} aria-hidden="true"/>
                {item.label}
              </a>
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