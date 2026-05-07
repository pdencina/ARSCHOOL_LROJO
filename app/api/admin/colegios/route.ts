import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
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

  const { data: ur } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if ((ur as any)?.rol !== 'super_admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { nombre, rut, direccion, telefono, plan } = await request.json()
  if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  // Usar service role para saltear RLS
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('colegios')
    .insert({ nombre, rut: rut || null, direccion: direccion || null, telefono: telefono || null, plan: plan ?? 'profesional' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  const { data } = await supabase.from('colegios').select('*').order('nombre')
  return NextResponse.json(data ?? [])
}