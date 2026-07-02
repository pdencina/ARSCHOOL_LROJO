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
  const { data: fam } = await admin.from('familias').select('*').eq('alumno_id', alumno.id).limit(1).single()
  familia = fam

  const anio = matricula?.anio_escolar ?? new Date().getFullYear()
  const montoMat = matricula?.monto_matricula ?? 130000
  const fechaMat = matricula?.fecha_matricula ?? new Date().toISOString().split('T')[0]
  const sede = SEDES[colegio?.id] ?? 'Victoria 52, Comuna de Santiago'

  // Cobros
  const { data: cobros } = await admin.from('cobros').select('monto, mes, anio').eq('alumno_id', alumno.id).eq('anio', anio).order('mes')
  const montoCuota = cobros && cobros.length > 0 ? (cobros as any[])[0].monto : 275000
  const meses = ['marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

  const tablaP = meses.map((m, i) => `<tr><td>1 ${m} ${anio}</td><td>$${montoCuota.toLocaleString('es-CL')} CLP</td><td></td><td></td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Contrato — ${alumno.nombre} ${alumno.apellido}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Times New Roman', serif; color: #1a1a1a; padding: 60px 70px; max-width: 850px; margin: 0 auto; font-size: 13px; line-height: 1.8; }
h1 { font-size: 15px; text-align: center; margin: 30px 0 40px; text-transform: uppercase; letter-spacing: 0.03em; font-weight: bold; }
.header { text-align: center; margin-bottom: 40px; }
.header h2 { font-family: sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 0.04em; }
.header h3 { font-family: 'Comic Sans MS', cursive; font-size: 20px; font-weight: bold; color: #333; }
p { margin-bottom: 12px; text-align: justify; }
.clausula { margin: 20px 0; }
.clausula-title { font-weight: bold; text-decoration: underline; }
ol { margin-left: 20px; margin-bottom: 16px; }
ol li { margin-bottom: 8px; text-align: justify; }
.highlight { background: #e8f4fd; padding: 2px 4px; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
table th, table td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
table th { background: #f5f5f5; font-weight: bold; }
.firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 80px; }
.firma { text-align: center; }
.firma-line { border-top: 1px solid #000; padding-top: 8px; margin-top: 80px; font-size: 12px; }
.no-print { text-align: center; margin-top: 40px; }
@media print { .no-print { display: none; } body { padding: 40px 50px; } }
</style>
</head>
<body>

<div class="header">
<h2>FUNDACIÓN</h2>
<h3>arm global</h3>
</div>

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCACIONALES</h1>

<p>En Santiago, a ${new Date(fechaMat).getDate()} de ${new Date(fechaMat).toLocaleDateString('es-CL', { month: 'long' })} de ${anio}, se celebra el presente Contrato de Prestación de Servicios Educacionales no adscritos al sistema escolar formal, entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, debidamente representada por <strong>PATRICIO FERNANDO BURGOS PÉREZ</strong>, RUT 12.274.490-6, ambos domiciliados en VICTORIA 52, Comuna de Santiago, Región Metropolitana, Santiago de Chile, que en adelante se denominará "<strong>EL CENTRO</strong>"; y don(ña) <strong class="highlight">${familia?.nombre_apoderado ?? '___'} ${familia?.apellido_apoderado ?? '___'}</strong>, RUT <strong class="highlight">${familia?.rut ?? 'XX.XXX.XXX-X'}</strong>, con domicilio en <strong class="highlight">${familia?.direccion ?? '___________________________________'}</strong>, que en adelante se denominará "<strong>EL APODERADO</strong>", y en conjunto como "<strong>LAS PARTES</strong>", acuerdan lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO</span>: La <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, organización sin fines de lucro legalmente constituida conforme a la Ley N° 20.500 y al Código Civil chileno, es la entidad responsable del programa educativo "<strong>AR SCHOOL GLOBAL</strong>", el cual funciona como Centro Educacional Alternativo de acompañamiento pedagógico y formativo, no adscrito al sistema escolar formal, destinado a niños y niñas de los niveles Preschool, Elementary School, Middle School y High School, en adelante "EL CENTRO".</p>
<p>AR SCHOOL GLOBAL desarrolla sus actividades en las siguientes sedes: Victoria 52, Comuna de Santiago; José Manuel Irarrázaval 0565, Comuna de Puente Alto; y Chiloé 862, Comuna de Punta Arenas.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO</span>: Para todos los efectos de este contrato, se entiende por APODERADO a la persona que, como responsable del(los) hijo(s), suscribe el presente instrumento, quien asume la totalidad de las obligaciones, deberes y compromisos que en él se consignan.</p>
<p>El APODERADO ha solicitado a EL CENTRO, quien acepta, la matrícula y la prestación de servicios educacionales de acompañamiento pedagógico y formativo no adscritos al sistema escolar formal, en la sede ubicada en <strong class="highlight">${sede}</strong>, para el año ${anio}, respecto de su(s) representado(a)(s) que se individualizan a continuación, en adelante "EL REPRESENTADO":</p>
<p>Nombre completo: <strong class="highlight">${alumno.nombre} ${alumno.apellido}</strong><br/>
RUT/NIE/Pasaporte: <strong class="highlight">${alumno.rut ?? '___'}</strong><br/>
Fecha de nacimiento: <strong class="highlight">${alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento + 'T12:00').toLocaleDateString('es-CL') : '___'}</strong></p>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO</span>: El CENTRO Educacional Alternativo de acompañamiento pedagógico y formativo, no adscrito al sistema escolar formal, se compromete a:</p>
<ol>
<li>Entregar, durante la vigencia del presente Contrato, la atención necesaria para que EL REPRESENTADO goce plenamente del proceso de cuidado y orientación educativa dentro del espacio estipulado por EL CENTRO, colocando énfasis en su desarrollo integral.</li>
<li>Aplicar y velar que se cumplan las normas de convivencia, de acuerdo con los valores y principios de EL CENTRO, contenido en el primer Anexo de este instrumento.</li>
<li>Aplicar y velar por el cumplimiento del reglamento interno de EL CENTRO, y hacer del conocimiento de este al APODERADO.</li>
<li>Brindar apoyo a los representados(as) y/o familias de ellos, a través de sus dependencias cuando así sea solicitado, en lo referente al bienestar del infante y de su entorno familiar.</li>
<li>Proporcionar a los representados, la infraestructura y seguridad necesaria para el cuidado y desarrollo integral, de acuerdo con las planificaciones y experiencias de aprendizaje de EL CENTRO.</li>
<li>Organizar y promover actividades complementarias al cuidado del infante, tendientes a favorecer su crecimiento y desarrollo.</li>
<li>Brindar formación y asesoría espiritual al REPRESENTADO como parte fundamental en su desarrollo, así como brindar asesoría espiritual a la familia, en concordancia con los valores centrales declarados en la organización.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO</span>: El CENTRO presta servicios de educación conforme a las modalidades establecidas para cada nivel o ciclo según corresponda, siendo: ONLINE y PRESENCIAL. Pudiendo ser desarrollada en el siguiente horario: <strong>Lunes, martes y jueves de 08:30 a 16:00 hrs, y miércoles y viernes de 08:30 a 13:40 hrs</strong> (los horarios podrán sufrir ligeras modificaciones por ajustes realizados por Coordinación Académica).</p>
<p><strong>NOTA:</strong> EL CENTRO se guarda el derecho de cambiar la modalidad de estudio de ser necesario (Online y Presencial), dadas las condiciones sanitarias a nivel mundial.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO</span>: El APODERADO se compromete a:</p>
<ol>
<li>Aceptar las líneas de orientación educativa que EL CENTRO desarrolla en el ejercicio de su labor educativa.</li>
<li>Reconocer que los padres y/o apoderados son los primeros formadores de EL REPRESENTADO y que no pueden marginarse del proceso de orientación educativa y desarrollo del mismo.</li>
<li>Sugerir, cuando EL CENTRO lo estime pertinente, la realización de exámenes y/o tratamientos.</li>
<li>Conocer, respetar y apoyar en su totalidad, el conjunto de reglas establecidas en el Reglamento para la Buena Convivencia de EL CENTRO.</li>
<li>Asistir obligatoria y puntualmente a las reuniones, talleres, y asambleas General de Padres y Apoderados.</li>
<li>Colaborar en las tareas educativas, formativas y/o recreativas que EL CENTRO planifique.</li>
<li>Mantener una actitud de respeto hacia nuestro espacio, sus directivos, equipo de tutoría, funcionarios y representados(as).</li>
<li>Responsabilizarse de los gastos de reparación o reposición de materiales dañados por EL REPRESENTADO.</li>
<li>Asumir el compromiso de apoyar a EL REPRESENTADO y a EL CENTRO, mediante el aporte de ideas, opiniones y acciones constructivas.</li>
<li>Cumplir con la provisión de los útiles y materiales de aseo necesarios.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO</span>: EL APODERADO se obliga a efectuar, a favor de EL CENTRO, los <strong>APORTES ECONÓMICOS COMPROMETIDOS</strong> por concepto de la prestación del servicio educacional:</p>
<ol>
<li>Por concepto de <strong>APORTE INICIAL</strong>, el apoderado deberá realizar un aporte equivalente a la suma de <strong class="highlight">$${montoMat.toLocaleString('es-CL')} CLP</strong>. Dicho aporte <strong>no estará afecto a devoluciones bajo ningún concepto</strong>.</li>
<li>El servicio educacional se estructura sobre la base de un <strong>APORTE ANUAL</strong>, el cual se pacta y se distribuye en pagos mensuales durante diez (10) meses, comprendidos entre marzo y diciembre.</li>
<li>Por concepto de <strong>APORTE MENSUAL</strong>, el APODERADO deberá efectuar un aporte equivalente a la suma de <strong class="highlight">$${montoCuota.toLocaleString('es-CL')} CLP</strong>, correspondiente a la modalidad presencial, el cual se entregará durante diez (10) meses, entre marzo y diciembre, debiendo efectuarse la entrega el primer día hábil de cada mes facturado.</li>
<li>Las partes convienen que el APORTE INICIAL y el APORTE ANUAL constituyen una <strong>obligación única e indivisible</strong>, por lo que el retiro del estudiante no exime al apoderado del cumplimiento total.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO</span>: EL APODERADO podrá efectuar la entrega de los APORTES comprometidos mediante una de las siguientes opciones:</p>
<p><strong>OPCIÓN 1:</strong> Entrega anticipada del 100% con un descuento del 5% por entrega al contado durante el proceso de matrícula.</p>
<p><strong>OPCIÓN 2:</strong> Entrega mediante cheques nominativos y cruzados.</p>
<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>NÚMERO DE CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${tablaP}</tbody>
</table>
<p><strong>OPCIÓN 3:</strong> Entrega presencial, por transferencia o depósito bancario.</p>
<p><strong>NOTA 1:</strong> Cualquier atraso generará un interés de un 3% diario a partir del vencimiento.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO</span>: Los aportes efectuados por concepto de APORTE INICIAL y APORTE ANUAL <strong>no serán reembolsables</strong> en caso de retiro del REPRESENTADO.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">VIGÉSIMO</span>: El presente contrato entrará en vigencia a contar de la fecha de su suscripción y tendrá una duración hasta el término del año escolar ${anio}.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">VIGÉSIMO PRIMERO</span>: Para todos los efectos del presente contrato, las partes firmantes fijan su domicilio en la ciudad de Santiago, sometiéndose a la jurisdicción de sus Tribunales Ordinarios de Justicia.</p>
<p>El presente contrato se firma en dos ejemplares, quedando cada uno en poder de las partes.</p>
</div>

<div class="firmas">
<div class="firma">
<div class="firma-line">PATRICIO FERNANDO BURGOS PÉREZ<br/>RUT N° 12.274.490-6<br/>Representante Legal</div>
</div>
<div class="firma">
<div class="firma-line">${familia?.nombre_apoderado ?? '___'} ${familia?.apellido_apoderado ?? '___'}<br/>RUT N° ${familia?.rut ?? 'XX.XXX.XXX-X'}<br/>Apoderado/a</div>
</div>
</div>

<div class="no-print" style="margin-top:40px;text-align:center;">
<button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Imprimir / Guardar PDF</button>
<button onclick="window.close()" style="background:white;color:#1a2332;border:1px solid #e8eaed;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button>
</div>

</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
