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

// POST /api/control — Registrar ingreso o retiro
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  if (!['super_admin', 'admin', 'pastor_campus', 'tutor_supervisor'].includes(usuario?.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const {
    alumno_id, tipo, hora_esperada,
    persona_retiro_nombre, persona_retiro_rut, persona_retiro_parentesco,
    firma_retiro, motivo, observaciones,
  } = body

  if (!alumno_id || !tipo) {
    return NextResponse.json({ error: 'alumno_id y tipo son requeridos' }, { status: 400 })
  }

  // Calcular atraso/anticipado
  const ahora = new Date()
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  let esAtraso = false
  let esAnticipado = false
  let minutosDiferencia = 0

  if (hora_esperada) {
    const [hEsp, mEsp] = hora_esperada.split(':').map(Number)
    const [hAct, mAct] = horaActual.split(':').map(Number)
    minutosDiferencia = (hAct * 60 + mAct) - (hEsp * 60 + mEsp)

    if (tipo === 'ingreso' && minutosDiferencia > 5) {
      esAtraso = true // Más de 5 min tarde
    }
    if (tipo === 'retiro' && minutosDiferencia < -5) {
      esAnticipado = true // Más de 5 min antes
    }
  }

  // Verificar persona autorizada (para retiros)
  let esAutorizada = true
  if (tipo === 'retiro' && persona_retiro_nombre) {
    const { data: autorizados } = await admin
      .from('personas_retiro')
      .select('nombre')
      .eq('alumno_id', alumno_id)
      .eq('activo', true)

    // También verificar familia
    const { data: familia } = await admin
      .from('familias')
      .select('nombre_apoderado, apellido_apoderado')
      .eq('alumno_id', alumno_id)

    const nombresAutorizados = [
      ...(autorizados ?? []).map((a: any) => a.nombre?.toLowerCase()),
      ...(familia ?? []).map((f: any) => `${f.nombre_apoderado} ${f.apellido_apoderado}`.toLowerCase()),
    ]

    const nombreRetiroLower = persona_retiro_nombre.toLowerCase().trim()
    esAutorizada = nombresAutorizados.some(n => n && nombreRetiroLower.includes(n.split(' ')[0]))
  }

  const { data, error } = await admin.from('registros_control').insert({
    colegio_id: usuario.colegio_id,
    alumno_id,
    tipo,
    hora_registro: horaActual,
    hora_esperada: hora_esperada || null,
    es_atraso: esAtraso,
    es_anticipado: esAnticipado,
    minutos_diferencia: minutosDiferencia,
    justificado: !!motivo,
    motivo: motivo || null,
    persona_retiro_nombre: persona_retiro_nombre || null,
    persona_retiro_rut: persona_retiro_rut || null,
    persona_retiro_parentesco: persona_retiro_parentesco || null,
    es_autorizada: esAutorizada,
    firma_retiro: firma_retiro || null,
    firma_retiro_at: firma_retiro ? new Date().toISOString() : null,
    registrado_por: user.id,
    observaciones: observaciones || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    alerta: !esAutorizada ? 'PERSONA NO AUTORIZADA — Verificar identidad' : null,
  }, { status: 201 })
}

// GET /api/control?fecha=2027-08-20&tipo=ingreso
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = getAdmin()
  const { data: ur } = await admin.from('usuarios').select('rol, colegio_id').eq('id', user.id).single()
  const usuario = ur as any

  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]
  const tipo = searchParams.get('tipo')

  let query = admin
    .from('registros_control')
    .select('*, alumno:alumnos(nombre, apellido, curso)')
    .eq('colegio_id', usuario.colegio_id)
    .eq('fecha', fecha)
    .order('hora_registro', { ascending: false })

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
