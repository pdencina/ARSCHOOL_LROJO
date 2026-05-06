'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    section: 'Principal',
    items: [
      { label: 'Inicio',        href: '/dashboard',      icon: 'ti-home' },
      { label: 'Comunicados',   href: '/comunicados',    icon: 'ti-speakerphone', badge: 3 },
      { label: 'Asistencias',   href: '/asistencias',    icon: 'ti-clipboard-check' },
      { label: 'Calificaciones',href: '/calificaciones', icon: 'ti-chart-bar' },
    ]
  },
  {
    section: 'Gestion',
    items: [
      { label: 'Cobranzas',     href: '/contable',       icon: 'ti-cash' },
      { label: 'Fichas',        href: '/fichas',         icon: 'ti-books' },
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
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <nav className="flex-1 py-2">
        {NAV.map(group => (
          <div key={group.section} className="mb-1">
            <div className="px-4 py-2 text-xs font-mono tracking-widest uppercase text-tinta-s/50">
              {group.section}
            </div>
            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 text-sm relative transition-colors ${
                    active
                      ? 'text-azul bg-azul-claro font-medium'
                      : 'text-tinta-s hover:bg-gray-50 hover:text-tinta'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-azul rounded-r" />
                  )}
                  <i className={`ti ${item.icon} text-base w-4 text-center`} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-rojo text-white text-xs font-mono px-1.5 py-0.5 rounded-full leading-none">
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