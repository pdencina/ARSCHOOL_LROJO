'use client'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { usuario: any }

const ROL_LABEL: Record<string, string> = {
  super_admin: 'Administrador General',
  admin:       'Administración',
  tutor:       'Docente',
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
          <Image src="/logo.svg" alt="AR School" width={36} height={36} className="rounded-lg"/>
          <div>
            <div className="font-display font-semibold text-white text-sm leading-none tracking-wide">AR SCHOOL</div>
            <div className="text-white/40 text-[10px] mt-0.5 leading-none uppercase tracking-widest">
              {rol === 'super_admin' ? 'Gestión Educacional' : usuario?.colegio?.nombre ?? 'Gestión Educacional'}
            </div>
          </div>
        </Link>

        {/* User info + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-white/80 text-sm font-medium">{usuario?.nombre} {usuario?.apellido}</div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider">{ROL_LABEL[rol] ?? rol}</div>
          </div>
          <button onClick={logout}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-semibold text-white text-xs hover:from-amber-400 hover:to-amber-600 transition-all shadow-lg shadow-amber-900/20"
            title="Cerrar sesión">
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  )
}
