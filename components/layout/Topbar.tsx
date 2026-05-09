'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const ROL_TABS: Record<string, { label: string; href: string }[]> = {
  super_admin: [
    { label: 'Alumnos',       href: '/alumnos' },
    { label: 'Asistencias',   href: '/asistencias' },
    { label: 'Calificaciones',href: '/calificaciones' },
    { label: 'Comunicados',   href: '/comunicados' },
    { label: 'Cobranzas',     href: '/contable' },
    { label: 'Colegios',      href: '/super-admin' },
  ],
  admin: [
    { label: 'Alumnos',       href: '/alumnos' },
    { label: 'Asistencias',   href: '/asistencias' },
    { label: 'Calificaciones',href: '/calificaciones' },
    { label: 'Comunicados',   href: '/comunicados' },
    { label: 'Cobranzas',     href: '/contable' },
    { label: 'Reportes',      href: '/reportes' },
  ],
  tutor: [
    { label: 'Mis alumnos',   href: '/alumnos' },
    { label: 'Planificación', href: '/planificacion' },
    { label: 'Asistencias',   href: '/asistencias' },
    { label: 'Calificaciones',href: '/calificaciones' },
    { label: 'Comunicados',   href: '/comunicados' },
    { label: 'Libro de clases',href: '/libro-clases' },
  ],
  apoderado: [
    { label: 'Comunicados',   href: '/portal/comunicados' },
    { label: 'Asistencias',   href: '/portal/asistencias' },
    { label: 'Calificaciones',href: '/portal/calificaciones' },
    { label: 'Pagos',         href: '/portal/pagos' },
  ],
  alumno: [
    { label: 'Mis notas',     href: '/portal/calificaciones' },
    { label: 'Asistencias',   href: '/portal/asistencias' },
    { label: 'Tareas',        href: '/portal/tareas' },
    { label: 'Comunicados',   href: '/portal/comunicados' },
  ],
}

const ROL_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrativo',
  tutor:       'Profesor',
  apoderado:   'Apoderado',
  alumno:      'Alumno',
}

export default function Topbar({ usuario }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const rol      = usuario?.rol ?? 'admin'
  const tabs     = ROL_TABS[rol] ?? ROL_TABS.admin

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciales = `${usuario?.nombre?.[0] ?? ''}${usuario?.apellido?.[0] ?? ''}`.toUpperCase()

  return (
    <header className="bg-[#0F1B2D] border-b border-white/10 sticky top-0 z-30">
      <div className="flex items-center h-14 px-6">
        {/* Logo */}
        <Link href="/inicio" className="flex items-center gap-3 mr-8 shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm">AR</div>
          <div>
            <div className="font-display font-semibold text-white text-sm leading-none">AR School</div>
            <div className="text-white/40 text-xs mt-0.5 leading-none">
              {rol === 'super_admin' ? 'Fundación ARM Global' : usuario?.colegio?.nombre ?? 'Plataforma educacional'}
            </div>
          </div>
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const active = pathname === t.href || (t.href !== '/inicio' && t.href !== '/portal' && pathname.startsWith(t.href))
            return (
              <Link key={t.href} href={t.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  active ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}>
                {t.label}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-white/70 text-xs font-medium">{usuario?.nombre} {usuario?.apellido}</div>
            <div className="text-white/40 text-xs">{ROL_LABEL[rol] ?? rol}</div>
          </div>
          <button onClick={logout}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-medium text-white text-xs hover:bg-blue-400 transition-colors"
            title="Cerrar sesión">
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  )
}