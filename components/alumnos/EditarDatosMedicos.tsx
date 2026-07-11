'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  alumnoId: string
  datos: any
}

export default function EditarDatosMedicos({ alumnoId, datos }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    grupo_sanguineo: datos.grupo_sanguineo || '',
    alergias: datos.alergias || '',
    medicamentos: datos.medicamentos || '',
    condiciones_medicas: datos.condiciones_medicas || '',
    centro_salud: datos.centro_salud || '',
    seguro_escolar: datos.seguro_escolar || '',
    contacto_emergencia: datos.contacto_emergencia || '',
    telefono_emergencia: datos.telefono_emergencia || '',
    parentesco_emergencia: datos.parentesco_emergencia || '',
    contacto_emergencia_2: datos.contacto_emergencia_2 || '',
    telefono_emergencia_2: datos.telefono_emergencia_2 || '',
    parentesco_emergencia_2: datos.parentesco_emergencia_2 || '',
    autoriza_traslado: datos.autoriza_traslado !== false,
    autoriza_medicamentos: datos.autoriza_medicamentos || false,
  })

  async function guardar() {
    setSaving(true)
    const res = await fetch(`/api/alumnos/${alumnoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Datos actualizados')
      setAbierto(false)
      window.location.reload()
    } else {
      toast.error('Error al guardar')
    }
    setSaving(false)
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn-secondary text-xs w-full">
        <i className="ti ti-edit text-sm" aria-hidden="true"/> Editar datos médicos y emergencia
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#1B3A5C]">Editar datos médicos y emergencia</h3>
          <button onClick={() => setAbierto(false)} className="text-[#9ca3af] hover:text-[#1B3A5C]">
            <i className="ti ti-x text-lg"/>
          </button>
        </div>

      {/* Datos médicos */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-[#C15A3B] uppercase tracking-wider mb-2">Información médica</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Grupo sanguíneo</label>
            <select value={form.grupo_sanguineo} onChange={e => setForm(p => ({...p, grupo_sanguineo: e.target.value}))} className="select-base w-full text-[12px]">
              <option value="">No informado</option>
              <option value="A+">A+</option><option value="A-">A-</option>
              <option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option>
              <option value="O+">O+</option><option value="O-">O-</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Centro de salud</label>
            <input value={form.centro_salud} onChange={e => setForm(p => ({...p, centro_salud: e.target.value}))} className="input-base text-[12px]" placeholder="Clínica, CESFAM..."/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Alergias</label>
            <input value={form.alergias} onChange={e => setForm(p => ({...p, alergias: e.target.value}))} className="input-base text-[12px]" placeholder="Ninguna conocida"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Medicamentos</label>
            <input value={form.medicamentos} onChange={e => setForm(p => ({...p, medicamentos: e.target.value}))} className="input-base text-[12px]" placeholder="Ninguno"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Condiciones médicas</label>
            <input value={form.condiciones_medicas} onChange={e => setForm(p => ({...p, condiciones_medicas: e.target.value}))} className="input-base text-[12px]" placeholder="Ninguna"/>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Seguro escolar privado</label>
            <input value={form.seguro_escolar} onChange={e => setForm(p => ({...p, seguro_escolar: e.target.value}))} className="input-base text-[12px]" placeholder="No tiene"/>
          </div>
        </div>
      </div>

      {/* Contactos emergencia */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-[#E8722A] uppercase tracking-wider mb-2">Contactos de emergencia</div>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Contacto 1</label><input value={form.contacto_emergencia} onChange={e => setForm(p => ({...p, contacto_emergencia: e.target.value}))} className="input-base text-[12px]" placeholder="Nombre"/></div>
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Teléfono</label><input value={form.telefono_emergencia} onChange={e => setForm(p => ({...p, telefono_emergencia: e.target.value}))} className="input-base text-[12px]" placeholder="+56 9..."/></div>
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Parentesco</label><input value={form.parentesco_emergencia} onChange={e => setForm(p => ({...p, parentesco_emergencia: e.target.value}))} className="input-base text-[12px]" placeholder="Madre, padre..."/></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Contacto 2</label><input value={form.contacto_emergencia_2} onChange={e => setForm(p => ({...p, contacto_emergencia_2: e.target.value}))} className="input-base text-[12px]" placeholder="Nombre"/></div>
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Teléfono</label><input value={form.telefono_emergencia_2} onChange={e => setForm(p => ({...p, telefono_emergencia_2: e.target.value}))} className="input-base text-[12px]" placeholder="+56 9..."/></div>
          <div><label className="block text-[10px] font-semibold text-[#6b7280] uppercase mb-1">Parentesco</label><input value={form.parentesco_emergencia_2} onChange={e => setForm(p => ({...p, parentesco_emergencia_2: e.target.value}))} className="input-base text-[12px]" placeholder="Abuela, tío..."/></div>
        </div>
      </div>

      {/* Autorizaciones */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-[#1B3A5C] uppercase tracking-wider mb-2">Autorizaciones</div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoriza_traslado} onChange={e => setForm(p => ({...p, autoriza_traslado: e.target.checked}))} className="rounded"/>
            <span className="text-[11px] text-[#4b5563]">Autoriza traslado a centro de salud</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoriza_medicamentos} onChange={e => setForm(p => ({...p, autoriza_medicamentos: e.target.checked}))} className="rounded"/>
            <span className="text-[11px] text-[#4b5563]">Autoriza administración de medicamentos</span>
          </label>
        </div>
      </div>

      {/* Botones */}
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
