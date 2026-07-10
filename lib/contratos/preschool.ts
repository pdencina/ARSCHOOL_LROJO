import { HEADER_FUNDACION, DATOS_BANCARIOS, FOOTER_SEDES } from './estilos'

interface DatosContrato {
  fecha: string
  nombreApoderado: string
  rutApoderado: string
  direccionApoderado: string
  comunaApoderado: string
  nombreAlumno: string
  rutAlumno: string
  fechaNacimiento: string
  sede: string
  anio: number
  montoInicial: number
  montoMensual: number
  jornada: string
  mesesCobro: number
  porcentajeBeca: number
  nombreBeca: string
  tablaAportes: string
}

export function generarContratoPreschool(d: DatosContrato): string {
  const montoInicialFinal = Math.round(d.montoInicial * (1 - d.porcentajeBeca / 100))
  const montoMensualFinal = Math.round(d.montoMensual * (1 - d.porcentajeBeca / 100))

  const jornadaTexto = d.jornada === 'completa'
    ? `<strong>Jornada Completa:</strong> la suma de <strong>$${montoMensualFinal.toLocaleString('es-CL')} CLP</strong>, con horario de lunes a jueves de 08:00 a 18:00 horas y los días viernes con término de jornada a las 17:00 horas.`
    : d.jornada === 'am'
      ? `<strong>Media Jornada Mañana (AM):</strong> la suma de <strong>$${montoMensualFinal.toLocaleString('es-CL')} CLP</strong>, con horario de lunes a viernes de 08:00 a 13:00 horas.`
      : `<strong>Media Jornada Tarde (PM):</strong> la suma de <strong>$${montoMensualFinal.toLocaleString('es-CL')} CLP</strong>, con horario de lunes a jueves de 13:00 a 18:00 horas, y los días viernes con término de jornada a las 17:00 horas.`

  const clausulaBeca = d.porcentajeBeca > 0 ? `
<p><strong>3. BECAS Y DESCUENTOS:</strong></p>
<p>Al valor del APORTE MENSUAL se aplicó un descuento correspondiente a la <strong>Beca ${d.nombreBeca || 'institucional'}</strong>, equivalente a un <strong>${d.porcentajeBeca}%</strong>.</p>
<p>La beca tendrá una duración igual a la del presente contrato, debiendo ser evaluada y, en caso de continuidad, renovada de manera anual mediante nueva postulación y revisión por parte de EL CENTRO en los plazos establecidos.</p>
` : ''

  return `
${HEADER_FUNDACION}

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCACIONALES</h1>

<p>En Santiago, a ${d.fecha}, se celebra el presente Contrato de Prestación de Servicios Educacionales no adscritos al sistema escolar formal, entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, debidamente representada por <strong>PATRICIO FERNANDO BURGOS PÉREZ</strong>, RUT 12.274.490-6, ambos domiciliados en VICTORIA 52, Comuna de Santiago, Región Metropolitana, Santiago de Chile, que en adelante se denominará "<strong>EL CENTRO</strong>"; y don(ña) <strong class="highlight">${d.nombreApoderado}</strong>, RUT <strong class="highlight">${d.rutApoderado}</strong>, con domicilio en <strong class="highlight">${d.direccionApoderado}</strong>, Comuna de <strong class="highlight">${d.comunaApoderado}</strong>, que en adelante se denominará "<strong>EL APODERADO</strong>", y en conjunto como "<strong>LAS PARTES</strong>", acuerdan lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO</span>: La <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, organización sin fines de lucro legalmente constituida conforme a la Ley N° 20.500 y al Código Civil chileno, es la entidad responsable del programa educativo "<strong>AR SCHOOL GLOBAL</strong>", el cual funciona como <strong>Centro Educacional Alternativo de acompañamiento pedagógico y formativo no adscritos al sistema escolar formal</strong>, destinado a niños y niñas en etapa Preschool, en adelante "EL CENTRO".</p>
<p>AR SCHOOL GLOBAL desarrolla sus actividades en las siguientes sedes: Victoria 52, Comuna de Santiago; José Manuel Irarrázaval 0565, Comuna de Puente Alto; y Chiloé 862, Comuna de Punta Arenas.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO</span>: Para todos los efectos de este contrato, se entiende por APODERADO a la persona que, como responsable del(los) hijo(s), suscribe el presente instrumento, quien asume la totalidad de las obligaciones, deberes y compromisos que en él se consignan.</p>
<p>El APODERADO ha solicitado a EL CENTRO, quien acepta, la matrícula y la prestación de servicios educacionales de <strong>acompañamiento pedagógico y formativo, no adscritos al sistema escolar formal</strong>, en la sede ubicada en <strong class="highlight">${d.sede}</strong>, para el año <strong>${d.anio}</strong>, respecto de su(s) representado(a)(s) que se individualizan a continuación, en adelante "EL REPRESENTADO":</p>
<p>Nombre completo: <strong class="highlight">${d.nombreAlumno}</strong><br/>
RUT/DNI/Pasaporte: <strong class="highlight">${d.rutAlumno}</strong><br/>
Fecha de nacimiento: <strong class="highlight">${d.fechaNacimiento}</strong></p>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO</span>: EL CENTRO prestará sus servicios educacionales de acompañamiento pedagógico y formativo, no adscritos al sistema escolar formal, conforme a las siguientes jornadas:</p>
<p><strong>Lunes a jueves:</strong> Jornada Completa: de 08:00 a 18:00 horas. Jornada Media Mañana: de 08:00 a 13:00 horas. Jornada Media Tarde: de 13:00 a 18:00 horas.</p>
<p><strong>Viernes:</strong> Finalización de la jornada a las 17:00 horas para todas las modalidades horarias.</p>
<p>El APODERADO será responsable de entregar y retirar a EL REPRESENTADO dentro del horario correspondiente a la jornada contratada.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO</span>: EL CENTRO como entidad destinada al cuidado del infante, se compromete a:</p>
<ol>
<li>Entregar la atención necesaria para que EL REPRESENTADO goce plenamente del proceso de cuidado y orientación educativa, colocando énfasis en su desarrollo integral.</li>
<li>Aplicar y velar que se cumplan las normas de convivencia, de acuerdo con los valores y principios de EL CENTRO.</li>
<li>Aplicar y velar por el cumplimiento del reglamento interno de EL CENTRO.</li>
<li>Brindar apoyo a los representados(as) y/o familias en lo referente al bienestar del infante y de su entorno familiar.</li>
<li>Proporcionar la infraestructura y seguridad necesaria para el cuidado y desarrollo integral.</li>
<li>Organizar y promover actividades complementarias al cuidado del infante.</li>
<li>Brindar formación y asesoría espiritual al REPRESENTADO como parte fundamental en su desarrollo.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO</span>: EL CENTRO se guarda el derecho de cambiar la modalidad de prestación de servicios (Online, Semipresencial, Presencial) debido a las condiciones dadas a nivel mundial.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO</span>: El APODERADO se obliga a:</p>
<ol>
<li>Aceptar las líneas de orientación educativa que EL CENTRO desarrolla.</li>
<li>Reconocer que los padres son los primeros formadores de EL REPRESENTADO.</li>
<li>Sugerir, cuando EL CENTRO lo estime pertinente, la realización de exámenes y/o tratamientos.</li>
<li>Conocer, respetar y apoyar el Reglamento para la Buena Convivencia de EL CENTRO.</li>
<li>Asistir obligatoria y puntualmente a las reuniones, talleres y asambleas.</li>
<li>Colaborar en las tareas educativas, formativas y/o recreativas.</li>
<li>Mantener una actitud de respeto hacia el espacio, directivos, equipo de tutoría y representados(as).</li>
<li>Responsabilizarse de los gastos de reparación o reposición de materiales dañados.</li>
<li>Asumir el compromiso de apoyar mediante ideas, opiniones y acciones constructivas.</li>
<li>Cumplir con la provisión de útiles y materiales de aseo.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO</span>: EL APODERADO se obliga a efectuar, a favor de EL CENTRO, los <strong>APORTES ECONÓMICOS COMPROMETIDOS</strong>:</p>
<p><strong>1. APORTE INICIAL:</strong></p>
<p>El APODERADO se obliga a efectuar la suma de <strong class="highlight">$${montoInicialFinal.toLocaleString('es-CL')} CLP</strong>, de carácter anual o por el correspondiente ciclo de vigencia del presente contrato. Dicho aporte <strong>no estará afecto a devoluciones bajo ningún concepto</strong>.</p>
<p><strong>2. APORTE MENSUAL:</strong></p>
<p>${jornadaTexto}</p>
<p>El APORTE MENSUAL deberá efectuarse el primer día hábil de cada mes.</p>
${clausulaBeca}
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO</span>: EL APODERADO podrá efectuar la entrega de los APORTES mediante:</p>
<p><strong>OPCIÓN 1:</strong> Entrega anticipada del 100% con un descuento del 5% por entrega al contado.</p>
<p><strong>OPCIÓN 2:</strong> Entrega mediante cheques nominativos y cruzados o pagarés:</p>
<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>N° CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>
<p><strong>OPCIÓN 3:</strong> Transferencia o depósito bancario. Se firmará un PAGARÉ.</p>
${DATOS_BANCARIOS}
<p><strong>NOTA 1:</strong> Cualquier atraso generará un interés de un 3% diario a partir del vencimiento.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">NOVENO</span>: Las sumas entregadas por concepto APORTE INICIAL y APORTE MENSUAL <strong>no serán devueltas</strong> en caso de retiro o anulación de la solicitud.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO SÉPTIMO</span>: El presente contrato se renovará <strong>automática y sucesivamente</strong> por períodos iguales de doce (12) meses, salvo que cualquiera de las partes manifieste su voluntad de no renovarlo.</p>
<p>El retiro de EL REPRESENTADO deberá ser comunicado por escrito a adm@arschoolglobal.com, con una anticipación mínima de <strong>sesenta (60) días corridos</strong>.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO OCTAVO</span>: Para todos los efectos del presente contrato, las partes firmantes fijan su domicilio en <strong class="highlight">${d.direccionApoderado}, ${d.comunaApoderado}</strong>, la ciudad de Santiago, sometiéndose a la jurisdicción de sus Tribunales Ordinarios de Justicia.</p>
<p>El presente contrato se firma en dos ejemplares, quedando cada uno en poder de las partes.</p>
</div>

${FOOTER_SEDES}
`
}
