'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const TABS = [
  { label: 'Fichas',         href: '/fichas' },
  { label: 'Comunicados',    href: '/comunicados' },
  { label: 'Asistencias',    href: '/asistencias' },
  { label: 'Calificaciones', href: '/calificaciones' },
  { label: 'Cobranzas',      href: '/contable' },
]

export default function Topbar({ usuario }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm">
            AR
          </div>
          <div>
            <div className="font-display font-semibold text-white text-sm leading-none">AR School</div>
            <div className="text-white/40 text-xs mt-0.5">Plataforma educacional</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {TABS.map(t => {
            const active = pathname.startsWith(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-white/70 text-xs">{usuario?.colegio?.nombre ?? 'AR School Global'}</div>
            <div className="text-white/40 text-xs">{usuario?.rol ?? 'Usuario'}</div>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-medium text-white text-xs hover:bg-blue-400 transition-colors"
            title="Cerrar sesion"
          >
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  )
}