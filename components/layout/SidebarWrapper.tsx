'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

interface Props {
  rol: string
  modulosHabilitadosInicial: string[] | null
}

export default function SidebarWrapper({ rol, modulosHabilitadosInicial }: Props) {
  const [modulos, setModulos] = useState<string[] | null>(modulosHabilitadosInicial)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (rol === 'super_admin') return

    const fetchPermisos = async () => {
      try {
        const res = await fetch(`/api/permisos/me`)
        if (res.ok) {
          const data = await res.json()
          setModulos(data)
        }
      } catch {}
    }

    const interval = setInterval(fetchPermisos, 30000)
    const handleFocus = () => fetchPermisos()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [rol])

  // Listen for mobile menu toggle from Topbar
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handler)
    return () => window.removeEventListener('toggle-sidebar', handler)
  }, [])

  // Close on route change (clicking a nav link)
  useEffect(() => {
    const closeOnClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('a[href]') && mobileOpen) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('click', closeOnClick)
    return () => document.removeEventListener('click', closeOnClick)
  }, [mobileOpen])

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar rol={rol} modulosHabilitados={modulos} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-[260px] animate-[slideIn_0.2s_ease-out]">
            <Sidebar rol={rol} modulosHabilitados={modulos} />
          </div>
        </div>
      )}
    </>
  )
}
