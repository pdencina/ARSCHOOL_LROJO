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
    <header className="bg-white border-b border-[#e8eaed] sticky top-0 z-30">
      <div className="flex items-center justify-between h-[56px] px-6">
        {/* Logo */}
        <Link href={rol === 'apoderado' || rol === 'alumno' ? '/portal' : '/inicio'} className="flex items-center gap-3 shrink-0">
          <Image src="/logo.svg" alt="AR School" width={34} height={34} className="rounded-lg"/>
          <div>
            <div className="font-semibold text-[#1a2332] text-[13px] leading-none tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>AR SCHOOL</div>
            <div className="text-[10px] text-[#9ca3af] mt-0.5 leading-none tracking-wide">
              {rol === 'super_admin' ? 'Gestión Educacional' : usuario?.colegio?.nombre ?? 'Gestión Educacional'}
            </div>
          </div>
        </Link>

        {/* User info + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block text-right">
            <div className="text-[#1a2332] text-sm font-medium">{usuario?.nombre} {usuario?.apellido}</div>
            <div className="text-[10px] text-[#9ca3af] tracking-wide">{ROL_LABEL[rol] ?? rol}</div>
          </div>
          <button onClick={logout}
            className="w-9 h-9 rounded-full bg-[#1a2332] flex items-center justify-center font-semibold text-white text-xs hover:bg-[#2c3a4d] transition-all"
            title="Cerrar sesión">
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  )
}
