import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ESTILOS_CONTRATO, seccionFirmas, botonImprimir } from '@/lib/contratos/estilos'
import { generarContratoPreschool } from '@/lib/contratos/preschool'
import { generarContratoARSchool } from '@/lib/contratos/arschool'
import { generarPagare } from '@/lib/contratos/pagare'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const SEDES: Record<string, string> = {
  '11111111-1111-1111-1111-111111111111': 'Victoria 52, Comuna de Santiago',
  '22222222-2222-2222-2222-222222222222': 'José Manuel Irarrázaval 0565, Comuna de Puente Alto',
  '33333333-3333-3333-3333-333333333333': 'Chiloé 862, Comuna de Punta Arenas',
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const matriculaId = searchParams.get('matricula_id')
  const alumnoId = searchParams.get('alumno_id')
  const tipoDoc = searchParams.get('tipo') || 'contrato' // contrato | pagare

  const admin = getAdmin()
  let alumno: any, familia: any, matricula: any, colegio: any

  if (matriculaId) {
    const { data: mat } = await admin.from('matriculas').select('*').eq('id', matriculaId).single()
    matricula = mat
    if (!matricula) return new NextResponse('Matrícula no encontrada', { status: 404 })
    const { data: al } = await admin.from('alumnos').select('*, colegio:colegios(*)').eq('id', matricula.alumno_id).single()
    alumno = al
  } else if (alumnoId) {
    const { data: al } = await admin.from('alumnos').select('*, colegio:colegios(*)').eq('id', alumnoId).single()
    alumno = al
    const { data: mat } = await admin.from('matriculas').select('*').eq('alumno_id', alumnoId).order('created_at', { ascending: false }).limit(1).single()
    matricula = mat
  }

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })
  colegio = alumno.colegio

  // Buscar familia
  if (matricula?.familia_id) {
    const { data: fam } = await admin.from('familias').select('*').eq('id', matricula.familia_id).single()
    familia = fam
  }
  if (!familia) {
    const { data: fam } = await admin.from('familias').select('*').eq('alumno_id', alumno.id).limit(1).single()
    familia = fam
  }
  if (!familia || (!familia.nombre_apoderado && !familia.rut)) {
    const { data: vinculo } = await admin.from('tutor_alumnos').select('tutor_id').eq('alumno_id', alumno.id).limit(1).single()
    if (vinculo) {
      const { data: uApoderado } = await admin.from('usuarios').select('nombre, apellido, email').eq('id', (vinculo as any).tutor_id).single()
      if (uApoderado) {
        familia = { ...familia, nombre_apoderado: familia?.nombre_apoderado || (uApoderado as any).nombre, apellido_apoderado: familia?.apellido_apoderado || (uApoderado as any).apellido, rut: familia?.rut || null, direccion: familia?.direccion || null }
      }
    }
  }

  // Datos comunes
  const anio = matricula?.anio_escolar ?? new Date().getFullYear()
  const montoInicial = matricula?.monto_matricula ?? 130000
  const montoMensual = matricula?.monto_mensual ?? 275000
  const mesesCobro = 10
  const porcentajeBeca = matricula?.porcentaje_beca ?? 0
  const fechaMat = matricula?.fecha_matricula ?? new Date().toISOString().split('T')[0]
  const sede = SEDES[colegio?.id] ?? 'Victoria 52, Comuna de Santiago'
  const firmaApoderado = matricula?.firma_apoderado ?? null
  const firmadoAt = matricula?.firmado_at ? new Date(matricula.firmado_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : null

  const nombreApoderado = `${familia?.nombre_apoderado ?? '___'} ${familia?.apellido_apoderado ?? '___'}`
  const rutApoderado = familia?.rut ?? '___'
  const direccionApoderado = familia?.direccion ?? '___'
  const comunaApoderado = familia?.comuna ?? 'Santiago'

  // Cobros para tabla
  const { data: cobros } = await admin.from('cobros').select('monto, mes, anio').eq('alumno_id', alumno.id).order('anio').order('mes')
  const cobrosmensuales = (cobros ?? []).filter((c: any) => c.monto !== montoInicial)
  const montoMensualReal = cobrosmensuales.length > 0 ? (cobrosmensuales as any[])[0].monto : Math.round(montoMensual * (1 - porcentajeBeca / 100))

  const mesesNombres = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  let tablaAportes = ''
  if (cobrosmensuales.length > 0) {
    tablaAportes = (cobrosmensuales as any[]).map((c: any) => `<tr><td>1 ${mesesNombres[(c.mes - 1)]} ${c.anio}</td><td>$${c.monto.toLocaleString('es-CL')} CLP</td><td></td><td></td></tr>`).join('')
  } else {
    const meses = ['marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    tablaAportes = meses.map(m => `<tr><td>1 ${m} ${anio}</td><td>$${montoMensualReal.toLocaleString('es-CL')} CLP</td><td></td><td></td></tr>`).join('')
  }

  const fechaFormateada = `${new Date(fechaMat).getDate()} de ${mesesNombres[new Date(fechaMat).getMonth()]} de ${anio}`
  const fechaNacDisplay = alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '___'

  // Determinar tipo de contrato
  const cursoLower = (alumno.curso || '').toLowerCase()
  const esPreschool = cursoLower.includes('play') || cursoLower.includes('pre school')

  const datosBase = {
    fecha: fechaFormateada,
    nombreApoderado,
    rutApoderado,
    direccionApoderado,
    comunaApoderado,
    nombreAlumno: `${alumno.nombre} ${alumno.apellido}`,
    rutAlumno: alumno.rut ?? '___',
    fechaNacimiento: fechaNacDisplay,
    sede,
    anio,
    montoInicial,
    montoMensual,
    mesesCobro,
    porcentajeBeca,
    nombreBeca: '',
    tablaAportes,
    modalidad: alumno.jornada === 'completa' ? 'presencial' : 'presencial',
    jornada: alumno.jornada || 'completa',
  }

  let contenido = ''
  let titulo = ''

  if (tipoDoc === 'pagare') {
    titulo = `Pagaré — ${alumno.nombre} ${alumno.apellido}`
    const montoAnual = montoMensualReal * mesesCobro
    contenido = generarPagare({ ...datosBase, montoAnual, montoMensual: montoMensualReal })
  } else if (esPreschool) {
    titulo = `Contrato Preschool — ${alumno.nombre} ${alumno.apellido}`
    contenido = generarContratoPreschool(datosBase)
  } else {
    titulo = `Contrato — ${alumno.nombre} ${alumno.apellido}`
    contenido = generarContratoARSchool(datosBase)
  }

  // Agregar firmas solo al contrato (no al pagaré, ya tiene su propia)
  const firmas = tipoDoc !== 'pagare' ? seccionFirmas(firmaApoderado, firmadoAt, nombreApoderado, rutApoderado) : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${titulo}</title>
<style>${ESTILOS_CONTRATO}</style>
</head>
<body>
${contenido}
${firmas}
${botonImprimir(new Date().toLocaleDateString('es-CL'))}
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
