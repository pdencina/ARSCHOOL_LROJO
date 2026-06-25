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

// POST: Guardar calificaciones (upsert)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'tutor'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()

  // Crear evaluación
  if (body.accion === 'crear_evaluacion') {
    const { data, error } = await admin.from('evaluaciones').insert({
      colegio_id: (ur as any).colegio_id,
      nombre: body.nombre,
      materia: body.materia,
      curso: body.curso,
      fecha: body.fecha,
      ponderacion: 100,
      creado_por: user.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // Guardar calificaciones
  const { evaluacion_id, resultados } = body
  // resultados: [{ alumno_id, nota }]

  if (!evaluacion_id || !resultados?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const upserts = resultados.map((r: any) => ({
    evaluacion_id,
    alumno_id: r.alumno_id,
    nota: r.nota,
    colegio_id: (ur as any).colegio_id,
    registrado_por: user.id,
  }))

  const { error } = await admin.from('calificaciones').upsert(upserts, { onConflict: 'evaluacion_id,alumno_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: upserts.length })
}
