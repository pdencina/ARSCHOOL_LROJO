import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SEDE_COOKIE, SEDE_TODAS } from '@/lib/colegioScope'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST /api/sede-activa — el super_admin cambia la sede activa (guardada en cookie)
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { sede } = await request.json() // 'todas' o un colegio_id
  const valor = sede === SEDE_TODAS || !sede ? SEDE_TODAS : String(sede)

  // Validar que la sede exista (si no es 'todas')
  if (valor !== SEDE_TODAS) {
    const { data: existe } = await admin.from('colegios').select('id').eq('id', valor).single()
    if (!existe) return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  const res = NextResponse.json({ ok: true, sede: valor })
  res.cookies.set(SEDE_COOKIE, valor, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  })
  return res
}
