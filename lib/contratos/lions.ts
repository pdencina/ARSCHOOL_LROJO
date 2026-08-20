import { HEADER_FUNDACION, DATOS_BANCARIOS, FOOTER_SEDES } from './estilos'

interface DatosContratoLions {
  fecha: string
  nombreApoderado: string
  rutApoderado: string
  direccionApoderado: string
  comunaApoderado: string
  nombreAlumno: string
  rutAlumno: string
  fechaNacimiento: string
  categoria: string // Sub-8, Sub-12, etc.
  horario: string
  sede: string
  anio: number
  montoInicial: number
  montoMensual: number
  mesesCobro: number
  tablaAportes: string
  porcentajeBeca?: number
}

export function generarContratoLions(d: DatosContratoLions): string {
  const montoInicialTexto = d.montoInicial > 0
    ? `cuarenta y cinco mil pesos chilenos ($${d.montoInicial.toLocaleString('es-CL')} CLP)`
    : `cero pesos chilenos ($0 CLP)`
  const montoMensualTexto = `cuarenta mil pesos chilenos ($${d.montoMensual.toLocaleString('es-CL')} CLP)`

  return `
${HEADER_FUNDACION}

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>

<p>En Santiago el ${d.fecha} se celebra el siguiente Contrato de Prestación de Servicios, entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, debidamente representada por <strong>PATRICIO FERNANDO BURGOS PEREZ</strong>, RUT Nº 12.274.490-6, ambos domiciliados en Victoria 52, Comuna de Santiago, Ciudad Santiago, RM de Chile que en adelante se denominará <strong>"EL ESTABLECIMIENTO"</strong>; y don(ña) <strong class="highlight">${d.nombreApoderado}</strong>, RUT Nº <strong class="highlight">${d.rutApoderado}</strong>, con domicilio en <strong class="highlight">${d.direccionApoderado}</strong> Comuna de <strong class="highlight">${d.comunaApoderado}</strong>, que en adelante se denominará <strong>"APODERADO"</strong>, y en conjunto como <strong>"LAS PARTES"</strong>, acuerdan lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO:</span> La Fundación Educacional AR Ministries, se encuentra reconocida oficialmente como tal y es sostenedora del Establecimiento denominado <strong>"LIONS SOCCER SCHOOL"</strong>.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO:</span> Para todos los efectos de este contrato, se entiende por APODERADO a la persona que, como responsable del(los) hijo(s), suscribe el presente instrumento, quien asume la totalidad de las obligaciones, deberes y compromisos que en él se consignan.</p>
<p>El APODERADO ha solicitado al ESTABLECIMIENTO, inscribir y prestar servicios para el año ${d.anio}, en calidad de alumno(s) "EL ALUMNO":</p>
<table>
<tbody>
<tr><td><strong>Nombre completo:</strong></td><td class="highlight">${d.nombreAlumno}</td></tr>
<tr><td><strong>RUT/NIE/Pasaporte:</strong></td><td class="highlight">${d.rutAlumno}</td></tr>
<tr><td><strong>Fecha de nacimiento:</strong></td><td class="highlight">${d.fechaNacimiento}</td></tr>
<tr><td><strong>Categoría:</strong></td><td class="highlight">${d.categoria}</td></tr>
</tbody>
</table>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO:</span> El ESTABLECIMIENTO como entidad formativa, se compromete a:</p>
<ol>
<li>Entregar, durante la vigencia del presente Contrato, la atención necesaria para que los niños y niñas desarrollen habilidades y aprendizaje, colocando énfasis en su formación deportiva.</li>
<li>Aplicar y velar que se cumplan las normas de convivencia, de acuerdo con los valores y principios del ESTABLECIMIENTO.</li>
<li>Proporcionar a los niños y niñas, la infraestructura necesaria de las canchas para que logren desarrollar las habilidades, competencias y capacidades, que se establecen, de acuerdo con el proyecto de la Escuela de Fútbol.</li>
<li>Brindar formación y capacitación a los niños y niñas como parte fundamental en su proceso formativo, así como brindar asesoría espiritual a la familia, en concordancia con los valores centrales declarados en la organización.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO:</span> LIONS SOCCER SCHOOL presta servicios los días martes y sábados, (los horarios podrán sufrir ligeras modificaciones por ajustes realizados por Coordinación, los cuales serán informados oportunamente a los apoderados). La actividad se llevará a cabo en canchas dentro de la comuna de Santiago Centro, en caso de sufrir ligeras modificaciones de ubicación, les será notificado a los apoderados.</p>
${d.horario ? `<p><strong>Horario asignado:</strong> <span class="highlight">${d.horario}</span></p>` : ''}
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO:</span> EL APODERADO se compromete a realizar un aporte mensual al ESTABLECIMIENTO por la prestación de los servicios de la Escuela de Fútbol.</p>
<ol>
<li>Por concepto de matrícula, la suma de ${montoInicialTexto}, que se pagarán en la forma y plazo establecidos por el ESTABLECIMIENTO.</li>
<li>Por concepto de aporte mensual, el monto de ${montoMensualTexto} durante ${d.mesesCobro} meses (enero ${d.anio} a enero ${d.anio + 1}) pagándose el 1° día hábil de cada mes facturado. Las partes contratantes convienen que el pago mensual antes referido constituye una obligación única e indivisible.</li>
</ol>

<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>N° CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>

${DATOS_BANCARIOS}
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO:</span> EL APODERADO podrá hacer el aporte presencial en las oficinas de finanzas del establecimiento, por transferencia o depósito bancario.</p>
<p><strong>NOTA:</strong> Es de suma importancia que el APODERADO cumpla con los compromisos económicos asumidos en el presente contrato con la FUNDACIÓN a fin de garantizar el funcionamiento adecuado de LIONS SOCCER SCHOOL.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO:</span> El Apoderado autoriza que la Escuela de Fútbol y el Establecimiento hagan uso de datos personales propios o de los menores a su cargo, en virtud de la Ley 19.628, para fines educacionales o sociales. El Apoderado, en uso de sus facultades legales, autoriza que el ESTABLECIMIENTO o sus dependientes puedan registrar imágenes del desempeño de los niños y niñas, en situaciones propias de la Escuela, para ser difundidas en la página web, internet, medios de comunicación audiovisuales u otros espacios de promoción de los valores o actividades de la Escuela. Los derechos de autor de los datos o información, en cualquier soporte, que se generen en el Establecimiento.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO:</span> El presente contrato se renovará automática y sucesivamente por períodos iguales de doce (12) meses, en las mismas condiciones pactadas, salvo que cualquiera de las partes manifieste su voluntad de no renovarlo, con una anticipación mínima de sesenta (60) días corridos al vencimiento del período contractual vigente e informando por escrito a contacto@lionssoccerschool.com.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">NOVENO:</span> Para todos los efectos del presente contrato, las partes firmantes fijan su domicilio en <strong class="highlight">${d.direccionApoderado}, ${d.comunaApoderado}</strong>, en la comuna de Santiago, sometiéndose a la jurisdicción de sus Tribunales Ordinarios de Justicia.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO:</span> El presente contrato se firma en dos ejemplares, quedando cada uno en poder de las partes.</p>
</div>

${FOOTER_SEDES}
`
}
