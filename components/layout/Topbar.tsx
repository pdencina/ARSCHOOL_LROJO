'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const ROL_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrativo',
  tutor:       'Profesor',
  apoderado:   'Apoderado',
  alumno:      'Alumno',
}

export default function Topbar({ usuario }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const rol      = usuario?.rol ?? 'admin'

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciales = `${usuario?.nombre?.[0] ?? ''}${usuario?.apellido?.[0] ?? ''}`.toUpperCase()

  return (
    <header className="bg-[#0F1B2D] border-b border-white/10 sticky top-0 z-30">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Logo */}
        <Link href={rol === 'apoderado' || rol === 'alumno' ? '/portal' : '/inicio'} className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-display font-bold text-white text-sm">AR</div>
          <div>
            <div className="font-display font-semibold text-white text-sm leading-none">AR School</div>
            <div className="text-white/40 text-xs mt-0.5 leading-none">
              {rol === 'super_admin' ? 'Fundación ARM Global' : usuario?.colegio?.nombre ?? 'Plataforma educacional'}
            </div>
          </div>
        </Link>

        {/* User info + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-white/80 text-sm font-medium">{usuario?.nombre} {usuario?.apellido}</div>
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
