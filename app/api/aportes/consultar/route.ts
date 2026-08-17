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

  // Buscar aporte inicial
  const { data: iniciales } = await admin
    .from('tabla_aportes')
    .select('monto, sede, nivel')
    .eq('tipo', 'inicial')
    .eq('nivel', nivel)
    .eq('activo', true)
    .eq('anio', anio)

  let montoInicial = 0
  if (iniciales && iniciales.length > 0) {
    const conSede = (iniciales as any[]).find(a => a.sede === sede)
    const sinSede = (iniciales as any[]).find(a => !a.sede)
    montoInicial = (conSede || sinSede || iniciales[0] as any).monto
  }

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
    const match1 = candidatos.find(a => (a.tipo_ingreso === tipoIngreso || a.tipo_ingreso === 'todos') && a.sede === sede && (a.jornada === jornadaTipo || !a.jornada))
    const match2 = candidatos.find(a => a.sede === sede && (a.jornada === jornadaTipo || !a.jornada))
    const match3 = candidatos.find(a => !a.sede && (a.jornada === jornadaTipo || !a.jornada))
    const match4 = candidatos.find(a => (a.jornada === jornadaTipo || !a.jornada))
    const match5 = candidatos[0]
    montoMensual = (match1 || match2 || match3 || match4 || match5).monto
  }

  return NextResponse.json({
    nivel,
    monto_inicial: montoInicial,
    monto_mensual: montoMensual,
    sede: sede || 'default',
    jornada: jornadaTipo,
  })
}
