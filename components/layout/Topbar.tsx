'use client'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props { usuario: any }

const ROL_LABEL: Record<string, string> = {
  super_admin: 'Administrador General',
  admin:       'Administración',
  tutor:       'Docente',
  apoderado:   'Apoderado',
  alumno:      'Alumno',
}

export default function Topbar({ usuario }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const rol = usuario?.rol ?? 'admin'
  const [showMenu, setShowMenu] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciales = `${usuario?.nombre?.[0] ?? ''}${usuario?.apellido?.[0] ?? ''}`.toUpperCase()

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-[var(--ar-border)] sticky top-0 z-30">
      <div className="flex items-center justify-between h-[56px] px-6">
        {/* Logo */}
        <Link href={rol === 'apoderado' || rol === 'alumno' ? '/portal' : '/inicio'} className="flex items-center gap-3 shrink-0 group">
          <Image src="/logo-arschool.png" alt="AR School" width={34} height={34} className="rounded-lg group-hover:scale-105 transition-transform duration-200"/>
          <div>
            <div className="font-semibold text-[var(--ar-text)] text-[13px] leading-none tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>AR SCHOOL</div>
            <div className="text-[10px] text-[#b0b7c3] mt-[3px] leading-none tracking-wide">
              {rol === 'super_admin' ? 'Gestión Educacional' : usuario?.colegio?.nombre ?? 'Gestión Educacional'}
            </div>
          </div>
        </Link>

        {/* User */}
        <div className="flex items-center gap-2 shrink-0 relative">
          <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#f3f4f6] transition-all duration-200">
            <div className="hidden md:block text-right">
              <div className="text-[var(--ar-text)] text-[13px] font-medium leading-tight">{usuario?.nombre} {usuario?.apellido}</div>
              <div className="text-[10px] text-[#b0b7c3] leading-tight">{ROL_LABEL[rol] ?? rol}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--ar-navy)] flex items-center justify-center font-semibold text-white text-[11px]">
              {iniciales}
            </div>
          </button>

          {/* Dropdown */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}/>
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[var(--ar-border)] rounded-xl py-1.5 z-50 animate-fade-in-scale" style={{ boxShadow: 'var(--shadow-lg)' }}>
                <div className="px-3.5 py-2.5 border-b border-[#f5f6f7]">
                  <div className="text-[12px] font-medium text-[var(--ar-text)]">{usuario?.nombre} {usuario?.apellido}</div>
                  <div className="text-[11px] text-[#b0b7c3] mt-0.5">{usuario?.email}</div>
                </div>
                <Link href="/configuracion" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-[#5f6876] hover:bg-[#f8f9fb] transition-colors">
                  <i className="ti ti-settings text-[14px] text-[#b0b7c3]" aria-hidden="true"/> Configuración
                </Link>
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-[var(--ar-danger)] hover:bg-red-50/50 transition-colors">
                  <i className="ti ti-logout text-[14px]" aria-hidden="true"/> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
