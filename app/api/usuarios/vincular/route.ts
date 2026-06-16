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

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { usuario_id, alumno_id, tipo, parentesco } = await request.json()

  if (!usuario_id || !alumno_id || !tipo) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  if (tipo === 'apoderado') {
    const { error } = await admin.from('tutor_alumnos').upsert({
      tutor_id: usuario_id,
      alumno_id,
      parentesco: parentesco ?? 'apoderado',
    }, { onConflict: 'tutor_id,alumno_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (tipo === 'alumno') {
    const { error } = await admin.from('usuario_alumno').upsert({
      usuario_id,
      alumno_id,
    }, { onConflict: 'usuario_id,alumno_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
