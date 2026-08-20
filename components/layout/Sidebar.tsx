'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type Rol = 'super_admin' | 'admin' | 'pastor_campus' | 'gestor_admision' | 'coordinador' | 'tutor_supervisor' | 'tutor' | 'apoderado' | 'alumno'

interface NavItem {
  label: string; href: string; icon: string; badge?: number; roles: Rol[]
}

const NAV_PRINCIPAL: NavItem[] = [
  { label: 'Inicio',          href: '/inicio',          icon: 'ti-home',             roles: ['super_admin','admin','pastor_campus','gestor_admision','tutor','tutor_supervisor','coordinador'] },
  { label: 'Control',         href: '/control',         icon: 'ti-door-enter',       roles: ['super_admin','admin','pastor_campus','tutor_supervisor'] },
  { label: 'Matrícula',       href: '/matricula',       icon: 'ti-user-plus',        roles: ['super_admin','admin','pastor_campus','gestor_admision','coordinador'] },
  { label: 'Mis alumnos',     href: '/alumnos',         icon: 'ti-users',            roles: ['tutor'] },
  { label: 'Alumnos',         href: '/alumnos',         icon: 'ti-users',            roles: ['super_admin','admin','pastor_campus','gestor_admision','coordinador'] },
  { label: 'Planificación',   href: '/planificacion',   icon: 'ti-layout-board',     roles: ['super_admin','admin','pastor_campus','tutor'] },
  { label: 'Asistencias',     href: '/asistencias',     icon: 'ti-clipboard-check',  roles: ['super_admin','admin','pastor_campus','tutor','coordinador'] },
  { label: 'Evaluaciones',   href: '/calificaciones',  icon: 'ti-chart-bar',        roles: ['super_admin','admin','pastor_campus','tutor'] },
  { label: 'Comunicados',     href: '/comunicados',     icon: 'ti-speakerphone',     roles: ['super_admin','admin','pastor_campus','gestor_admision','tutor','coordinador'] },
  { label: 'Mensajes',        href: '/mensajes',        icon: 'ti-message-2',        roles: ['super_admin','admin','pastor_campus','gestor_admision','tutor','coordinador'] },
  { label: 'Libro de clases', href: '/libro-clases',    icon: 'ti-notebook',         roles: ['pastor_campus','tutor'] },
  { label: 'Reporte diario', href: '/reporte-diario', icon: 'ti-clipboard-heart',  roles: ['super_admin','admin','pastor_campus','tutor'] },
  { label: 'Tareas',         href: '/tareas',         icon: 'ti-checklist',        roles: ['super_admin','admin','pastor_campus','tutor'] },
]

const NAV_PROGRAMAS: NavItem[] = [
  { label: 'Lions Soccer',    href: '/lions',    icon: 'ti-ball-football',  roles: ['super_admin','admin','pastor_campus','coordinador'] },
  { label: 'AR Worship',      href: '/worship',  icon: 'ti-music',          roles: ['super_admin','admin','pastor_campus','coordinador'] },
]

const NAV_GESTION: NavItem[] = [
  { label: 'Aportes',             href: '/contable',     icon: 'ti-cash',             roles: ['super_admin','admin','pastor_campus','gestor_admision'] },
  { label: 'Cobranza',           href: '/cobranza',     icon: 'ti-report-money',     roles: ['super_admin','admin','pastor_campus'] },
  { label: 'Becas',              href: '/becas',        icon: 'ti-school',           roles: ['super_admin','admin','pastor_campus','gestor_admision'] },
  { label: 'Documentos',         href: '/documentos',   icon: 'ti-folder',           roles: ['super_admin','admin','pastor_campus','gestor_admision','tutor','coordinador'] },
  { label: 'Calendario',         href: '/calendario',   icon: 'ti-calendar',         roles: ['super_admin','admin','pastor_campus','gestor_admision','tutor','coordinador'] },
  { label: 'Fichas pedagógicas', href: '/fichas',       icon: 'ti-books',            roles: ['super_admin','admin','pastor_campus','tutor','coordinador'] },
  { label: 'Reportes',           href: '/reportes',     icon: 'ti-file-analytics',   roles: ['super_admin','admin','pastor_campus'] },
]

const NAV_CUENTA: NavItem[] = [
  { label: 'Sedes',          href: '/super-admin',          icon: 'ti-building-school', roles: ['super_admin'] },
  { label: 'Usuarios',        href: '/usuarios',             icon: 'ti-user-cog',        roles: ['pastor_campus'] },
  { label: 'Usuarios',        href: '/super-admin/usuarios', icon: 'ti-user-cog',        roles: ['super_admin'] },
  { label: 'Tabla de aportes', href: '/super-admin/aportes', icon: 'ti-table',           roles: ['super_admin'] },
  { label: 'Configuración',   href: '/configuracion',        icon: 'ti-settings',        roles: ['super_admin','pastor_campus'] },
]

const NAV_APODERADO: NavItem[] = [
  { label: 'Inicio',          href: '/portal',                icon: 'ti-home',            roles: ['apoderado'] },
  { label: 'Reporte del día', href: '/portal/reporte-diario', icon: 'ti-clipboard-heart', roles: ['apoderado'] },
  { label: 'Mensajes',        href: '/portal/mensajes',       icon: 'ti-message-2',       roles: ['apoderado'] },
  { label: 'Comunicados',     href: '/portal/comunicados',    icon: 'ti-speakerphone',    roles: ['apoderado'] },
  { label: 'Documentos',      href: '/portal/documentos',     icon: 'ti-file-certificate', roles: ['apoderado'] },
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

const ROL_BADGE: Record<string, { label: string; color: string; icon: string; accent: string; activeBg: string; activeIndicator: string }> = {
  super_admin:     { label: 'Super Admin',     color: 'bg-[#FEF3EC] text-[#C45A1A] border border-[#C45A1A]/20', icon: 'ti-shield-check',      accent: '#C45A1A', activeBg: 'bg-[#C45A1A]', activeIndicator: '#C45A1A' },
  admin:           { label: 'Administrador',   color: 'bg-[#FEF3EC] text-[#C45A1A] border border-[#C45A1A]/20', icon: 'ti-briefcase',         accent: '#C45A1A', activeBg: 'bg-[#C45A1A]', activeIndicator: '#C45A1A' },
  pastor_campus:   { label: 'Pastor Campus',   color: 'bg-[#F0EDF8] text-[#4A3080] border border-[#4A3080]/15', icon: 'ti-building-church',   accent: '#4A3080', activeBg: 'bg-[#4A3080]', activeIndicator: '#4A3080' },
  gestor_admision: { label: 'Gestión Admisión', color: 'bg-[#EDF6FA] text-[#1B3A5C] border border-[#1B3A5C]/15', icon: 'ti-user-plus',        accent: '#1B3A5C', activeBg: 'bg-[#1B3A5C]', activeIndicator: '#1B3A5C' },
  coordinador:     { label: 'Coordinador',     color: 'bg-[#FEF3EC] text-[#C45A1A] border border-[#C45A1A]/20', icon: 'ti-star',              accent: '#C45A1A', activeBg: 'bg-[#C45A1A]', activeIndicator: '#C45A1A' },
  tutor_supervisor:{ label: 'Tutor Supervisor', color: 'bg-[#EDF6FA] text-[#3D7A94] border border-[#3D7A94]/15', icon: 'ti-door-enter',        accent: '#3D7A94', activeBg: 'bg-[#3D7A94]', activeIndicator: '#3D7A94' },
  tutor:           { label: 'Tutor',           color: 'bg-[#EDF5F0] text-[#2D5A3F] border border-[#2D5A3F]/20', icon: 'ti-school',            accent: '#2D5A3F', activeBg: 'bg-[#2D5A3F]', activeIndicator: '#2D5A3F' },
  apoderado:       { label: 'Apoderado',       color: 'bg-[#EDF6FA] text-[#3D7A94] border border-[#3D7A94]/15', icon: 'ti-heart-handshake',   accent: '#3D7A94', activeBg: 'bg-[#3D7A94]', activeIndicator: '#3D7A94' },
  alumno:          { label: 'Alumno',          color: 'bg-[#F3EFFE] text-[#6B4C9A] border border-[#6B4C9A]/20', icon: 'ti-backpack',          accent: '#6B4C9A', activeBg: 'bg-[#6B4C9A]', activeIndicator: '#6B4C9A' },
}

interface Props { rol?: string; modulosHabilitados?: string[] | null }

// Mapeo: href del sidebar → key del módulo en BD
const HREF_TO_MODULO: Record<string, string> = {
  '/inicio': 'inicio',
  '/control': 'control',
  '/matricula': 'matricula',
  '/alumnos': 'alumnos',
  '/planificacion': 'planificacion',
  '/asistencias': 'asistencias',
  '/calificaciones': 'evaluaciones',
  '/comunicados': 'comunicados',
  '/mensajes': 'mensajes',
  '/libro-clases': 'libro_clases',
  '/reporte-diario': 'reporte_diario',
  '/tareas': 'tareas',
  '/contable': 'cobranzas',
  '/cobranza': 'cobranzas',
  '/becas': 'cobranzas',
  '/documentos': 'documentos',
  '/calendario': 'calendario',
  '/fichas': 'fichas',
  '/reportes': 'reportes',
  '/lions': 'lions_soccer',
  '/worship': 'ar_worship',
  '/portal': 'inicio',
  '/portal/reporte-diario': 'reporte_diario',
  '/portal/mensajes': 'mensajes',
  '/portal/comunicados': 'comunicados',
  '/portal/asistencias': 'asistencias',
  '/portal/calificaciones': 'evaluaciones',
  '/portal/pagos': 'pagos',
  '/portal/documentos': 'documentos',
  '/portal/perfil': 'perfil',
  '/portal/tareas': 'tareas',
}

export default function Sidebar({ rol = 'admin', modulosHabilitados = null }: Props) {
  const pathname  = usePathname()
  const rolTyped  = rol as Rol
  const badge     = ROL_BADGE[rolTyped]
  const isPortal  = rolTyped === 'apoderado' || rolTyped === 'alumno'

  // Mensajes no leídos
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    let mounted = true

    async function fetchUnread() {
      try {
        const res = await fetch('/api/chat')
        if (res.ok) {
          const convs = await res.json()
          const total = (convs as any[]).reduce((acc: number, c: any) => acc + (c.no_leidos ?? 0), 0)
          if (mounted) setUnreadMessages(total)
        }
      } catch { /* silently fail */ }
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // Cada 30s

    return () => { mounted = false; clearInterval(interval) }
  }, [])

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
    // Inyectar badge de mensajes no leídos
    visibles = visibles.map(i => {
      if ((i.href === '/mensajes' || i.href === '/portal/mensajes') && unreadMessages > 0) {
        return { ...i, badge: unreadMessages }
      }
      return i
    })
    if (!visibles.length) return null

    const roleAccent = badge?.accent || '#1B3A5C'

    return (
      <div className="mb-6">
        <div className="px-3 py-1 text-[10px] font-bold text-[var(--ar-muted)] uppercase tracking-[0.1em] mb-2">{section}</div>
        {visibles.map(item => {
          const active = pathname === item.href || (item.href !== '/inicio' && item.href !== '/portal' && pathname.startsWith(item.href))
          return (
            <Link key={item.href + item.label} href={item.href}
              className={`group relative flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium mb-[2px] transition-all duration-150 ${
                active
                  ? 'text-white'
                  : 'text-[#5f6876] hover:bg-[#f4f5f7] hover:text-[var(--ar-text)]'
              }`}
              style={active ? { backgroundColor: roleAccent, boxShadow: '0 1px 3px rgba(26,35,50,0.15)' } : undefined}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-white/60 rounded-r-full"/>}
              <i className={`ti ${item.icon} text-[15px] flex-shrink-0 transition-colors duration-150 ${active ? 'text-white/90' : 'text-[var(--ar-muted)] group-hover:text-[#7c8390]'}`} aria-hidden="true"/>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">{item.badge}</span>}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <aside className="w-[220px] lg:w-[220px] bg-white border-r border-[var(--ar-border)] flex flex-col shrink-0 h-full min-h-[calc(100vh-56px)] relative">
      {/* Role accent strip at top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-b-sm" style={{ backgroundColor: badge?.accent || '#1B3A5C' }}/>
      <div className="px-4 pt-5 pb-3">
        {badge && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg text-[10px] font-semibold ${badge.color}`}>
            <i className={`ti ${badge.icon} text-[11px]`} aria-hidden="true"/> {badge.label}
          </div>
        )}
      </div>
      <nav className="flex-1 py-2 px-3 overflow-y-auto" aria-label="Navegación principal">
        {rolTyped === 'apoderado' && renderGroup(NAV_APODERADO, 'Mi espacio')}
        {rolTyped === 'alumno'    && renderGroup(NAV_ALUMNO,    'Mi espacio')}
        {!isPortal && (
          <>
            {renderGroup(NAV_PRINCIPAL, 'Principal')}
            {renderGroup(NAV_PROGRAMAS, 'Programas')}
            {renderGroup(NAV_GESTION,   'Gestión')}
            {renderGroup(NAV_CUENTA,    'Cuenta')}
          </>
        )}
      </nav>
      <div className="px-4 py-3 border-t border-[#f3f4f6]">
        <div className="text-[10px] text-[var(--ar-muted)] tracking-wide">AR School v1.0</div>
      </div>
    </aside>
  )
}
