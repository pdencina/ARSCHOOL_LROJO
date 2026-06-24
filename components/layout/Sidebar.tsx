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
  { label: 'Evaluaciones',   href: '/calificaciones',  icon: 'ti-chart-bar',        roles: ['super_admin','admin','tutor'] },
  { label: 'Comunicados',     href: '/comunicados',     icon: 'ti-speakerphone',     roles: ['super_admin','admin','tutor'] },
  { label: 'Mensajes',        href: '/mensajes',        icon: 'ti-message-2',        roles: ['super_admin','admin','tutor'] },
  { label: 'Libro de clases', href: '/libro-clases',    icon: 'ti-notebook',         roles: ['tutor'] },
  { label: 'Reporte diario', href: '/reporte-diario', icon: 'ti-clipboard-heart',  roles: ['super_admin','admin','tutor'] },
]

const NAV_GESTION: NavItem[] = [
  { label: 'Cobranzas',          href: '/contable',     icon: 'ti-cash',             roles: ['super_admin','admin'] },
  { label: 'Documentos',         href: '/documentos',   icon: 'ti-folder',           roles: ['super_admin','admin','tutor'] },
  { label: 'Calendario',         href: '/calendario',   icon: 'ti-calendar',         roles: ['super_admin','admin','tutor'] },
  { label: 'Fichas pedagógicas', href: '/fichas',       icon: 'ti-books',            roles: ['super_admin','admin','tutor'] },
  { label: 'Reportes',           href: '/reportes',     icon: 'ti-file-analytics',   roles: ['super_admin','admin'] },
]

const NAV_CUENTA: NavItem[] = [
  { label: 'Colegios',        href: '/super-admin',          icon: 'ti-building-school', roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/super-admin/usuarios', icon: 'ti-user-cog',        roles: ['super_admin'] },
  { label: 'Configuración',   href: '/configuracion',        icon: 'ti-settings',        roles: ['super_admin'] },
]

const NAV_APODERADO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                icon: 'ti-home',            roles: ['apoderado'] },
  { label: 'Reporte del día', href: '/portal/reporte-diario', icon: 'ti-clipboard-heart', roles: ['apoderado'] },
  { label: 'Mensajes',        href: '/portal/mensajes',       icon: 'ti-message-2',       roles: ['apoderado'] },
  { label: 'Comunicados',     href: '/portal/comunicados',    icon: 'ti-speakerphone',    roles: ['apoderado'] },
  { label: 'Asistencias',     href: '/portal/asistencias',    icon: 'ti-clipboard-check', roles: ['apoderado'] },
  { label: 'Evaluaciones',   href: '/portal/calificaciones', icon: 'ti-chart-bar',       roles: ['apoderado'] },
  { label: 'Estado de pagos', href: '/portal/pagos',          icon: 'ti-cash',            roles: ['apoderado'] },
  { label: 'Mi perfil',       href: '/portal/perfil',         icon: 'ti-user',            roles: ['apoderado'] },
]

const NAV_ALUMNO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                icon: 'ti-home',            roles: ['alumno'] },
  { label: 'Mis evaluaciones', href: '/portal/calificaciones', icon: 'ti-chart-bar',       roles: ['alumno'] },
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

interface Props { rol?: string; modulosHabilitados?: string[] | null }

// Mapeo: href del sidebar → key del módulo en BD
const HREF_TO_MODULO: Record<string, string> = {
  '/inicio': 'inicio',
  '/alumnos': 'alumnos',
  '/planificacion': 'planificacion',
  '/asistencias': 'asistencias',
  '/calificaciones': 'evaluaciones',
  '/comunicados': 'comunicados',
  '/mensajes': 'mensajes',
  '/libro-clases': 'libro_clases',
  '/reporte-diario': 'reporte_diario',
  '/contable': 'cobranzas',
  '/documentos': 'documentos',
  '/calendario': 'calendario',
  '/fichas': 'fichas',
  '/reportes': 'reportes',
  '/portal': 'inicio',
  '/portal/reporte-diario': 'reporte_diario',
  '/portal/mensajes': 'mensajes',
  '/portal/comunicados': 'comunicados',
  '/portal/asistencias': 'asistencias',
  '/portal/calificaciones': 'evaluaciones',
  '/portal/pagos': 'pagos',
  '/portal/perfil': 'perfil',
  '/portal/tareas': 'tareas',
}

export default function Sidebar({ rol = 'admin', modulosHabilitados = null }: Props) {
  const pathname  = usePathname()
  const rolTyped  = rol as Rol
  const badge     = ROL_BADGE[rolTyped]
  const isPortal  = rolTyped === 'apoderado' || rolTyped === 'alumno'

  function renderGroup(items: NavItem[], section: string) {
    let visibles = items.filter(i => i.roles.includes(rolTyped))
    // Filtrar por permisos de BD si existen
    if (modulosHabilitados) {
      visibles = visibles.filter(i => {
        const modKey = HREF_TO_MODULO[i.href]
        if (!modKey) return true // Si no tiene mapeo, mostrar siempre
        return modulosHabilitados.includes(modKey)
      })
    }
    if (!visibles.length) return null
    return (
      <div className="mb-6">
        <div className="px-3 py-1 text-[10px] font-bold text-[#b0b7c3] uppercase tracking-[0.1em] mb-2">{section}</div>
        {visibles.map(item => {
          const active = pathname === item.href || (item.href !== '/inicio' && item.href !== '/portal' && pathname.startsWith(item.href))
          return (
            <Link key={item.href + item.label} href={item.href}
              className={`group relative flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium mb-[2px] transition-all duration-150 ${
                active
                  ? 'bg-[var(--ar-navy)] text-white'
                  : 'text-[#5f6876] hover:bg-[#f4f5f7] hover:text-[var(--ar-text)]'
              }`}
              style={active ? { boxShadow: '0 1px 3px rgba(26,35,50,0.15)' } : undefined}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--ar-accent)] rounded-r-full"/>}
              <i className={`ti ${item.icon} text-[15px] flex-shrink-0 transition-colors duration-150 ${active ? 'text-[var(--ar-accent)]' : 'text-[#b0b7c3] group-hover:text-[#7c8390]'}`} aria-hidden="true"/>
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
