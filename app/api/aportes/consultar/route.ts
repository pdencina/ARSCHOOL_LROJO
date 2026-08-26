import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/aportes/consultar?curso=Play+Group&sede=santiago&jornada=completa&tipo_ingreso=nuevo&anio=2027
// Público — devuelve montos actuales desde tabla_aportes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const curso = searchParams.get('curso') || ''
  const sede = searchParams.get('sede') || ''
  const jornada = searchParams.get('jornada') || 'completa'
  const tipoIngreso = searchParams.get('tipo_ingreso') || 'nuevo'
  const anioParam = searchParams.get('anio')
  const anio = anioParam ? parseInt(anioParam) : new Date().getFullYear()

  const admin = getAdmin()

  // Determinar nivel según curso
  const cursoLower = curso.toLowerCase()
  const esPlaygroup = cursoLower.includes('play') || cursoLower.includes('pre school')
  const nivel = esPlaygroup ? 'Playgroup' : 'Preschool a High School'
  const jornadaTipo = jornada === 'completa' ? 'completa' : 'media'

  // Buscar aporte mensual
  const { data: mensuales } = await admin
    .from('tabla_aportes')
    .select('monto, sede, jornada, tipo_ingreso')
    .eq('tipo', 'mensual')
    .eq('nivel', nivel)
    .eq('activo', true)
    .eq('anio', anio)

  let montoMensual = 0
  if (mensuales && mensuales.length > 0) {
    const candidatos = mensuales as any[]
    // Prioridad de búsqueda: más específico → más genérico
    const match = candidatos.find(a => a.tipo_ingreso === tipoIngreso && a.sede === sede && (a.jornada === jornadaTipo || !a.jornada))
      || candidatos.find(a => a.tipo_ingreso === 'todos' && a.sede === sede && (a.jornada === jornadaTipo || !a.jornada))
      || candidatos.find(a => a.tipo_ingreso === tipoIngreso && !a.sede && (a.jornada === jornadaTipo || !a.jornada))
      || candidatos.find(a => a.sede === sede && (a.jornada === jornadaTipo || !a.jornada))
      || candidatos.find(a => !a.sede && (a.jornada === jornadaTipo || !a.jornada))
      || candidatos[0]
    montoMensual = match.monto
  }

  // Buscar aporte inicial (también puede variar por sede)
  const { data: iniciales } = await admin
    .from('tabla_aportes')
    .select('monto, sede, tipo_ingreso')
    .eq('tipo', 'inicial')
    .eq('nivel', nivel)
    .eq('activo', true)
    .eq('anio', anio)

  let montoInicial = 0
  if (iniciales && iniciales.length > 0) {
    const candidatos = iniciales as any[]
    const match = candidatos.find(a => a.tipo_ingreso === tipoIngreso && a.sede === sede)
      || candidatos.find(a => a.tipo_ingreso === 'todos' && a.sede === sede)
      || candidatos.find(a => a.tipo_ingreso === tipoIngreso && !a.sede)
      || candidatos.find(a => a.sede === sede)
      || candidatos.find(a => !a.sede)
      || candidatos[0]
    montoInicial = match.monto
  }

  return NextResponse.json({
    nivel,
    monto_inicial: montoInicial,
    monto_mensual: montoMensual,
    sede: sede || 'default',
    jornada: jornadaTipo,
  })
}
