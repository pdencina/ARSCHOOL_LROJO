'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const TABS = [
  { label: 'Fichas',       href: '/fichas',       dot: '#C0392B' },
  { label: 'Contable',     href: '/contable',     dot: '#F7DC6F' },
  { label: 'Comunicacion', href: '/comunicacion', dot: '#4A90D9' },
  { label: 'Evaluaciones', href: '/evaluaciones', dot: '#27AE60' },
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
    <header className="bg-azul border-b-[3px] border-[#154360] flex items-center justify-between pl-0 pr-5 relative z-20">
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#0B2C46]" />
      <div className="flex items-center gap-3 py-3.5 pl-7">
        <div className="w-9 h-9 bg-white rounded flex items-center justify-center font-playfair font-black text-azul text-sm shadow-sm">
          AR
        </div>
        <div>
          <div className="font-playfair font-bold text-white text-lg leading-tight">AR School</div>
          <div className="font-mono text-xs text-white/50 tracking-widest leading-none">Plataforma educacional</div>
        </div>
      </div>

      <nav className="flex h-full">
        {TABS.map(t => {
          const active = pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 px-4 py-[18px] font-mono text-xs tracking-widest uppercase border-b-[3px] transition-all ${active ? 'text-white border-yellow-400' : 'text-white/50 border-transparent hover:text-white/80 hover:border-white/25'}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? '#F7DC6F' : t.dot, opacity: active ? 1 : 0.5 }}
              />
              {t.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs text-white/60 hidden md:block">
          {usuario?.colegio?.nombre ?? 'AR School Global'}
        </span>
        <button
          onClick={logout}
          className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-mono text-xs font-bold text-azul hover:bg-yellow-300 transition-colors"
          title="Cerrar sesion"
        >
          {iniciales}
        </button>
      </div>
    </header>
  )
}