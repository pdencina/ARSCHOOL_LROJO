'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Rol = 'super_admin' | 'admin' | 'tutor' | 'apoderado' | 'alumno'

interface NavItem {
  label: string; href: string; icon: string; badge?: number; roles: Rol[]
}

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
  { label: 'Cobranzas',          href: '/contable',     icon: 'ti-cash',             roles: ['super_admin','admin'] },
  { label: 'Calendario',         href: '/calendario',   icon: 'ti-calendar',         roles: ['super_admin','admin','tutor'] },
  { label: 'Fichas pedagógicas', href: '/fichas',       icon: 'ti-books',            roles: ['super_admin','admin','tutor'] },
  { label: 'Reportes',           href: '/reportes',     icon: 'ti-file-analytics',   roles: ['super_admin','admin','tutor'] },
]

const NAV_CUENTA: NavItem[] = [
  { label: 'Colegios',        href: '/super-admin',          icon: 'ti-building-school', roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/super-admin/usuarios', icon: 'ti-user-cog',        roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/usuarios',             icon: 'ti-user-cog',        roles: ['admin'] },
  { label: 'Configuración',   href: '/configuracion',        icon: 'ti-settings',        roles: ['super_admin','admin'] },
]

const NAV_APODERADO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                icon: 'ti-home',            roles: ['apoderado'] },
  { label: 'Comunicados',     href: '/portal/comunicados',    icon: 'ti-speakerphone',    roles: ['apoderado'] },
  { label: 'Asistencias',     href: '/portal/asistencias',    icon: 'ti-clipboard-check', roles: ['apoderado'] },
  { label: 'Calificaciones',  href: '/portal/calificaciones', icon: 'ti-chart-bar',       roles: ['apoderado'] },
  { label: 'Estado de pagos', href: '/portal/pagos',          icon: 'ti-cash',            roles: ['apoderado'] },
  { label: 'Mi perfil',       href: '/portal/perfil',         icon: 'ti-user',            roles: ['apoderado'] },
]

const NAV_ALUMNO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                icon: 'ti-home',            roles: ['alumno'] },
  { label: 'Mis notas',       href: '/portal/calificaciones', icon: 'ti-chart-bar',       roles: ['alumno'] },
  { label: 'Asistencias',     href: '/portal/asistencias',    icon: 'ti-clipboard-check', roles: ['alumno'] },
  { label: 'Tareas',          href: '/portal/tareas',         icon: 'ti-checklist',       roles: ['alumno'] },
  { label: 'Comunicados',     href: '/portal/comunicados',    icon: 'ti-speakerphone',    roles: ['alumno'] },
  { label: 'Mi perfil',       href: '/portal/perfil',         icon: 'ti-user',            roles: ['alumno'] },
]

const ROL_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  super_admin: { label: 'Administración General', color: 'bg-[#fdf8ee] text-[#92400e] border border-[#fde68a]/40', icon: 'ti-shield-check' },
  admin:       { label: 'Administración',         color: 'bg-[#f0f4f8] text-[#2c4a6e] border border-[#bfdbfe]/40', icon: 'ti-briefcase' },
  tutor:       { label: 'Docente',                color: 'bg-violet-50/80 text-violet-800 border border-violet-100', icon: 'ti-school' },
  apoderado:   { label: 'Apoderado',              color: 'bg-emerald-50/80 text-emerald-800 border border-emerald-100', icon: 'ti-heart-handshake' },
  alumno:      { label: 'Alumno',                 color: 'bg-[#fdf8ee] text-[#92400e] border border-[#fde68a]/40', icon: 'ti-backpack' },
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
      <div className="mb-6">
        <div className="px-3 py-1 text-[10px] font-bold text-[#b0b7c3] uppercase tracking-[0.1em] mb-2">{section}</div>
        {visibles.map(item => {
          const active = pathname === item.href || (item.href !== '/inicio' && item.href !== '/portal' && pathname.startsWith(item.href))
          return (
            <Link key={item.href + item.label} href={item.href}
              className={`group relative flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium mb-[2px] transition-all duration-200 ${
                active
                  ? 'bg-[var(--ar-navy)] text-white shadow-sm'
                  : 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[var(--ar-text)]'
              }`}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--ar-accent)] rounded-r-full"/>}
              <i className={`ti ${item.icon} text-[15px] flex-shrink-0 transition-colors duration-200 ${active ? 'text-[var(--ar-accent)]' : 'text-[#9ca3af] group-hover:text-[#6b7280]'}`} aria-hidden="true"/>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && <span className="bg-[var(--ar-danger)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">{item.badge}</span>}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="w-[220px] bg-white border-r border-[var(--ar-border)] flex flex-col shrink-0 min-h-[calc(100vh-56px)]">
      <div className="px-4 pt-5 pb-3">
        {badge && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg text-[10px] font-semibold ${badge.color}`}>
            <i className={`ti ${badge.icon} text-[10px]`} aria-hidden="true"/> {badge.label}
          </div>
        )}
      </div>
      <nav className="flex-1 py-2 px-3 overflow-y-auto">
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
      <div className="px-4 py-3 border-t border-[#f3f4f6]">
        <div className="text-[10px] text-[#d1d5db] tracking-wide">AR School v1.0</div>
      </div>
    </aside>
  )
}
