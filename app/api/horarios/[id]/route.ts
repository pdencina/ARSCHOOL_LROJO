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

// PATCH /api/horarios/[id] — Cambiar estado o propuesta de un horario
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  if (!['super_admin', 'admin'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Solo administradores pueden modificar horarios' }, { status: 403 })
  }

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
    .eq('colegio_id', (ur as any).colegio_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, propuesta: data })
}
