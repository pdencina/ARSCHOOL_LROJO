'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Colegios',  href: '/super-admin',           icon: 'ti-building-school' },
  { label: 'Usuarios',  href: '/super-admin/usuarios',  icon: 'ti-users' },
  { label: 'Permisos',  href: '/super-admin/permisos',  icon: 'ti-lock' },
]

export default function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r border-[#e8eaed] flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <div className="px-4 pt-4 pb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#fdf8ee] text-[#92400e] border border-[#fde68a]/50">
          <i className="ti ti-shield-check text-[10px]" aria-hidden="true"/> Administración General
        </div>
      </div>
      <nav className="flex-1 py-3 px-3">
        <div className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.12em] px-3 py-1.5 mb-1">Gestión</div>
        {NAV_ITEMS.map(item => {
          const active = item.href === '/super-admin' 
            ? pathname === '/super-admin' 
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium mb-0.5 transition-all ${
                active 
                  ? 'bg-[#1a2332] text-white' 
                  : 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1a2332]'
              }`}>
              <i className={`ti ${item.icon} text-[15px] ${active ? 'text-[#b8860b]' : 'text-[#9ca3af]'}`} aria-hidden="true"/>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-[#f3f4f6]">
        <div className="text-[10px] text-[#d1d5db] tracking-wide">AR School v1.0</div>
      </div>
    </aside>
  )
}
