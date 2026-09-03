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
  const { searchParams } = new URL(request.url)
  const matriculaId = searchParams.get('matricula_id')
  const alumnoId = searchParams.get('alumno_id')
  const tipoDoc = searchParams.get('tipo') || 'contrato'
  const firmaToken = searchParams.get('token') // Token de firma para acceso sin auth

  const admin = getAdmin()

  // Verificar autenticación: sesión de usuario O token de firma válido
  let autorizado = false
  if (firmaToken) {
    const { data: ft } = await admin.from('firma_tokens').select('id, matricula_id, estado').eq('token', firmaToken).single()
    if (ft && (ft as any).estado !== 'cancelado') autorizado = true
  } else {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) autorizado = true
  }

  if (!autorizado) return new NextResponse('No autorizado', { status: 401 })
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

  // ─── Detectar programa para elegir la plantilla de contrato ───
  // Fuente confiable: programa_id de la matrícula o del alumno.
  // Si no existe (registros antiguos), se deduce del texto del curso.
  let programaCodigo: string | null = null
  const programaIdRef = matricula?.programa_id || alumno.programa_id || null
  if (programaIdRef) {
    const { data: prog } = await admin.from('programas').select('codigo').eq('id', programaIdRef).single()
    programaCodigo = (prog as any)?.codigo ?? null
  }

  const cursoLower = (alumno.curso || '').toLowerCase()
  const esLions = programaCodigo
    ? programaCodigo === 'lions_soccer'
    : (cursoLower.includes('lions') || cursoLower.includes('soccer'))
  const esWorship = programaCodigo
    ? programaCodigo === 'ar_worship'
    : (cursoLower.includes('worship') || cursoLower.includes('música') || cursoLower.includes('music'))
  const esPreschool = programaCodigo
    ? programaCodigo === 'play_group'
    : (cursoLower.includes('play') || cursoLower.includes('pre school'))

  // Aranceles oficiales 2026:
  //   Music & Play (0-7 años): matrícula $25.000 · mensual $40.000 (beca 30% => $28.000)
  //   AR Worship School (8-99): matrícula $50.000 · mensual $60.000 (beca 20% => $48.000)
  //   Lions Soccer: matrícula $45.000 · mensual $40.000
  const esMusicAndPlay = esWorship && cursoLower.includes('music')
  const defaultInicial = esLions ? 45000 : esMusicAndPlay ? 25000 : esWorship ? 50000 : 130000
  const defaultMensual = esLions ? 40000 : esMusicAndPlay ? 40000 : esWorship ? 60000 : 275000
  const defaultMeses = esLions ? 12 : esWorship ? 9 : 10

  // Modalidad del contrato: parámetro de la URL o lo guardado en la matrícula.
  // 'hermanos_2x1' => matrícula exenta por promoción de hermanos.
  const modalidadParam = searchParams.get('modalidad')
  const modalidad = modalidadParam || matricula?.modalidad_contrato || 'completo'
  const esHermanos2x1 = modalidad === 'hermanos_2x1'

  const montoInicialBase = matricula?.monto_matricula ?? defaultInicial
  const montoInicial = esHermanos2x1 ? 0 : montoInicialBase
  const montoMensual = matricula?.monto_mensual ?? defaultMensual
  const porcentajeBeca = matricula?.porcentaje_beca ?? 0
  const fechaMat = matricula?.fecha_matricula ?? new Date().toISOString().split('T')[0]
  const fechaInicioContrato = matricula?.fecha_inicio_contrato || fechaMat
  // Sede efectiva: la de la matrícula o, si no, la que corresponde al colegio_id
  const sedeCodigo = matricula?.sede
    || (colegio?.id === '22222222-2222-2222-2222-222222222222' ? 'puente_alto'
      : colegio?.id === '33333333-3333-3333-3333-333333333333' ? 'punta_arenas'
      : 'santiago')

  const sede = sedeCodigo === 'puente_alto' ? 'José Manuel Irarrázaval 0565, Comuna de Puente Alto'
    : sedeCodigo === 'punta_arenas' ? 'Chiloé 862, Comuna de Punta Arenas'
    : 'Victoria 52, Comuna de Santiago'

  // Ciudad de la sede (para jurisdicción y defaults de domicilio)
  const ciudadSede = sedeCodigo === 'punta_arenas' ? 'Punta Arenas'
    : sedeCodigo === 'puente_alto' ? 'Puente Alto'
    : 'Santiago'
  const firmaApoderado = matricula?.firma_apoderado ?? null
  const firmadoAt = matricula?.firmado_at ? new Date(matricula.firmado_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : null

  // Calcular meses de cobro basado en fecha de inicio real
  const mesInicio = new Date(fechaInicioContrato + 'T12:00').getMonth() + 1 // 1-12
  // Play/Preschool = 12 meses corridos, Lions = hasta enero siguiente, otros = hasta diciembre
  const mesesCobro = esPreschool ? 12 : esLions ? Math.max(1, 13 - mesInicio) : Math.max(1, 12 - mesInicio + 1)

  const nombreApoderado = `${familia?.nombre_apoderado ?? '___'} ${familia?.apellido_apoderado ?? '___'}`
  const rutApoderado = familia?.rut ?? '___'
  const direccionApoderado = familia?.direccion ?? '___'
  // Comuna del domicilio del apoderado. Si no está registrada, se usa la
  // ciudad de la sede (no siempre Santiago).
  const comunaApoderado = familia?.comuna || ciudadSede

  // Cobros para tabla
  const { data: cobros } = await admin.from('cobros').select('monto, mes, anio, tipo_concepto').eq('alumno_id', alumno.id).order('anio').order('mes')
  const cobrosmensuales = (cobros ?? []).filter((c: any) => c.tipo_concepto === 'aporte_mensual')
  const montoMensualReal = cobrosmensuales.length > 0 ? Math.max(...(cobrosmensuales as any[]).map((c: any) => c.monto)) : Math.round(montoMensual * (1 - porcentajeBeca / 100))

  const mesesNombres = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  let tablaAportes = ''

  // Intentar leer datos de cheque desde la matrícula
  const chequesMat = matricula?.cheques || null // array de números
  const bancoMat = matricula?.banco_cheque || ''

  // Agregar aporte inicial como primera línea (siempre si > 0)
  const fechaInicioDisplay = `${new Date(fechaInicioContrato + 'T12:00').getDate()}-${String(new Date(fechaInicioContrato + 'T12:00').getMonth() + 1).padStart(2, '0')}-${new Date(fechaInicioContrato + 'T12:00').getFullYear()}`
  if (esHermanos2x1) {
    // Matrícula exenta: se deja constancia en la tabla de aportes
    tablaAportes = `<tr style="background:#EDF5F0;"><td><strong>Matrícula — ${fechaInicioDisplay}</strong></td><td><strong>EXENTA</strong> <span style="font-size:10px;">(promoción 2x1 hermanos)</span></td><td></td><td></td></tr>`
  } else if (montoInicial > 0) {
    tablaAportes = `<tr style="background:#f8f9fb;"><td><strong>Aporte inicial — ${fechaInicioDisplay}</strong></td><td><strong>$${montoInicial.toLocaleString('es-CL')} CLP</strong></td><td></td><td></td></tr>`
  }

  if (cobrosmensuales.length > 0) {
    // Fecha real de inicio para el primer cobro (proporcional)
    const diaInicio = new Date(fechaInicioContrato + 'T12:00').getDate()
    tablaAportes += (cobrosmensuales as any[]).map((c: any, idx: number) => {
      const numCheque = chequesMat?.[idx] || ''
      const banco = numCheque ? bancoMat : ''
      // Primer cobro: usar fecha real de inicio si es proporcional (monto diferente al estándar)
      const esProporcional = idx === 0 && c.monto < montoMensualReal
      const fechaLabel = esProporcional ? `${diaInicio} ${mesesNombres[(c.mes - 1)]} ${c.anio}` : `1 ${mesesNombres[(c.mes - 1)]} ${c.anio}`
      const notaProporcional = esProporcional ? ' <em style="font-size:10px;color:#6b7280;">(proporcional)</em>' : ''
      return `<tr><td>${fechaLabel}${notaProporcional}</td><td>$${c.monto.toLocaleString('es-CL')} CLP</td><td>${numCheque}</td><td>${banco}</td></tr>`
    }).join('')
  } else {
    // Generar meses desde la fecha de inicio del contrato
    const mesesGenerados: { nombre: string; anio: number }[] = []
    const inicioIdx = mesInicio - 1 // 0-indexed

    if (esPreschool) {
      // Play/Preschool: 12 meses corridos desde fecha inicio
      for (let i = 0; i < 12; i++) {
        const mesIdx = (inicioIdx + i) % 12
        const anioMes = inicioIdx + i >= 12 ? anio + 1 : anio
        mesesGenerados.push({ nombre: mesesNombres[mesIdx], anio: anioMes })
      }
    } else {
      // Otros: desde mes inicio hasta diciembre
      for (let i = inicioIdx; i < 12; i++) {
        mesesGenerados.push({ nombre: mesesNombres[i], anio })
      }
      // Lions incluye enero del año siguiente
      if (esLions && mesInicio <= 12) {
        mesesGenerados.push({ nombre: 'enero', anio: anio + 1 })
      }
    }

    tablaAportes = mesesGenerados.map((m, idx) => {
      const numCheque = chequesMat?.[idx] || ''
      const banco = numCheque ? bancoMat : ''
      return `<tr><td>1 ${m.nombre} ${m.anio}</td><td>$${montoMensualReal.toLocaleString('es-CL')} CLP</td><td>${numCheque}</td><td>${banco}</td></tr>`
    }).join('')
  }

  // Tabla para pagaré (solo 2 columnas: fecha + monto)
  let tablaPagare = ''
  // Aporte inicial en pagaré
  if (montoInicial > 0) {
    tablaPagare = `<tr style="background:#f8f9fb;"><td><strong>Aporte inicial — ${fechaInicioDisplay}</strong></td><td><strong>$${montoInicial.toLocaleString('es-CL')} CLP</strong></td></tr>`
  }
  if (cobrosmensuales.length > 0) {
    const diaInicioP = new Date(fechaInicioContrato + 'T12:00').getDate()
    tablaPagare = (cobrosmensuales as any[]).map((c: any, idx: number) => {
      const esProporcional = idx === 0 && c.monto < montoMensualReal
      const fechaLabel = esProporcional ? `${diaInicioP} ${mesesNombres[(c.mes - 1)]} ${c.anio}` : `1 ${mesesNombres[(c.mes - 1)]} ${c.anio}`
      return `<tr><td>${fechaLabel}</td><td>$${c.monto.toLocaleString('es-CL')} CLP</td></tr>`
    }).join('')
  } else {
    // Generar pagaré con misma lógica de meses
    const mesesPagare: { nombre: string; anio: number }[] = []
    const inicioIdx = mesInicio - 1

    if (esPreschool) {
      for (let i = 0; i < 12; i++) {
        const mesIdx = (inicioIdx + i) % 12
        const anioMes = inicioIdx + i >= 12 ? anio + 1 : anio
        mesesPagare.push({ nombre: mesesNombres[mesIdx], anio: anioMes })
      }
    } else {
      for (let i = inicioIdx; i < 12; i++) {
        mesesPagare.push({ nombre: mesesNombres[i], anio })
      }
      if (esLions && mesInicio <= 12) mesesPagare.push({ nombre: 'enero', anio: anio + 1 })
    }

    tablaPagare = mesesPagare.map(m => `<tr><td>1 ${m.nombre} ${m.anio}</td><td>$${montoMensualReal.toLocaleString('es-CL')} CLP</td></tr>`).join('')
  }

  const fechaFormateada = `${new Date(fechaMat).getDate()} de ${mesesNombres[new Date(fechaMat).getMonth()]} de ${anio}`
  const fechaNacDisplay = alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '___'

  const datosBase = {
    fecha: fechaFormateada,
    nombreApoderado,
    rutApoderado,
    direccionApoderado,
    comunaApoderado,
    ciudadSede,
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
    // Sumar montos reales de los cobros mensuales (incluye proporcional) + aporte inicial
    const sumaCobrosMensuales = cobrosmensuales.length > 0
      ? (cobrosmensuales as any[]).reduce((sum: number, c: any) => sum + c.monto, 0)
      : montoMensualReal * mesesCobro
    const montoAnual = sumaCobrosMensuales + montoInicial
    contenido = generarPagare({ ...datosBase, montoAnual, montoMensual: montoMensualReal, tablaAportes: tablaPagare })
  } else if (esLions) {
    titulo = `Contrato Lions Soccer — ${alumno.nombre} ${alumno.apellido}`
    const { generarContratoLions } = await import('@/lib/contratos/lions')
    // Categoría: "Sub-12" / "Juvenil" en cualquier parte del curso
    const cursoLions = alumno.curso || ''
    const subMatch = cursoLions.match(/Sub-?\s*(\d{1,2})/i)
    const categoriaLions = subMatch
      ? `Sub-${subMatch[1]}`
      : (/juvenil/i.test(cursoLions) ? 'Juvenil' : (cursoLions.split(' - ')[1] || 'General'))
    contenido = generarContratoLions({ ...datosBase, categoria: categoriaLions, horario: '' })
  } else if (esWorship) {
    titulo = `Contrato AR Worship — ${alumno.nombre} ${alumno.apellido}`
    const { generarContratoWorship } = await import('@/lib/contratos/worship')
    // El instrumento es el último segmento del curso (ej: "AR Worship - Ciclo 1 - Guitarra")
    const INSTRUMENTOS_WORSHIP = ['Guitarra', 'Bajo', 'Teclado', 'Batería', 'Bateria', 'Canto', 'Saxophone', 'Saxofón', 'Violín', 'Violin']
    const instrumentoDetectado = INSTRUMENTOS_WORSHIP.find(i => (alumno.curso || '').toLowerCase().includes(i.toLowerCase()))
    contenido = generarContratoWorship({ ...datosBase, instrumento: instrumentoDetectado || 'Por asignar', ciclo: alumno.curso?.includes('Ciclo 2') ? 'Ciclo 2' : 'Ciclo 1', horario: alumno.curso?.includes('Ciclo 2') ? 'Sábados 11:20-12:40' : 'Sábados 09:30-10:50' })
  } else if (esPreschool) {
    titulo = `Contrato Preschool — ${alumno.nombre} ${alumno.apellido}`
    contenido = generarContratoPreschool(datosBase)
  } else {
    titulo = `Contrato — ${alumno.nombre} ${alumno.apellido}`
    contenido = generarContratoARSchool(datosBase)
  }

  // Agregar firmas — contrato usa firma_apoderado, pagaré usa firma_pagare
  const firmaPagare = matricula?.firma_pagare ?? null
  const firmadoPagareAt = matricula?.firmado_pagare_at ? new Date(matricula.firmado_pagare_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : null
  const firmas = tipoDoc === 'pagare'
    ? seccionFirmas(firmaPagare, firmadoPagareAt || firmadoAt, nombreApoderado, rutApoderado)
    : seccionFirmas(firmaApoderado, firmadoAt, nombreApoderado, rutApoderado)

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
