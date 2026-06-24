'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'

interface Props {
  rol: string
  modulosHabilitadosInicial: string[] | null
}

export default function SidebarWrapper({ rol, modulosHabilitadosInicial }: Props) {
  const [modulos, setModulos] = useState<string[] | null>(modulosHabilitadosInicial)

  useEffect(() => {
    if (rol === 'super_admin') return // Super admin ve todo, no necesita polling

    const fetchPermisos = async () => {
      try {
        const res = await fetch(`/api/permisos/me`)
        if (res.ok) {
          const data = await res.json()
          setModulos(data)
        }
      } catch {}
    }

    // Polling cada 30 segundos
    const interval = setInterval(fetchPermisos, 30000)

    // También al enfocar la ventana (cuando vuelve de otra tab)
    const handleFocus = () => fetchPermisos()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [rol])

  return <Sidebar rol={rol} modulosHabilitados={modulos} />
}
