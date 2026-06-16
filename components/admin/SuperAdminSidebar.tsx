'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Colegios',  href: '/super-admin',          icon: 'ti-building-school' },
  { label: 'Usuarios',  href: '/super-admin/usuarios', icon: 'ti-users' },
]

export default function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <div className="px-3 pt-3 pb-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
          <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Super Admin
        </div>
      </div>
      <nav className="flex-1 py-2 px-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 mb-1">Fundación</div>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <i className={`ti ${item.icon} text-base ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true"/>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
