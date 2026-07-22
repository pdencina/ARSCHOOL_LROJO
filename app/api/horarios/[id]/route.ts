import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notificarHorarioPublicado } from '@/lib/notificaciones'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PATCH /api/horarios/[id] — Cambiar estado o propuesta de un horario
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Solo administradores pueden modificar horarios' }, { status: 403 })
  }

  const colegioId = (ur as any).colegio_id
  const body = await request.json()
  const updatePayload: Record<string, any> = {}

  // Actualizar estado
  if (body.estado) {
    if (!['borrador', 'publicado', 'archivado'].includes(body.estado)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    updatePayload.estado = body.estado
  }

  // Actualizar propuesta (edición de bloques)
  if (body.propuesta) {
    updatePayload.propuesta = body.propuesta
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('propuestas_horario')
    .update(updatePayload)
    .eq('id', params.id)
    .eq('colegio_id', colegioId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notificar tutores cuando se publica un horario
  if (body.estado === 'publicado' && data) {
    const titulo = (data as any).propuesta?.titulo ?? 'Horario semanal'
    // Fire and forget — no bloquear la respuesta
    notificarHorarioPublicado(colegioId, titulo).catch(console.error)
  }

  return NextResponse.json({ ok: true, propuesta: data })
}
