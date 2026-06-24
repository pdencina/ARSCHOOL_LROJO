'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { permisos: any[] }

const ROLES = [
  { key: 'admin', label: 'Administrativo', icon: 'ti-briefcase', color: 'text-[#2c4a6e]' },
  { key: 'tutor', label: 'Docente', icon: 'ti-school', color: 'text-violet-700' },
  { key: 'apoderado', label: 'Apoderado', icon: 'ti-heart-handshake', color: 'text-emerald-700' },
  { key: 'alumno', label: 'Alumno', icon: 'ti-backpack', color: 'text-amber-700' },
]

const MODULOS = [
  { key: 'inicio', label: 'Inicio', icon: 'ti-home', grupo: 'Principal' },
  { key: 'alumnos', label: 'Alumnos', icon: 'ti-users', grupo: 'Principal' },
  { key: 'planificacion', label: 'Planificación', icon: 'ti-layout-board', grupo: 'Principal' },
  { key: 'asistencias', label: 'Asistencias', icon: 'ti-clipboard-check', grupo: 'Principal' },
  { key: 'evaluaciones', label: 'Evaluaciones', icon: 'ti-chart-bar', grupo: 'Principal' },
  { key: 'comunicados', label: 'Comunicados', icon: 'ti-speakerphone', grupo: 'Principal' },
  { key: 'mensajes', label: 'Mensajes', icon: 'ti-message-2', grupo: 'Principal' },
  { key: 'libro_clases', label: 'Libro de clases', icon: 'ti-notebook', grupo: 'Principal' },
  { key: 'reporte_diario', label: 'Reporte diario', icon: 'ti-clipboard-heart', grupo: 'Principal' },
  { key: 'cobranzas', label: 'Cobranzas', icon: 'ti-cash', grupo: 'Gestión' },
  { key: 'documentos', label: 'Documentos', icon: 'ti-folder', grupo: 'Gestión' },
  { key: 'calendario', label: 'Calendario', icon: 'ti-calendar', grupo: 'Gestión' },
  { key: 'fichas', label: 'Fichas pedagógicas', icon: 'ti-books', grupo: 'Gestión' },
  { key: 'reportes', label: 'Reportes', icon: 'ti-file-analytics', grupo: 'Gestión' },
  { key: 'tareas', label: 'Tareas', icon: 'ti-checklist', grupo: 'Portal' },
  { key: 'pagos', label: 'Estado de pagos', icon: 'ti-cash', grupo: 'Portal' },
  { key: 'perfil', label: 'Mi perfil', icon: 'ti-user', grupo: 'Portal' },
]

export default function PermisosClient({ permisos: initialPermisos }: Props) {
  const router = useRouter()
  const [permisos, setPermisos] = useState(initialPermisos)
  const [saving, setSaving] = useState<string | null>(null)

  function isEnabled(rol: string, modulo: string) {
    const p = permisos.find(p => p.rol === rol && p.modulo === modulo)
    return p?.habilitado ?? false
  }

  async function togglePermiso(rol: string, modulo: string) {
    const current = isEnabled(rol, modulo)
    const key = `${rol}-${modulo}`
    setSaving(key)

    // Optimistic update
    setPermisos(prev => {
      const idx = prev.findIndex(p => p.rol === rol && p.modulo === modulo)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], habilitado: !current }
        return updated
      }
      return [...prev, { rol, modulo, habilitado: !current, colegio_id: null }]
    })

    const res = await fetch('/api/permisos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol, modulo, habilitado: !current }),
    })

    if (!res.ok) {
      toast.error('Error al actualizar')
      // Revert
      setPermisos(prev => {
        const idx = prev.findIndex(p => p.rol === rol && p.modulo === modulo)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], habilitado: current }
          return updated
        }
        return prev
      })
    }
    setSaving(null)
  }

  const grupos = [...new Set(MODULOS.map(m => m.grupo))]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="page-title">Permisos por rol</h1>
        <p className="page-subtitle">Configura qué módulos puede ver cada tipo de usuario</p>
      </div>

      <div className="bg-white border border-[var(--ar-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[var(--ar-border)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider w-52">Módulo</th>
                {ROLES.map(r => (
                  <th key={r.key} className="text-center px-3 py-3 min-w-[100px]">
                    <div className={`flex flex-col items-center gap-1 ${r.color}`}>
                      <i className={`ti ${r.icon} text-[14px]`} aria-hidden="true"/>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">{r.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map(grupo => (
                <>
                  <tr key={grupo}>
                    <td colSpan={5} className="px-4 py-2 bg-[#f9fafb] border-b border-[var(--ar-border)]">
                      <span className="text-[10px] font-bold text-[#b0b7c3] uppercase tracking-[0.1em]">{grupo}</span>
                    </td>
                  </tr>
                  {MODULOS.filter(m => m.grupo === grupo).map(modulo => (
                    <tr key={modulo.key} className="border-b border-[#f5f6f7] hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <i className={`ti ${modulo.icon} text-[14px] text-[#b0b7c3]`} aria-hidden="true"/>
                          <span className="text-[13px] font-medium text-[#1a2332]">{modulo.label}</span>
                        </div>
                      </td>
                      {ROLES.map(rol => {
                        const enabled = isEnabled(rol.key, modulo.key)
                        const isSaving = saving === `${rol.key}-${modulo.key}`
                        return (
                          <td key={rol.key} className="text-center px-3 py-3">
                            <button
                              onClick={() => togglePermiso(rol.key, modulo.key)}
                              disabled={isSaving}
                              className={`w-9 h-5 rounded-full relative transition-all duration-200 ${
                                enabled ? 'bg-[#1a7a4c]' : 'bg-[#e2e4e8]'
                              } ${isSaving ? 'opacity-50' : ''}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                enabled ? 'left-[18px]' : 'left-0.5'
                              }`}/>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-[var(--ar-accent-l)] border border-[#fde68a]/40 rounded-xl p-4 flex items-start gap-3">
        <i className="ti ti-info-circle text-[var(--ar-accent)] mt-0.5" aria-hidden="true"/>
        <div className="text-[12px] text-[#92400e]">
          <strong>Nota:</strong> Los cambios se aplican en tiempo real. El Super Admin siempre tiene acceso a todos los módulos. Los permisos son globales (aplican a todos los colegios).
        </div>
      </div>
    </div>
  )
}
