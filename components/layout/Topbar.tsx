'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const TABS_ADMIN = [
  { label: 'Fichas',         href: '/fichas' },
  { label: 'Comunicados',    href: '/comunicados' },
  { label: 'Asistencias',    href: '/asistencias' },
  { label: 'Calificaciones', href: '/calificaciones' },
  { label: 'Cobranzas',      href: '/contable' },
]

const TABS_DOCENTE = [
  { label: 'Fichas',         href: '/fichas' },
  { label: 'Comunicados',    href: '/comunicados' },
  { label: 'Asistencias',    href: '/asistencias' },
  { label: 'Calificaciones', href: '/calificaciones' },
]

const TABS_PORTAL = [
  { label: 'Comunicados',    href: '/portal/comunicados' },
  { label: 'Asistencias',    href: '/portal/asistencias' },
  { label: 'Calificaciones', href: '/portal/calificaciones' },
]

const ROL_BADGE: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500/20 text-red-300' },
  admin:       { label: 'Admin',       color: 'bg-blue-500/20 text-blue-300' },
  docente:     { label: 'Docente',     color: 'bg-violet-500/20 text-violet-300' },
  tutor:       { label: 'Apoderado',   color: 'bg-emerald-500/20 text-emerald-300' },
  alumno:      { label: 'Alumno',      color: 'bg-amber-500/20 text-amber-300' },
}

export default function Topbar({ usuario }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const rol = usuario?.rol ?? 'admin'

  const tabs = rol === 'docente' ? TABS_DOCENTE
    : (rol === 'tutor' || rol === 'alumno') ? TABS_PORTAL
    : TABS_ADMIN

  const badge = ROL_BADGE[rol]

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciales = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : 'U'

  return (
    <header className="bg-[#0F1B2D] border-b border-white/10 sticky top-0 z-30">
      <div className="flex items-center h-14 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm">AR</div>
          <div>
            <div className="font-display font-semibold text-white text-sm leading-none">AR School</div>
            <div className="text-white/40 text-xs mt-0.5">
              {rol === 'super_admin' ? 'Fundación ARM Global' : usuario?.colegio?.nombre ?? 'Plataforma educacional'}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {tabs.map(t => {
            const active = pathname.startsWith(t.href)
            return (
              <Link key={t.href} href={t.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}>
                {t.label}
              </Link>
            )
          })}
          {/* Super admin: selector de colegio */}
          {rol === 'super_admin' && (
            <Link href="/super-admin"
              className={`ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                pathname.startsWith('/super-admin') ? 'bg-red-500/20 text-red-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}>
              <i className="ti ti-building-school text-sm" aria-hidden="true"/> Colegios
            </Link>
          )}
        </nav>

        {/* User */}
        <div className="flex items-center gap-2.5">
          {badge && (
            <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
              {badge.label}
            </span>
          )}
          <div className="text-right hidden md:block">
            <div className="text-white/70 text-xs">{usuario?.nombre} {usuario?.apellido}</div>
          </div>
          <button onClick={logout}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-medium text-white text-xs hover:bg-blue-400 transition-colors"
            title="Cerrar sesion">
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  )
}