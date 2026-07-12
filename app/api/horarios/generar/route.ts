import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generarHorarioLogico } from '@/lib/generador-horario'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'tutor'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const colegioId = (ur as any).colegio_id
  const body = await request.json()
  const { sede } = body

  // 1. Obtener alumnos activos
  let queryAlumnos = admin.from('alumnos').select('id, nombre, apellido, curso, jornada, nivel').eq('activo', true)
  if (colegioId) queryAlumnos = queryAlumnos.eq('colegio_id', colegioId)
  if (sede) queryAlumnos = queryAlumnos.eq('sede', sede)
  const { data: alumnos } = await queryAlumnos

  // 2. Obtener tutores
  let queryTutores = admin.from('usuarios').select('id, nombre, apellido').eq('rol', 'tutor').eq('activo', true)
  if (colegioId) queryTutores = queryTutores.eq('colegio_id', colegioId)
  const { data: tutores } = await queryTutores

  // 3. Obtener espacios
  let queryEspacios = admin.from('espacios').select('*').eq('activo', true)
  if (colegioId) queryEspacios = queryEspacios.eq('colegio_id', colegioId)
  if (sede) queryEspacios = queryEspacios.eq('sede', sede)
  const { data: espacios } = await queryEspacios

  // 4. Obtener experiencias
  let queryExp = admin.from('experiencias').select('*').eq('activo', true)
  if (colegioId) queryExp = queryExp.eq('colegio_id', colegioId)
  const { data: experiencias } = await queryExp

  // 5. Generar propuesta con lógica
  const propuesta = generarHorarioLogico(
    (alumnos ?? []) as any[],
    (tutores ?? []) as any[],
    (espacios ?? []) as any[],
    (experiencias ?? []) as any[],
    sede || 'santiago'
  )

  // 6. Guardar en BD
  const { data: saved } = await admin.from('propuestas_horario').insert({
    colegio_id: colegioId,
    sede: sede || 'santiago',
    anio: new Date().getFullYear(),
    periodo: 'semanal',
    estado: 'borrador',
    propuesta,
    restricciones: { alumnos: (alumnos ?? []).length, tutores: (tutores ?? []).length },
    generado_por: user.id,
  }).select().single()

  return NextResponse.json({ ok: true, propuesta, id: (saved as any)?.id })
}
