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

// GET /api/asistencias/check?fecha=2026-07-13
// Verifica si el tutor ya registró asistencia para esa fecha
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ registrada: true }) // Si no hay user, no mostrar banner

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const u = ur as any

  if (u?.rol !== 'tutor') return NextResponse.json({ registrada: true })

  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get('fecha') ?? new Date().toISOString().split('T')[0]

  // Buscar si hay al menos 1 registro de asistencia del colegio para hoy
  const { count } = await admin
    .from('asistencias')
    .select('*', { count: 'exact', head: true })
    .eq('colegio_id', u.colegio_id)
    .eq('fecha', fecha)
    .eq('registrado_por', user.id)

  return NextResponse.json({ registrada: (count ?? 0) > 0 })
}
