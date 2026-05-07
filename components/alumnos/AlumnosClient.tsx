'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { alumnos: any[]; cursos: string[]; colegioId: string }

const CURSOS_DEFAULT = ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico',
  '7° Básico','8° Básico','I° Medio','II° Medio','III° Medio','IV° Medio']

export default function AlumnosClient({ alumnos, cursos, colegioId }: Props) {
  const [cursoBusq, setCursoBusq] = useState('')
  const [textBusq, setTextBusq] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [alumnoDetalle, setAlumnoDetalle] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'lista'|'tarjetas'>('lista')
  const todosLosCursos = cursos.length > 0 ? cursos : CURSOS_DEFAULT
  const [form, setForm] = useState({
    nombre: '', apellido: '', rut: '', curso: todosLosCursos[0] ?? '',
    fecha_nacimiento: '', direccion: '', nacionalidad: 'Chilena', necesidades_especiales: '',
    nombre_apoderado: '', apellido_apoderado: '', email_apoderado: '', telefono: ''
  })
  const supabase = createClient()

  const alumnosFiltrados = useMemo(() =>
    alumnos.filter(a => {
      const matchCurso = !cursoBusq || a.curso === cursoBusq
      const matchText = !textBusq || `${a.nombre} ${a.apellido} ${a.rut ?? ''}`.toLowerCase().includes(textBusq.toLowerCase())
      return matchCurso && matchText && a.activo
    }),
    [alumnos, cursoBusq, textBusq]
  )

  async function handleGuardar() {
    if (!form.nombre || !form.apellido || !form.curso) { toast.error('Nombre, apellido y curso son requeridos'); return }
    setSaving(true)
    const { data: alumno, error } = await supabase.from('alumnos').insert({
      colegio_id: colegioId,
      nombre: form.nombre, apellido: form.apellido, rut: form.rut || null,
      curso: form.curso, nivel: 'Básico', activo: true,
      fecha_nacimiento: form.fecha_nacimiento || null,
      direccion: form.direccion || null,
      nacionalidad: form.nacionalidad || 'Chilena',
      necesidades_especiales: form.necesidades_especiales || null,
    }).select().single()

    if (error) { toast.error('Error al guardar alumno'); setSaving(false); return }

    if (form.email_apoderado) {
      await supabase.from('familias').insert({
        colegio_id: colegioId, alumno_id: (alumno as any).id,
        nombre_apoderado: form.nombre_apoderado || 'Sin nombre',
        apellido_apoderado: form.apellido_apoderado || '',
        email: form.email_apoderado,
        telefono: form.telefono || null,
      })
    }
    toast.success('Alumno registrado correctamente')
    setSaving(false); setShowModal(false)
    window.location.reload()
  }

  const activos = alumnos.filter(a => a.activo).length
  const conFamilia = alumnos.filter(a => a.familias?.length > 0).length
  const porCurso = cursos.map(c => ({ curso: c, count: alumnos.filter(a => a.curso === c && a.activo).length }))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Alumnos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activos} alumnos activos · {cursos.length} cursos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nuevo alumno
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total alumnos', val: alumnos.length, sub: 'matriculados', icon: 'ti-users', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activos', val: activos, sub: 'este periodo', icon: 'ti-circle-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Con apoderado', val: conFamilia, sub: 'vinculados', icon: 'ti-heart-handshake', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Cursos', val: cursos.length, sub: 'activos', icon: 'ti-school', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-400">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen por curso */}
      {porCurso.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Alumnos por curso</div>
          <div className="flex gap-2 flex-wrap">
            {porCurso.filter(p => p.count > 0).map(p => (
              <button key={p.curso} onClick={() => setCursoBusq(cursoBusq === p.curso ? '' : p.curso)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${cursoBusq === p.curso ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                {p.curso}
                <span className={`px-1.5 py-0.5 rounded-full font-bold ${cursoBusq === p.curso ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{p.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true"/>
          <input value={textBusq} onChange={e => setTextBusq(e.target.value)} className="input-base pl-9" placeholder="Buscar por nombre o RUT..."/>
        </div>
        {cursoBusq && (
          <button onClick={() => setCursoBusq('')} className="btn-secondary text-sm gap-1">
            <i className="ti ti-x text-xs" aria-hidden="true"/> {cursoBusq}
          </button>
        )}
        <span className="text-sm text-slate-400 ml-auto">{alumnosFiltrados.length} resultado{alumnosFiltrados.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Alumno','RUT','Curso','Apoderado','Email / Teléfono','Estado',''].map(h => (
                <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <i className="ti ti-users text-4xl text-slate-300 block mb-2" aria-hidden="true"/>
                <p className="text-slate-400 text-sm">{alumnos.length === 0 ? 'No hay alumnos registrados. Agrega el primero.' : 'Sin resultados.'}</p>
              </td></tr>
            ) : alumnosFiltrados.map((a: any) => {
              const fam = a.familias?.[0]
              return (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setAlumnoDetalle(alumnoDetalle?.id === a.id ? null : a)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {a.nombre?.[0]}{a.apellido?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{a.nombre} {a.apellido}</div>
                        {a.fecha_nacimiento && <div className="text-xs text-slate-400">{new Date(a.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL')}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.rut ?? '—'}</td>
                  <td className="px-4 py-3"><span className="tag tag-blue">{a.curso}</span></td>
                  <td className="px-4 py-3 text-slate-700 text-xs">
                    {fam ? `${fam.nombre_apoderado} ${fam.apellido_apoderado}` : <span className="text-slate-300 italic">Sin apoderado</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>{fam?.email ?? '—'}</div>
                    {fam?.telefono && <div className="text-slate-400">{fam.telefono}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`tag ${a.activo ? 'tag-ok' : 'tag-gray'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-600 hover:underline" onClick={e => { e.stopPropagation(); setAlumnoDetalle(a) }}>
                      Ver perfil
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Panel detalle alumno */}
      {alumnoDetalle && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 relative">
              <button onClick={() => setAlumnoDetalle(null)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                <i className="ti ti-x text-lg" aria-hidden="true"/>
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center font-display text-2xl font-bold text-white">
                  {alumnoDetalle.nombre?.[0]}{alumnoDetalle.apellido?.[0]}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{alumnoDetalle.nombre} {alumnoDetalle.apellido}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{alumnoDetalle.curso}</span>
                    {alumnoDetalle.rut && <span className="text-white/60 text-xs">{alumnoDetalle.rut}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: 'Fecha de nacimiento', val: alumnoDetalle.fecha_nacimiento ? new Date(alumnoDetalle.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '—' },
                  { label: 'Nacionalidad', val: alumnoDetalle.nacionalidad ?? 'Chilena' },
                  { label: 'Dirección', val: alumnoDetalle.direccion ?? '—' },
                  { label: 'Nec. especiales', val: alumnoDetalle.necesidades_especiales ?? 'Ninguna' },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</div>
                    <div className="text-sm text-slate-700">{f.val}</div>
                  </div>
                ))}
              </div>

              {alumnoDetalle.familias?.[0] && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Apoderado</div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {alumnoDetalle.familias[0].nombre_apoderado?.[0]}{alumnoDetalle.familias[0].apellido_apoderado?.[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{alumnoDetalle.familias[0].nombre_apoderado} {alumnoDetalle.familias[0].apellido_apoderado}</div>
                      <div className="text-xs text-slate-500">{alumnoDetalle.familias[0].email}</div>
                      {alumnoDetalle.familias[0].telefono && <div className="text-xs text-slate-500">{alumnoDetalle.familias[0].telefono}</div>}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <a href={`/asistencias?alumno=${alumnoDetalle.id}&curso=${encodeURIComponent(alumnoDetalle.curso)}`}
                  className="btn-secondary flex-1 text-sm justify-center text-center">
                  <i className="ti ti-clipboard-check text-sm" aria-hidden="true"/> Asistencias
                </a>
                <a href={`/calificaciones?alumno=${alumnoDetalle.id}&curso=${encodeURIComponent(alumnoDetalle.curso)}`}
                  className="btn-secondary flex-1 text-sm justify-center text-center">
                  <i className="ti ti-chart-bar text-sm" aria-hidden="true"/> Notas
                </a>
                <a href={`/contable?alumno=${alumnoDetalle.id}`}
                  className="btn-secondary flex-1 text-sm justify-center text-center">
                  <i className="ti ti-cash text-sm" aria-hidden="true"/> Pagos
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo alumno */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#0F1B2D] px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nuevo alumno</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><i className="ti ti-x" aria-hidden="true"/></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              {/* Datos alumno */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="ti ti-user text-slate-300" aria-hidden="true"/> Datos del alumno
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Nombre *', key:'nombre', placeholder:'Nombre' },
                    { label:'Apellido *', key:'apellido', placeholder:'Apellido' },
                    { label:'RUT', key:'rut', placeholder:'12.345.678-9' },
                    { label:'Fecha de nacimiento', key:'fecha_nacimiento', placeholder:'', type:'date' },
                    { label:'Dirección', key:'direccion', placeholder:'Calle 123, Comuna' },
                    { label:'Nacionalidad', key:'nacionalidad', placeholder:'Chilena' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input type={f.type ?? 'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} className="input-base" placeholder={f.placeholder}/>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Curso *</label>
                    <select value={form.curso} onChange={e => setForm(p => ({...p, curso: e.target.value}))} className="select-base w-full">
                      {todosLosCursos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nec. especiales</label>
                    <input value={form.necesidades_especiales} onChange={e => setForm(p => ({...p, necesidades_especiales: e.target.value}))} className="input-base" placeholder="Opcional"/>
                  </div>
                </div>
              </div>

              {/* Datos apoderado */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="ti ti-heart-handshake text-slate-300" aria-hidden="true"/> Apoderado (opcional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Nombre', key:'nombre_apoderado', placeholder:'Nombre' },
                    { label:'Apellido', key:'apellido_apoderado', placeholder:'Apellido' },
                    { label:'Email', key:'email_apoderado', placeholder:'correo@email.com', type:'email' },
                    { label:'Teléfono', key:'telefono', placeholder:'+56 9 1234 5678' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input type={f.type ?? 'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} className="input-base" placeholder={f.placeholder}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Registrando...' : 'Registrar alumno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}