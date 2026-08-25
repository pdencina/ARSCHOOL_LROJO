'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  familiaId: string
  datos: any
}

export default function EditarApoderado({ familiaId, datos }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre_apoderado: datos.nombre_apoderado || '',
    apellido_apoderado: datos.apellido_apoderado || '',
    email: datos.email || '',
    telefono: datos.telefono || '',
    rut: datos.rut || '',
    direccion: datos.direccion || '',
  })

  async function guardar() {
    setSaving(true)
    try {
      const res = await fetch(`/api/familias/${familiaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Datos del apoderado actualizados')
        setAbierto(false)
        window.location.reload()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión al guardar')
    }
    setSaving(false)
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-[10px] text-[var(--ar-accent)] hover:underline">
        <i className="ti ti-edit text-sm" aria-hidden="true"/> Editar
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#1B3A5C]">Editar apoderado</h3>
          <button onClick={() => setAbierto(false)} className="text-[#9ca3af] hover:text-[#1B3A5C]">
            <i className="ti ti-x text-lg"/>
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Nombre</label>
              <input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value}))} className="input-base text-[12px]"/>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Apellido</label>
              <input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value}))} className="input-base text-[12px]"/>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Correo</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="input-base text-[12px]"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} className="input-base text-[12px]" placeholder="+56 9..."/>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">RUT</label>
              <input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base text-[12px]"/>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))} className="input-base text-[12px]"/>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => setAbierto(false)} className="btn-secondary text-xs flex-1">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="btn-primary text-xs flex-1 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
