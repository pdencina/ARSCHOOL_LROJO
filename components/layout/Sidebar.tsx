'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Rol = 'super_admin' | 'admin' | 'docente' | 'tutor' | 'alumno'

interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Comunicados',    href: '/comunicados',    icon: 'ti-speakerphone', badge: 3,  roles: ['super_admin','admin','docente'] },
  { label: 'Asistencias',    href: '/asistencias',    icon: 'ti-clipboard-check',          roles: ['super_admin','admin','docente'] },
  { label: 'Calificaciones', href: '/calificaciones', icon: 'ti-chart-bar',                roles: ['super_admin','admin','docente'] },
  { label: 'Fichas',         href: '/fichas',         icon: 'ti-books',                    roles: ['super_admin','admin','docente'] },
]

const NAV_GESTION: NavItem[] = [
  { label: 'Cobranzas',     href: '/contable',        icon: 'ti-cash',                     roles: ['super_admin','admin'] },
  { label: 'Alumnos',       href: '/alumnos',         icon: 'ti-users',                    roles: ['super_admin','admin','docente'] },
  { label: 'Calendario',    href: '/calendario',      icon: 'ti-calendar',                 roles: ['super_admin','admin','docente'] },
  { label: 'Reportes',      href: '/reportes',        icon: 'ti-file-analytics',           roles: ['super_admin','admin'] },
]

const NAV_CUENTA: NavItem[] = [
  { label: 'Colegios',       href: '/super-admin',     icon: 'ti-building-school',         roles: ['super_admin'] },
  { label: 'Configuracion', href: '/configuracion',   icon: 'ti-settings',                 roles: ['super_admin','admin'] },
]

// Portal tutor/alumno
const NAV_PORTAL: NavItem[] = [
  { label: 'Mis comunicados',  href: '/portal/comunicados',  icon: 'ti-speakerphone', roles: ['tutor','alumno'] },
  { label: 'Asistencias',      href: '/portal/asistencias',  icon: 'ti-clipboard-check', roles: ['tutor','alumno'] },
  { label: 'Calificaciones',   href: '/portal/calificaciones',icon: 'ti-chart-bar',    roles: ['tutor','alumno'] },
  { label: 'Estado de pagos',  href: '/portal/pagos',        icon: 'ti-cash',          roles: ['tutor'] },
  { label: 'Mi perfil',        href: '/portal/perfil',       icon: 'ti-user',          roles: ['tutor','alumno'] },
]

interface Props { rol?: string }

export default function Sidebar({ rol = 'admin' }: Props) {
  const pathname = usePathname()
  const rolTyped = rol as Rol

  const isPortal = rol === 'tutor' || rol === 'alumno'

  function renderItems(items: NavItem[], section: string) {
    const visibles = items.filter(i => i.roles.includes(rolTyped))
    if (!visibles.length) return null
    return (
      <div className="mb-4">
        <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{section}</div>
        {visibles.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <i className={`ti ${item.icon} text-base flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true"/>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>
              )}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      {/* Badge de rol */}
      <div className="px-3 pt-3 pb-1">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          rolTyped === 'super_admin' ? 'bg-red-50 text-red-700' :
          rolTyped === 'admin'       ? 'bg-blue-50 text-blue-700' :
          rolTyped === 'docente'     ? 'bg-violet-50 text-violet-700' :
          rolTyped === 'tutor'       ? 'bg-emerald-50 text-emerald-700' :
          'bg-amber-50 text-amber-700'
        }`}>
          <i className={`ti ${
            rolTyped === 'super_admin' ? 'ti-shield-check' :
            rolTyped === 'admin'       ? 'ti-user-cog' :
            rolTyped === 'docente'     ? 'ti-school' :
            rolTyped === 'tutor'       ? 'ti-heart-handshake' :
            'ti-backpack'
          } text-xs`} aria-hidden="true"/>
          {rolTyped === 'super_admin' ? 'Super Admin' :
           rolTyped === 'admin'       ? 'Administrador' :
           rolTyped === 'docente'     ? 'Docente' :
           rolTyped === 'tutor'       ? 'Apoderado' : 'Alumno'}
        </div>
      </div>

      <nav className="flex-1 py-2 px-2">
        {isPortal ? (
          renderItems(NAV_PORTAL, 'Mi espacio')
        ) : (
          <>
            {renderItems(NAV_ITEMS, 'Principal')}
            {renderItems(NAV_GESTION, 'Gestión')}
            {renderItems(NAV_CUENTA, 'Cuenta')}
          </>
        )}
      </nav>
    </aside>
  )
}