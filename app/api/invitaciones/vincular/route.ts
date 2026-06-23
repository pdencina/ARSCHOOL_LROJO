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

// POST: Apoderado usa código de invitación para vincularse
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { codigo } = await request.json()
  if (!codigo) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const admin = getAdmin()

  // Buscar invitación
  const { data: inv } = await admin
    .from('invitaciones')
    .select('*')
    .eq('codigo', codigo.toUpperCase().trim())
    .eq('usado', false)
    .single()

  if (!inv) {
    return NextResponse.json({ error: 'Código inválido o ya utilizado' }, { status: 404 })
  }

  // Verificar expiración
  if (inv.expira_at && new Date(inv.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Este código ha expirado' }, { status: 410 })
  }

  // Verificar que el usuario existe en public.usuarios
  const { data: usuario } = await admin.from('usuarios').select('id, rol, colegio_id').eq('id', user.id).single()

  if (!usuario) {
    // Crear registro en public.usuarios como apoderado
    const { data: authUser } = await admin.auth.admin.getUserById(user.id)
    await admin.from('usuarios').insert({
      id: user.id,
      email: authUser.user?.email ?? user.email,
      nombre: authUser.user?.user_metadata?.nombre ?? 'Apoderado',
      apellido: authUser.user?.user_metadata?.apellido ?? '',
      rol: 'apoderado',
      colegio_id: inv.colegio_id,
      activo: true,
    })
  } else if (usuario.rol !== 'apoderado' && usuario.rol !== 'alumno') {
    return NextResponse.json({ error: 'Tu cuenta no es de apoderado/alumno' }, { status: 400 })
  }

  // Vincular al alumno
  await admin.from('tutor_alumnos').upsert({
    tutor_id: user.id,
    alumno_id: inv.alumno_id,
    parentesco: inv.parentesco ?? 'apoderado',
  }, { onConflict: 'tutor_id,alumno_id' })

  // Marcar invitación como usada
  await admin.from('invitaciones').update({
    usado: true,
    usado_por: user.id,
    usado_at: new Date().toISOString(),
  }).eq('id', inv.id)

  return NextResponse.json({ ok: true, alumno_id: inv.alumno_id })
}
