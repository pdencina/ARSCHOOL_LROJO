'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Props { colegio: any; usuarios: any[]; alumnos: any[] }

const ROL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-red-700',     bg: 'bg-red-50' },
  admin:       { label: 'Admin',       color: 'text-blue-700',    bg: 'bg-blue-50' },
  docente:     { label: 'Docente',     color: 'text-violet-700',  bg: 'bg-violet-50' },
  tutor:       { label: 'Apoderado',   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  alumno:      { label: 'Alumno',      color: 'text-amber-700',   bg: 'bg-amber-50' },
}

export default function GestionarColegioClient({ colegio, usuarios, alumnos }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'resumen'|'usuarios'|'alumnos'>('resumen')

  async function handleCambiarRol(usuarioId: string, rol: string) {
    const res = await fetch(`/api/admin/usuarios/${usuarioId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol }),
    })
    if (res.ok) { toast.success('Rol actualizado'); router.refresh() }
    else toast.error('Error al actualizar rol')
  }

  const cursos = [...new Set(alumnos.map(a => a.curso))].sort()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin" className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="ti ti-arrow-left text-lg" aria-hidden="true"/>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-display font-bold text-blue-700 text-lg">
              {colegio.nombre?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">{colegio.nombre}</h1>
              <p className="text-sm text-slate-500">{colegio.direccion ?? 'Sin dirección'} · {colegio.rut ?? 'Sin RUT'}</p>
            </div>
          </div>
        </div>
        <span className={`tag ${colegio.plan === 'enterprise' ? 'tag-mora' : colegio.plan === 'profesional' ? 'tag-blue' : 'tag-gray'} text-sm px-3 py-1`}>
          {colegio.plan}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Usuarios', val: usuarios.length, icon: 'ti-users', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Alumnos activos', val: alumnos.length, icon: 'ti-school', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cursos', val: cursos.length, icon: 'ti-layout-grid', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Docentes', val: usuarios.filter(u => u.rol === 'docente').length, icon: 'ti-pencil', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`ti ${k.icon} ${k.color}`} aria-hidden="true"/>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</div>
              <div className={`font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-5">
        {[
          { key: 'resumen',  label: 'Resumen',  icon: 'ti-layout-dashboard' },
          { key: 'usuarios', label: 'Usuarios', icon: 'ti-users' },
          { key: 'alumnos',  label: 'Alumnos',  icon: 'ti-school' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <i className={`ti ${t.icon} text-sm`} aria-hidden="true"/> {t.label}
          </button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Información del colegio</h3>
            <div className="space-y-3">
              {[
                { label: 'Nombre',    val: colegio.nombre },
                { label: 'RUT',       val: colegio.rut ?? '—' },
                { label: 'Dirección', val: colegio.direccion ?? '—' },
                { label: 'Teléfono', val: colegio.telefono ?? '—' },
                { label: 'Plan',      val: colegio.plan },
                { label: 'Creado',    val: new Date(colegio.created_at).toLocaleDateString('es-CL') },
              ].map((f, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{f.label}</span>
                  <span className="text-sm text-slate-700 font-medium">{f.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Distribución por rol</h3>
            {Object.entries(ROL_CONFIG).map(([rol, cfg]) => {
              const count = usuarios.filter(u => u.rol === rol).length
              if (!count) return null
              return (
                <div key={rol} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className={`tag ${cfg.bg} ${cfg.color} text-xs`}>{cfg.label}</span>
                  <span className="font-display font-bold text-slate-700">{count}</span>
                </div>
              )
            })}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-slate-700 text-sm mb-2">Alumnos por curso</h4>
              {cursos.map(c => (
                <div key={c} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-slate-600">{c}</span>
                  <span className="font-semibold text-slate-700">{alumnos.filter(a => a.curso === c).length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USUARIOS */}
      {tab === 'usuarios' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{usuarios.length} usuarios en este colegio</p>
            <Link href={`/super-admin/usuarios?colegio=${colegio.id}`} className="btn-primary text-sm">
              <i className="ti ti-user-plus text-sm" aria-hidden="true"/> Nuevo usuario
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Usuario','Email','Rol','Acciones'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">Sin usuarios registrados.</td></tr>
                ) : usuarios.map((u: any) => {
                  const cfg = ROL_CONFIG[u.rol] ?? ROL_CONFIG.admin
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center text-xs font-bold ${cfg.color}`}>
                            {u.nombre?.[0]}{u.apellido?.[0]}
                          </div>
                          <span className="font-medium text-slate-800">{u.nombre} {u.apellido}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <select value={u.rol} onChange={e => handleCambiarRol(u.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${cfg.bg} ${cfg.color}`}>
                          {Object.entries(ROL_CONFIG).map(([r, c]) => (
                            <option key={r} value={r}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/super-admin/usuarios?colegio=${colegio.id}`} className="text-xs text-blue-600 hover:underline">Editar</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALUMNOS */}
      {tab === 'alumnos' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">{alumnos.length} alumnos activos</p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Alumno','Curso','Estado'].map(h => (
                    <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnos.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-sm">Sin alumnos registrados.</td></tr>
                ) : alumnos.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {a.nombre?.[0]}{a.apellido?.[0]}
                        </div>
                        <span className="font-medium text-slate-800">{a.nombre} {a.apellido}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="tag tag-blue">{a.curso}</span></td>
                    <td className="px-4 py-3"><span className="tag tag-ok">Activo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}