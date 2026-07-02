export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { formatMonto } from '@/lib/utils'

export const metadata = { title: 'Ficha del Alumno — AR School' }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function FichaAlumnoPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()

  // Cargar todo del alumno
  const [
    { data: alumno },
    { data: familia },
    { data: asistencias },
    { data: calificaciones },
    { data: cobros },
    { data: matricula },
    { data: reportes },
  ] = await Promise.all([
    admin.from('alumnos').select('*, colegio:colegios(nombre)').eq('id', params.id).single(),
    admin.from('familias').select('*').eq('alumno_id', params.id).limit(1).single(),
    admin.from('asistencias').select('estado, fecha').eq('alumno_id', params.id).order('fecha', { ascending: false }).limit(30),
    admin.from('calificaciones').select('nota, evaluacion:evaluaciones(nombre, materia, fecha)').eq('alumno_id', params.id).order('created_at', { ascending: false }),
    admin.from('cobros').select('estado, monto, monto_pagado, mes, anio').eq('alumno_id', params.id).order('anio', { ascending: false }).order('mes', { ascending: false }),
    admin.from('matriculas').select('*').eq('alumno_id', params.id).order('anio_escolar', { ascending: false }).limit(1).single(),
    admin.from('reportes_diarios').select('fecha, estado_animo, publicado').eq('alumno_id', params.id).order('fecha', { ascending: false }).limit(5),
  ])

  if (!alumno) redirect('/alumnos')
  const al = alumno as any
  const fam = familia as any

  // Stats
  const totalAsist = (asistencias ?? []).length
  const presentes = (asistencias ?? []).filter((a: any) => a.estado === 'presente').length
  const pctAsist = totalAsist > 0 ? Math.round(presentes / totalAsist * 100) : null

  const notas = (calificaciones ?? []).map((c: any) => c.nota).filter(Boolean)
  const promedioLogro = notas.length > 0 ? Math.round(notas.reduce((a: number, b: number) => a + b, 0) / notas.length) : null

  const totalDeuda = (cobros ?? []).filter((c: any) => c.estado !== 'pagado').reduce((a: number, c: any) => a + (c.monto - c.monto_pagado), 0)
  const cobrosAlDia = (cobros ?? []).filter((c: any) => c.estado === 'pagado').length
  const totalCobros = (cobros ?? []).length

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#f0f4f8] flex items-center justify-center text-[18px] font-bold text-[#2c4a6e]">
            {al.nombre?.[0]}{al.apellido?.[0]}
          </div>
          <div>
            <h1 className="page-title">{al.nombre} {al.apellido}</h1>
            <p className="page-subtitle">{al.curso} · {al.colegio?.nombre ?? ''} {al.rut ? `· ${al.rut}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {matricula && (
            <a href={`/api/contratos?matricula_id=${(matricula as any).id}`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-file-text text-sm" aria-hidden="true"/> Contrato
            </a>
          )}
          <a href={`/api/reportes/boletin?alumno_id=${params.id}`} target="_blank" className="btn-secondary text-xs">
            <i className="ti ti-report text-sm" aria-hidden="true"/> Boletín
          </a>
          <Link href="/alumnos" className="btn-secondary text-xs">
            <i className="ti ti-arrow-left text-sm" aria-hidden="true"/> Volver
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="kpi-label">Asistencia</div>
          <div className={`kpi-value ${pctAsist && pctAsist >= 85 ? 'text-[#1a7a4c]' : pctAsist && pctAsist < 70 ? 'text-[#c53030]' : ''}`}>{pctAsist ?? '—'}{pctAsist ? '%' : ''}</div>
          <div className="kpi-sub">{totalAsist} días registrados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Logro promedio</div>
          <div className={`kpi-value ${promedioLogro && promedioLogro >= 60 ? 'text-[#1a7a4c]' : promedioLogro ? 'text-[#c53030]' : ''}`}>{promedioLogro ?? '—'}{promedioLogro ? '%' : ''}</div>
          <div className="kpi-sub">{notas.length} evaluaciones</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pagos al día</div>
          <div className="kpi-value">{cobrosAlDia}/{totalCobros}</div>
          <div className="kpi-sub">{totalDeuda > 0 ? `Deuda: ${formatMonto(totalDeuda)}` : 'Sin deuda'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Estado matrícula</div>
          <div className="kpi-value text-[16px]">{(matricula as any)?.estado ?? 'Sin matrícula'}</div>
          <div className="kpi-sub">{(matricula as any)?.anio_escolar ?? ''}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Columna 1: Datos personales + apoderado */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Datos personales</div>
            <div className="space-y-2 text-[12px]">
              {[
                { l: 'Fecha nacimiento', v: al.fecha_nacimiento ? new Date(al.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '—' },
                { l: 'Nacionalidad', v: al.nacionalidad ?? 'Chilena' },
                { l: 'Dirección', v: al.direccion ?? '—' },
                { l: 'Nec. especiales', v: al.necesidades_especiales ?? 'Ninguna' },
              ].map((d, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#6b7280]">{d.l}</span>
                  <span className="text-[#1a2332] font-medium text-right">{d.v}</span>
                </div>
              ))}
            </div>
          </div>

          {fam && (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Apoderado</div>
              <div className="space-y-2 text-[12px]">
                <div className="font-medium text-[#1a2332]">{fam.nombre_apoderado} {fam.apellido_apoderado}</div>
                <div className="text-[#6b7280]">{fam.email}</div>
                {fam.telefono && <div className="text-[#6b7280]">{fam.telefono}</div>}
                {fam.rut && <div className="text-[#9ca3af] text-[11px]">RUT: {fam.rut}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: Evaluaciones + Asistencia reciente */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Evaluaciones</div>
              <Link href={`/calificaciones?alumno=${params.id}`} className="text-[10px] text-[var(--ar-accent)] hover:underline">Ver todas →</Link>
            </div>
            {(calificaciones ?? []).length === 0 ? (
              <p className="text-[12px] text-[#9ca3af]">Sin evaluaciones</p>
            ) : (
              <div className="space-y-2">
                {(calificaciones as any[]).slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#4b5563] truncate flex-1">{c.evaluacion?.nombre}</span>
                    <span className={`font-bold ml-2 ${c.nota >= 60 ? 'text-[#1a7a4c]' : 'text-[#c53030]'}`}>{c.nota}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Asistencia reciente</div>
              <Link href={`/asistencias`} className="text-[10px] text-[var(--ar-accent)] hover:underline">Ver todo →</Link>
            </div>
            {(asistencias ?? []).length === 0 ? (
              <p className="text-[12px] text-[#9ca3af]">Sin registros</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(asistencias as any[]).slice(0, 20).map((a: any, i: number) => {
                  const bg = a.estado === 'presente' ? 'bg-emerald-100' : a.estado === 'ausente' ? 'bg-red-100' : a.estado === 'tardanza' ? 'bg-amber-100' : 'bg-sky-100'
                  return <div key={i} className={`w-4 h-4 rounded-sm ${bg}`} title={`${a.fecha}: ${a.estado}`}/>
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Pagos + Reportes */}
        <div className="space-y-4">
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Estado de pagos</div>
            {totalCobros === 0 ? (
              <p className="text-[12px] text-[#9ca3af]">Sin cobros generados</p>
            ) : (
              <div className="space-y-1.5">
                {(cobros as any[]).slice(0, 6).map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#6b7280]">{c.mes}/{c.anio}</span>
                    <span className={`tag text-[9px] ${c.estado === 'pagado' ? 'tag-ok' : c.estado === 'mora' ? 'tag-mora' : 'tag-pend'}`}>{c.estado}</span>
                  </div>
                ))}
                {totalDeuda > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#f3f4f6] text-[12px] font-medium text-[#c53030]">
                    Deuda total: {formatMonto(totalDeuda)}
                  </div>
                )}
              </div>
            )}
          </div>

          {(reportes ?? []).length > 0 && (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Reportes diarios</div>
              <div className="space-y-1.5">
                {(reportes as any[]).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#6b7280]">{new Date(r.fecha + 'T12:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                    <span className="text-[#4b5563]">{r.estado_animo ?? '—'}</span>
                    {r.publicado && <span className="w-2 h-2 rounded-full bg-emerald-400"/>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
