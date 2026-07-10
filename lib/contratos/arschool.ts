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
  modalidad: string
  mesesCobro: number
  porcentajeBeca: number
  nombreBeca: string
  tablaAportes: string
}

export function generarContratoARSchool(d: DatosContrato): string {
  const montoInicialFinal = Math.round(d.montoInicial * (1 - d.porcentajeBeca / 100))
  const montoMensualFinal = Math.round(d.montoMensual * (1 - d.porcentajeBeca / 100))

  const clausulaBeca = d.porcentajeBeca > 0 ? `
<li>Al valor del APORTE MENSUAL se aplicó un descuento correspondiente a la <strong>Beca ${d.nombreBeca || 'institucional'}</strong>, equivalente a un <strong>${d.porcentajeBeca}%</strong>. La beca tendrá una duración igual a la del presente contrato, debiendo ser evaluada y renovada de manera anual.</li>
<li>El APODERADO de uno o más REPRESENTADOS beneficiarios del sistema de becas se encuentra sujeto a las mismas obligaciones, responsabilidades y compromisos económicos y contractuales.</li>
` : ''

  return `
${HEADER_FUNDACION}

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCACIONALES</h1>

<p>En Santiago, a ${d.fecha}, se celebra el presente Contrato de Prestación de Servicios Educacionales no adscritos al sistema escolar formal, entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, debidamente representada por <strong>PATRICIO FERNANDO BURGOS PÉREZ</strong>, RUT 12.274.490-6, ambos domiciliados en VICTORIA 52, Comuna de Santiago, Región Metropolitana, Santiago de Chile, que en adelante se denominará "<strong>EL CENTRO</strong>"; y don(ña) <strong class="highlight">${d.nombreApoderado}</strong>, RUT <strong class="highlight">${d.rutApoderado}</strong>, con domicilio en <strong class="highlight">${d.direccionApoderado}</strong>, Comuna de <strong class="highlight">${d.comunaApoderado}</strong>, que en adelante se denominará "<strong>EL APODERADO</strong>", y en conjunto como "<strong>LAS PARTES</strong>", acuerdan lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO</span>: La <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, organización sin fines de lucro legalmente constituida conforme a la Ley N° 20.500 y al Código Civil chileno, es la entidad responsable del programa educativo "<strong>AR SCHOOL GLOBAL</strong>", el cual funciona como Centro Educacional Alternativo de acompañamiento pedagógico y formativo, no adscrito al sistema escolar formal, destinado a niños y niñas de los niveles <strong>Preschool, Elementary School, Middle School y High School</strong>, en adelante "EL CENTRO".</p>
<p>AR SCHOOL GLOBAL desarrolla sus actividades en las siguientes sedes: Victoria 52, Comuna de Santiago; José Manuel Irarrázaval 0565, Comuna de Puente Alto; y Chiloé 862, Comuna de Punta Arenas.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO</span>: El APODERADO ha solicitado a EL CENTRO la matrícula y la prestación de servicios educacionales de <strong>acompañamiento pedagógico y formativo no adscritos al sistema escolar formal</strong>, en la sede ubicada en <strong class="highlight">${d.sede}</strong>, para el año <strong>${d.anio}</strong>, respecto de su(s) representado(a)(s):</p>
<p>Nombre completo: <strong class="highlight">${d.nombreAlumno}</strong><br/>
RUT/NIE/Pasaporte: <strong class="highlight">${d.rutAlumno}</strong><br/>
Fecha de nacimiento: <strong class="highlight">${d.fechaNacimiento}</strong></p>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO</span>: El CENTRO se compromete a:</p>
<ol>
<li>Entregar la atención necesaria para que EL REPRESENTADO goce plenamente del proceso de cuidado y orientación educativa, colocando énfasis en su desarrollo integral.</li>
<li>Aplicar y velar que se cumplan las normas de convivencia.</li>
<li>Aplicar y velar por el cumplimiento del reglamento interno.</li>
<li>Brindar apoyo a los representados(as) y/o familias en lo referente al bienestar del infante.</li>
<li>Proporcionar la infraestructura y seguridad necesaria para el cuidado y desarrollo integral.</li>
<li>Organizar y promover actividades complementarias.</li>
<li>Brindar formación y asesoría espiritual al REPRESENTADO.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO</span>: El CENTRO presta servicios de educación conforme a las modalidades: <strong>ONLINE y PRESENCIAL</strong>. Horario: <strong>Lunes, martes y jueves de 08:30 a 16:00 hrs, y miércoles y viernes de 08:30 a 13:40 hrs</strong> (los horarios podrán sufrir ligeras modificaciones por ajustes de Coordinación Académica). Una vez escogida la modalidad, no podrá ser modificada salvo casos excepcionales.</p>
<p><strong>NOTA:</strong> EL CENTRO se guarda el derecho de cambiar la modalidad dadas las condiciones sanitarias a nivel mundial.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO</span>: El APODERADO se compromete a:</p>
<ol>
<li>Aceptar las líneas de orientación educativa de EL CENTRO.</li>
<li>Reconocer que los padres son los primeros formadores, debiendo participar activamente.</li>
<li>Sugerir, cuando EL CENTRO lo estime, la realización de exámenes y/o tratamientos.</li>
<li>Conocer, respetar y apoyar el Reglamento para la Buena Convivencia.</li>
<li>Asistir obligatoria y puntualmente a reuniones, talleres y asambleas (podrán ser grabadas).</li>
<li>Colaborar en las tareas educativas, formativas y/o recreativas.</li>
<li>Mantener una actitud de respeto hacia el espacio, directivos y equipo de tutoría.</li>
<li>Responsabilizarse de los gastos de reparación o reposición de materiales dañados.</li>
<li>Asumir el compromiso de apoyar mediante ideas, opiniones y acciones constructivas.</li>
<li>Cumplir con la provisión de útiles y materiales de aseo.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO</span>: EL APODERADO se obliga a efectuar los <strong>APORTES ECONÓMICOS COMPROMETIDOS</strong>:</p>
<ol>
<li>Por concepto de <strong>APORTE INICIAL</strong>, la suma de <strong class="highlight">$${montoInicialFinal.toLocaleString('es-CL')} CLP</strong>. Dicho aporte <strong>no estará afecto a devoluciones bajo ningún concepto</strong>. El retiro deberá comunicarse por escrito a adm@arschoolglobal.com.</li>
<li>El servicio se estructura sobre un <strong>APORTE ANUAL</strong> distribuido en pagos mensuales durante <strong>${d.mesesCobro}</strong> meses. En caso de retiro anticipado, será <strong>obligación del apoderado dar cumplimiento íntegro al APORTE ANUAL</strong>.</li>
<li>Por concepto de <strong>APORTE MENSUAL</strong>, la suma de <strong class="highlight">$${montoMensualFinal.toLocaleString('es-CL')} CLP</strong>, correspondiente a la modalidad <strong>${d.modalidad}</strong>, debiendo efectuarse la entrega el primer día hábil de cada mes.</li>
<li>El APORTE INICIAL y el APORTE ANUAL constituyen una <strong>obligación única e indivisible</strong>.</li>
${clausulaBeca}
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO</span>: EL APODERADO podrá efectuar la entrega de los APORTES mediante:</p>
<p><strong>OPCIÓN 1:</strong> Entrega anticipada del 100% con descuento del 5% por entrega al contado.</p>
<p><strong>OPCIÓN 2:</strong> Entrega mediante cheques nominativos y cruzados o pagarés:</p>
<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>N° CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>
<p><strong>OPCIÓN 3:</strong> Transferencia o depósito bancario. Se firmará un PAGARÉ.</p>
${DATOS_BANCARIOS}
<p><strong>NOTA 1:</strong> Cualquier atraso generará un interés de un 3% diario a partir del vencimiento.</p>
<p><strong>NOTA 2:</strong> Es de suma importancia que el APODERADO cumpla con los compromisos económicos a fin de garantizar el funcionamiento adecuado de EL CENTRO.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO</span>: Los aportes efectuados <strong>no serán reembolsables</strong> en caso de retiro del REPRESENTADO, con independencia del momento en que dicho retiro se produzca.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO</span>: Como requisito indispensable, el APODERADO deberá entregar la totalidad de los documentos solicitados dentro de <strong>tres (3) días hábiles</strong> desde la firma del Contrato. El incumplimiento facultará a EL CENTRO para <strong>suspender temporalmente</strong> la prestación del servicio.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO SEGUNDO</span>: <strong>HOME LIFE ACADEMY</strong> es la institución norteamericana encargada de validar los estudios cursados en EL CENTRO. Es responsabilidad exclusiva del apoderado tramitar la validación (aproximadamente US$320 para alumnos de 4° Medio). La familia deberá informar a EL CENTRO entre el 1 de enero y el 15 de marzo del ${d.anio} su interés en iniciar el trámite.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO TERCERO</span>: El <strong>Ministerio de Educación (MINEDUC)</strong> podría validar los estudios mediante exámenes libres. La gestión, postulación y rendición es de <strong>responsabilidad absoluta y exclusiva del apoderado</strong>. AR School no participa ni asume responsabilidad alguna en este proceso.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO CUARTO</span>: EL CENTRO, como centro educacional alternativo no adscrito al sistema escolar formal, se encuentra exceptuado de los beneficios, programas y subvenciones del Ministerio de Educación.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO QUINTO</span>: EL CENTRO <strong>no cuenta con el beneficio del Seguro Escolar estatal</strong>. Cada familia es responsable de contratar seguros o convenios escolares en instituciones privadas.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO OCTAVO</span>: El APODERADO autoriza a EL CENTRO a hacer uso de datos personales y a <strong>registrar imágenes, audios y/o material audiovisual</strong> de las experiencias, para difusión en la página web institucional, redes sociales y otros espacios de promoción.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">VIGÉSIMO</span>: El presente contrato entrará en vigencia a contar de la fecha de su suscripción y tendrá una duración hasta el término del año escolar ${d.anio}. Su renovación requerirá del acuerdo mutuo mediante un nuevo contrato.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">VIGÉSIMO PRIMERO</span>: Las partes firmantes fijan su domicilio en <strong class="highlight">${d.direccionApoderado}, ${d.comunaApoderado}</strong>, la ciudad de Santiago, sometiéndose a la jurisdicción de sus Tribunales Ordinarios de Justicia.</p>
<p>El presente contrato se firma en dos ejemplares, quedando cada uno en poder de las partes.</p>
</div>

${FOOTER_SEDES}
`
}
