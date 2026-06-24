import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET: Obtener reportes (por alumno o por fecha)
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')
  const fecha = searchParams.get('fecha')
  const curso = searchParams.get('curso')

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  let query = admin.from('reportes_diarios').select('*, alumno:alumnos(nombre, apellido, curso)')

  if (['apoderado', 'alumno'].includes(usuario?.rol)) {
    // Portal: ver solo los reportes de sus alumnos
    let ids: string[] = []
    if (usuario.rol === 'alumno') {
      const { data } = await admin.from('usuario_alumno').select('alumno_id').eq('usuario_id', user.id)
      ids = (data ?? []).map((r: any) => r.alumno_id)
    } else {
      const { data } = await admin.from('tutor_alumnos').select('alumno_id').eq('tutor_id', user.id)
      ids = (data ?? []).map((r: any) => r.alumno_id)
    }
    if (ids.length === 0) return NextResponse.json([])
    query = query.in('alumno_id', ids).eq('publicado', true)
  } else {
    // Staff: ver reportes del colegio
    query = query.eq('colegio_id', usuario.colegio_id)
    if (curso) {
      const { data: als } = await admin.from('alumnos').select('id').eq('colegio_id', usuario.colegio_id).eq('curso', curso)
      const ids = (als ?? []).map((a: any) => a.id)
      if (ids.length > 0) query = query.in('alumno_id', ids)
    }
  }

  if (alumnoId) query = query.eq('alumno_id', alumnoId)
  if (fecha) query = query.eq('fecha', fecha)

  const { data, error } = await query.order('fecha', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: Crear o actualizar reporte diario
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'tutor'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { alumno_id, fecha, ...campos } = body

  if (!alumno_id) return NextResponse.json({ error: 'alumno_id requerido' }, { status: 400 })

  const reporteData = {
    colegio_id: usuario.colegio_id,
    alumno_id,
    fecha: fecha || new Date().toISOString().split('T')[0],
    registrado_por: user.id,
    ...campos,
  }

  const { data, error } = await admin.from('reportes_diarios').upsert(reporteData, {
    onConflict: 'alumno_id,fecha',
  }).select('*, alumno:alumnos(nombre, apellido, curso)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
