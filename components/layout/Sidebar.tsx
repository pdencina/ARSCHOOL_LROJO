'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    section: 'Principal',
    items: [
      { label: 'Comunicados',    href: '/comunicados',    icon: 'ti-speakerphone', badge: 3 },
      { label: 'Asistencias',    href: '/asistencias',    icon: 'ti-clipboard-check' },
      { label: 'Calificaciones', href: '/calificaciones', icon: 'ti-chart-bar' },
      { label: 'Fichas',         href: '/fichas',         icon: 'ti-books' },
    ]
  },
  {
    section: 'Gestion',
    items: [
      { label: 'Cobranzas',     href: '/contable',       icon: 'ti-cash' },
      { label: 'Alumnos',       href: '/alumnos',        icon: 'ti-users' },
      { label: 'Calendario',    href: '/calendario',     icon: 'ti-calendar' },
      { label: 'Reportes',      href: '/reportes',       icon: 'ti-file-analytics' },
    ]
  },
  {
    section: 'Cuenta',
    items: [
      { label: 'Configuracion', href: '/configuracion',  icon: 'ti-settings' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <nav className="flex-1 py-4 px-2">
        {NAV.map(group => (
          <div key={group.section} className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {group.section}
            </div>
            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <i className={`ti ${item.icon} text-base flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}