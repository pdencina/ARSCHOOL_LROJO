'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { alumnos: any[]; cursos: string[]; colegioId: string }

export default function AlumnosClient({ alumnos, cursos, colegioId }: Props) {
  const [cursoBusq, setCursoBusq] = useState('')
  const [textBusq, setTextBusq] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', apellido: '', rut: '', curso: cursos[0] ?? '', nivel: 'Básico',
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono: ''
  })
  const supabase = createClient()

  const alumnosFiltrados = useMemo(() =>
    alumnos.filter(a => {
      const matchCurso = !cursoBusq || a.curso === cursoBusq
      const matchText = !textBusq || `${a.nombre} ${a.apellido} ${a.rut ?? ''}`.toLowerCase().includes(textBusq.toLowerCase())
      return matchCurso && matchText
    }),
    [alumnos, cursoBusq, textBusq]
  )

  async function handleGuardar() {
    if (!form.nombre || !form.apellido || !form.curso) { toast.error('Completa nombre, apellido y curso'); return }
    setSaving(true)
    const { data: alumno, error } = await supabase.from('alumnos').insert({
      colegio_id: colegioId, nombre: form.nombre, apellido: form.apellido,
      rut: form.rut || null, curso: form.curso, nivel: form.nivel, activo: true
    }).select().single()

    if (error) { toast.error('Error al guardar alumno'); setSaving(false); return }

    if (form.email_apoderado) {
      await supabase.from('familias').insert({
        colegio_id: colegioId, alumno_id: (alumno as any).id,
        nombre_apoderado: form.nombre_apoderado, apellido_apoderado: form.apellido_apoderado,
        email: form.email_apoderado, telefono: form.telefono || null
      })
    }

    toast.success('Alumno registrado correctamente')
    setSaving(false); setShowModal(false)
    window.location.reload()
  }

  const activos = alumnos.filter(a => a.activo).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Alumnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activos} alumnos activos · {cursos.length} cursos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-plus text-sm" aria-hidden="true" /> Nuevo alumno
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total alumnos', val: alumnos.length, sub: 'matriculados', color: 'text-blue-600' },
          { label: 'Activos', val: activos, sub: 'este periodo', color: 'text-emerald-600' },
          { label: 'Cursos', val: cursos.length, sub: 'registrados', color: 'text-violet-600' },
          { label: 'Con familia', val: alumnos.filter(a => a.familias?.length).length, sub: 'vinculados', color: 'text-amber-600' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
            <div className={`text-2xl font-bold font-display ${k.color}`}>{k.val}</div>
            <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true" />
          <input value={textBusq} onChange={e => setTextBusq(e.target.value)} className="input-base pl-9" placeholder="Buscar por nombre o RUT..." />
        </div>
        <select value={cursoBusq} onChange={e => setCursoBusq(e.target.value)} className="select-base">
          <option value="">Todos los cursos</option>
          {cursos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              <th>Alumno</th>
              <th>RUT</th>
              <th>Curso</th>
              <th>Apoderado</th>
              <th>Contacto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic text-sm">
                {alumnos.length === 0 ? 'No hay alumnos registrados todavia.' : 'No se encontraron alumnos con ese filtro.'}
              </td></tr>
            ) : alumnosFiltrados.map((a: any) => {
              const fam = a.familias?.[0]
              return (
                <tr key={a.id} className="table-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                        {a.nombre?.[0]}{a.apellido?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{a.nombre} {a.apellido}</div>
                        <div className="text-xs text-slate-400">{a.fecha_nacimiento ?? 'Sin fecha de nac.'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-500 font-mono text-xs">{a.rut ?? '—'}</td>
                  <td><span className="tag tag-blue">{a.curso}</span></td>
                  <td className="text-slate-700">{fam ? `${fam.nombre_apoderado} ${fam.apellido_apoderado}` : <span className="text-slate-400 text-xs">Sin apoderado</span>}</td>
                  <td className="text-slate-500 text-xs">{fam?.email ?? '—'}</td>
                  <td>
                    <span className={`tag ${a.activo ? 'tag-ok' : 'tag-gray'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo alumno */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo alumno</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Datos del alumno</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                    <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="input-base" placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Apellido *</label>
                    <input value={form.apellido} onChange={e => setForm(p => ({...p, apellido: e.target.value}))} className="input-base" placeholder="Apellido" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">RUT</label>
                    <input value={form.rut} onChange={e => setForm(p => ({...p, rut: e.target.value}))} className="input-base" placeholder="12.345.678-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Curso *</label>
                    <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                      {cursos.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="1° Básico">1° Básico</option>
                      <option value="2° Básico">2° Básico</option>
                      <option value="3° Básico">3° Básico</option>
                      <option value="4° Básico">4° Básico</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Apoderado (opcional)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre apoderado</label>
                    <input value={form.nombre_apoderado} onChange={e => setForm(p => ({...p, nombre_apoderado: e.target.value}))} className="input-base" placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Apellido apoderado</label>
                    <input value={form.apellido_apoderado} onChange={e => setForm(p => ({...p, apellido_apoderado: e.target.value}))} className="input-base" placeholder="Apellido" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={form.email_apoderado} onChange={e => setForm(p => ({...p, email_apoderado: e.target.value}))} className="input-base" placeholder="correo@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Telefono</label>
                    <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} className="input-base" placeholder="+56 9 1234 5678" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Registrar alumno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}