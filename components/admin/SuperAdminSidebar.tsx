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
    <aside className="w-56 bg-white border-r border-slate-100 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <div className="px-4 pt-4 pb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
          <i className="ti ti-shield-check text-xs" aria-hidden="true"/> Administración General
        </div>
      </div>
      <nav className="flex-1 py-3 px-3">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em] px-3 py-2 mb-1">Gestión</div>
        {NAV_ITEMS.map(item => {
          const active = item.href === '/super-admin' 
            ? pathname === '/super-admin' 
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                active 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <i className={`ti ${item.icon} text-base ${active ? 'text-amber-400' : 'text-slate-400'}`} aria-hidden="true"/>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="text-[10px] text-slate-300 uppercase tracking-widest">AR School v1.0</div>
      </div>
    </aside>
  )
}
