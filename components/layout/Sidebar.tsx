'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Fichas',       href: '/fichas',       icon: '📚', sub: 'Biblioteca pedagógica' },
  { label: 'Contable',     href: '/contable',     icon: '💳', sub: 'Cobranzas y facturas' },
  { label: 'Comunicación', href: '/comunicacion', icon: '📣', sub: 'Avisos y mensajes' },
  { label: 'Evaluaciones', href: '/evaluaciones', icon: '📝', sub: 'Notas y reportes' },
  { label: 'Alumnos',      href: '/alumnos',      icon: '👦', sub: 'Gestión de matrículas' },
  { label: 'Configuración',href: '/configuracion',icon: '⚙️', sub: 'Colegio y cuenta' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-1 shrink-0">
      {NAV.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-10 h-10 rounded-sm flex items-center justify-center text-lg transition-all relative group ${active ? 'bg-azul' : 'hover:bg-gray-50'}`}
          >
            <span>{item.icon}</span>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-tinta text-white font-mono text-xs rounded-sm whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {item.label}
            </div>
            {active && (
              <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-yellow-400 rounded-full" />
            )}
          </Link>
        )
      })}
    </aside>
  )
}
