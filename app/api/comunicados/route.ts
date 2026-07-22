import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notificarComunicado } from '@/lib/notificaciones'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST: Crear comunicado y notificar apoderados
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin
    .from('usuarios')
    .select('rol, colegio_id, colegio:colegios(nombre)')
    .eq('id', user.id)
    .single()

  const u = ur as any
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'tutor'].includes(u?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { titulo, contenido, tipo, cursos, notificar = true } = body

  if (!titulo || !contenido) {
    return NextResponse.json({ error: 'Título y contenido son requeridos' }, { status: 400 })
  }

  // Insertar comunicado
  const { data: comunicado, error } = await admin.from('comunicados').insert({
    colegio_id: u.colegio_id,
    titulo,
    contenido,
    tipo: tipo ?? 'general',
    cursos: cursos && cursos.length > 0 ? cursos : null,
    enviado_at: new Date().toISOString(),
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notificar apoderados (fire and forget)
  if (notificar) {
    const colegioNombre = u.colegio?.nombre ?? 'AR School'
    notificarComunicado(
      u.colegio_id,
      titulo,
      contenido,
      colegioNombre,
      cursos
    ).catch(console.error)
  }

  return NextResponse.json({ ok: true, comunicado }, { status: 201 })
}
