'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Rol = 'super_admin' | 'admin' | 'tutor' | 'apoderado' | 'alumno'

interface NavItem {
  label: string; href: string; icon: string; badge?: number; roles: Rol[]
}

// TUTOR = Profesor (tiene todo el control pedagógico)
const NAV_PRINCIPAL: NavItem[] = [
  { label: 'Inicio',          href: '/inicio',          icon: 'ti-home',             roles: ['super_admin','admin','tutor'] },
  { label: 'Mis alumnos',     href: '/alumnos',         icon: 'ti-users',            roles: ['tutor'] },
  { label: 'Alumnos',         href: '/alumnos',         icon: 'ti-users',            roles: ['super_admin','admin'] },
  { label: 'Planificación',   href: '/planificacion',   icon: 'ti-layout-board',     roles: ['tutor'] },
  { label: 'Asistencias',     href: '/asistencias',     icon: 'ti-clipboard-check',  roles: ['super_admin','admin','tutor'] },
  { label: 'Calificaciones',  href: '/calificaciones',  icon: 'ti-chart-bar',        roles: ['super_admin','admin','tutor'] },
  { label: 'Comunicados',     href: '/comunicados',     icon: 'ti-speakerphone',     roles: ['super_admin','admin','tutor'] },
  { label: 'Libro de clases', href: '/libro-clases',    icon: 'ti-notebook',         roles: ['tutor'] },
]

const NAV_GESTION: NavItem[] = [
  { label: 'Cobranzas',       href: '/contable',        icon: 'ti-cash',             roles: ['super_admin','admin'] },
  { label: 'Calendario',      href: '/calendario',      icon: 'ti-calendar',         roles: ['super_admin','admin','tutor'] },
  { label: 'Fichas pedagógicas', href: '/fichas',       icon: 'ti-books',            roles: ['super_admin','admin','tutor'] },
  { label: 'Reportes',        href: '/reportes',        icon: 'ti-file-analytics',   roles: ['super_admin','admin','tutor'] },
]

const NAV_CUENTA: NavItem[] = [
  { label: 'Colegios',        href: '/super-admin',     icon: 'ti-building-school',  roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/super-admin/usuarios', icon: 'ti-user-cog',   roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/usuarios',        icon: 'ti-user-cog',         roles: ['admin'] },
  { label: 'Configuración',   href: '/configuracion',   icon: 'ti-settings',         roles: ['super_admin','admin'] },
]

// APODERADO = Portal familiar
const NAV_APODERADO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                  icon: 'ti-home',             roles: ['apoderado'] },
  { label: 'Comunicados',     href: '/portal/comunicados',      icon: 'ti-speakerphone',     roles: ['apoderado'] },
  { label: 'Asistencias',     href: '/portal/asistencias',      icon: 'ti-clipboard-check',  roles: ['apoderado'] },
  { label: 'Calificaciones',  href: '/portal/calificaciones',   icon: 'ti-chart-bar',        roles: ['apoderado'] },
  { label: 'Estado de pagos', href: '/portal/pagos',            icon: 'ti-cash',             roles: ['apoderado'] },
  { label: 'Mi perfil',       href: '/portal/perfil',           icon: 'ti-user',             roles: ['apoderado'] },
]

// ALUMNO = Portal estudiante
const NAV_ALUMNO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                  icon: 'ti-home',             roles: ['alumno'] },
  { label: 'Mis notas',       href: '/portal/calificaciones',   icon: 'ti-chart-bar',        roles: ['alumno'] },
  { label: 'Asistencias',     href: '/portal/asistencias',      icon: 'ti-clipboard-check',  roles: ['alumno'] },
  { label: 'Tareas',          href: '/portal/tareas',           icon: 'ti-checklist',        roles: ['alumno'] },
  { label: 'Comunicados',     href: '/portal/comunicados',      icon: 'ti-speakerphone',     roles: ['alumno'] },
  { label: 'Mi perfil',       href: '/portal/perfil',           icon: 'ti-user',             roles: ['alumno'] },
]

const ROL_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  super_admin: { label: 'Super Admin',   color: 'bg-red-50 text-red-700',      icon: 'ti-shield-check' },
  admin:       { label: 'Administrativo',color: 'bg-blue-50 text-blue-700',    icon: 'ti-briefcase' },
  tutor:       { label: 'Profesor',      color: 'bg-violet-50 text-violet-700',icon: 'ti-school' },
  apoderado:   { label: 'Apoderado',     color: 'bg-emerald-50 text-emerald-700',icon: 'ti-heart-handshake' },
  alumno:      { label: 'Alumno',        color: 'bg-amber-50 text-amber-700',  icon: 'ti-backpack' },
}

interface Props { rol?: string }

export default function Sidebar({ rol = 'admin' }: Props) {
  const pathname  = usePathname()
  const rolTyped  = rol as Rol
  const badge     = ROL_BADGE[rolTyped]
  const isPortal  = rolTyped === 'apoderado' || rolTyped === 'alumno'

  function renderGroup(items: NavItem[], section: string) {
    const visibles = items.filter(i => i.roles.includes(rolTyped))
    if (!visibles.length) return null
    return (
      <div className="mb-4">
        <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{section}</div>
        {visibles.map(item => {
          const active = pathname === item.href || (item.href !== '/inicio' && item.href !== '/portal' && pathname.startsWith(item.href))
          return (
            <Link key={item.href + item.label} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <i className={`ti ${item.icon} text-base flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true"/>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && <span className="bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full leading-none">{item.badge}</span>}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <div className="px-3 pt-3 pb-1">
        {badge && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
            <i className={`ti ${badge.icon} text-xs`} aria-hidden="true"/> {badge.label}
          </div>
        )}
      </div>
      <nav className="flex-1 py-2 px-2">
        {rolTyped === 'apoderado' && renderGroup(NAV_APODERADO, 'Mi espacio')}
        {rolTyped === 'alumno'    && renderGroup(NAV_ALUMNO,    'Mi espacio')}
        {!isPortal && (
          <>
            {renderGroup(NAV_PRINCIPAL, 'Principal')}
            {renderGroup(NAV_GESTION,   'Gestión')}
            {renderGroup(NAV_CUENTA,    'Cuenta')}
          </>
        )}
      </nav>
    </aside>
  )
}