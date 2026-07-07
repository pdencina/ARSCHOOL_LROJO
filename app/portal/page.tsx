export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PortalInicio from '@/components/portal/PortalInicio'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function PortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('*, colegio:colegios(nombre)').eq('id', user.id).single()
  const u = ur as any
  const rol = u?.rol

  if (!rol || !['apoderado', 'alumno'].includes(rol)) {
    redirect('/login')
  }

  // Datos del alumno vinculado
  let alumnoId: string | null = null
  let alumno: any = null

  if (rol === 'alumno') {
    const { data: va } = await admin.from('usuario_alumno').select('alumno_id').eq('usuario_id', user.id).single()
    alumnoId = (va as any)?.alumno_id ?? null
  } else {
    const { data: ta } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id).limit(1).single()
    alumnoId = (ta as any)?.alumno_id ?? null
  }

  if (alumnoId) {
    const { data: a } = await admin.from('alumnos').select('*, familias(nombre_apoderado, apellido_apoderado, email)').eq('id', alumnoId).single()
    alumno = a
  }

  // Stats del alumno
  const mes = new Date().getMonth() + 1
  const anio = new Date().getFullYear()

  const [{ data: asistencias }, { data: calificaciones }, { data: comunicados }, { data: cobros }] = await Promise.all([
    alumnoId ? admin.from('asistencias').select('estado').eq('alumno_id', alumnoId) : Promise.resolve({ data: [] }),
    alumnoId ? admin.from('calificaciones').select('nota').eq('alumno_id', alumnoId) : Promise.resolve({ data: [] }),
    u.colegio_id ? admin.from('comunicados').select('id, titulo, tipo, enviado_at').eq('colegio_id', u.colegio_id).order('enviado_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
    alumnoId && rol === 'apoderado' ? admin.from('cobros').select('estado, monto, monto_pagado').eq('alumno_id', alumnoId).eq('mes', mes).eq('anio', anio) : Promise.resolve({ data: [] }),
  ])

  const pctAsist = (asistencias ?? []).length > 0
    ? Math.round((asistencias ?? []).filter((a: any) => a.estado === 'presente').length / (asistencias ?? []).length * 100)
    : null

  const notas = (calificaciones ?? []).map((c: any) => c.nota).filter(Boolean)
  const promedio = notas.length ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(1) : null

  const deuda = (cobros ?? []).filter((c: any) => c.estado !== 'pagado').reduce((a: number, c: any) => a + (c.monto - (c.monto_pagado ?? 0)), 0)

  // Check for pending signatures
  let pendientesFirma = 0
  if (rol === 'apoderado') {
    const { data: vinculos } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
    const ids = (vinculos ?? []).map((v: any) => v.alumno_id)
    if (ids.length > 0) {
      const { data: mats } = await admin.from('matriculas').select('id, firma_apoderado').in('alumno_id', ids).is('firma_apoderado', null)
      pendientesFirma = (mats ?? []).length
    }
  }

  return (
    <PortalInicio
      usuario={u}
      alumno={alumno}
      rol={rol}
      stats={{ pctAsist, promedio, totalNotas: notas.length, deuda, totalAsistencias: (asistencias ?? []).length }}
      comunicados={(comunicados as any[]) ?? []}
      pendientesFirma={pendientesFirma}
    />
  )
}
