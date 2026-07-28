import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Generar token único para un cobro (hash del id + secret)
function generarToken(cobroId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'arschool-secret'
  return createHash('sha256').update(`${cobroId}-${secret}`).digest('hex').slice(0, 16)
}

// POST /api/pagos/link — Generar link de pago para un cobro
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol').eq('id', user.id).single()
  if (!['super_admin', 'admin', 'pastor_campus', 'gestor_admision'].includes((ur as any)?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { cobro_id } = await request.json()
  if (!cobro_id) return NextResponse.json({ error: 'cobro_id requerido' }, { status: 400 })

  // Verificar que el cobro existe
  const { data: cobro } = await admin
    .from('cobros')
    .select('id, monto, monto_pagado, estado, mes, anio, alumno:alumnos(nombre, apellido)')
    .eq('id', cobro_id)
    .single()

  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  const token = generarToken(cobro_id)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arschool-lrojo-six.vercel.app'
  const link = `${baseUrl}/pago/${token}?id=${cobro_id}`

  return NextResponse.json({ link, token, cobro })
}

// GET /api/pagos/link?id=xxx&token=xxx — Verificar token y obtener datos del cobro (sin auth)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cobroId = searchParams.get('id')
  const token = searchParams.get('token')

  if (!cobroId || !token) {
    return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
  }

  // Verificar token
  const expectedToken = generarToken(cobroId)
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 403 })
  }

  const admin = getAdmin()
  const { data: cobro } = await admin
    .from('cobros')
    .select('id, monto, monto_pagado, estado, mes, anio, alumno:alumnos(nombre, apellido, curso)')
    .eq('id', cobroId)
    .single()

  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  return NextResponse.json(cobro)
}
