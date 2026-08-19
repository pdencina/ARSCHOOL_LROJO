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
  horario: string // "Martes y Jueves 16:00-17:30"
  sede: string
  anio: number
  montoInicial: number
  montoMensual: number
  mesesCobro: number
  tablaAportes: string
}

export function generarContratoLions(d: DatosContratoLions): string {
  return `
${HEADER_FUNDACION}

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS — LIONS SOCCER SCHOOL</h1>

<p>En Santiago, a ${d.fecha}, se celebra el presente Contrato de Prestación de Servicios Deportivos entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, a través de su programa <strong>LIONS SOCCER SCHOOL</strong>, representada por <strong>PATRICIO FERNANDO BURGOS PÉREZ</strong>, RUT 12.274.490-6, en adelante "LA ESCUELA", y don/doña <strong class="highlight">${d.nombreApoderado}</strong>, RUT <strong class="highlight">${d.rutApoderado}</strong>, domiciliado/a en <strong class="highlight">${d.direccionApoderado}, ${d.comunaApoderado}</strong>, en adelante "EL APODERADO", quienes convienen lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO: OBJETO DEL CONTRATO</span></p>
<p>LA ESCUELA se compromete a prestar servicios deportivos de formación en fútbol al alumno/a <strong class="highlight">${d.nombreAlumno}</strong>, RUT <strong class="highlight">${d.rutAlumno}</strong>, nacido/a el <strong class="highlight">${d.fechaNacimiento}</strong>, en la categoría <strong class="highlight">${d.categoria}</strong>, conforme al programa de entrenamiento de Lions Soccer School.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO: HORARIO Y LUGAR</span></p>
<p>Las sesiones de entrenamiento se realizarán según el siguiente horario: <strong class="highlight">${d.horario || 'Por confirmar según categoría'}</strong>.</p>
<p>El lugar de entrenamiento será definido por LA ESCUELA y comunicado oportunamente. LA ESCUELA se reserva el derecho de modificar horarios y canchas por razones climáticas o de fuerza mayor.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO: OBLIGACIONES DE LA ESCUELA</span></p>
<ol>
<li>Proporcionar entrenamiento deportivo de calidad, a cargo de profesores certificados.</li>
<li>Velar por la seguridad e integridad física del alumno durante las sesiones.</li>
<li>Informar oportunamente sobre cambios de horario, canchas o suspensiones.</li>
<li>Realizar evaluaciones periódicas del progreso deportivo del alumno.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO: OBLIGACIONES DEL APODERADO</span></p>
<ol>
<li>Pagar oportunamente los aportes mensuales según lo establecido en la cláusula SEXTA.</li>
<li>Entregar el certificado médico que acredite aptitud para la actividad deportiva.</li>
<li>Informar sobre condiciones de salud relevantes del alumno.</li>
<li>Asegurar la asistencia regular del alumno a las sesiones de entrenamiento.</li>
<li>Proveer implementos personales básicos (canilleras, botines, hidratación).</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO: PERÍODO DE VIGENCIA</span></p>
<p>El presente contrato tiene vigencia desde la fecha de firma hasta el 31 de diciembre de ${d.anio}, renovándose automáticamente por períodos iguales salvo que alguna de las partes manifieste su intención de no renovar con al menos 30 días de anticipación.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO: APORTES</span></p>
<p>EL APODERADO se compromete a entregar los siguientes aportes a LA ESCUELA:</p>
${d.montoInicial > 0 ? `<p><strong>Aporte de inscripción:</strong> $${d.montoInicial.toLocaleString('es-CL')} CLP (pago único)</p>` : ''}
<p><strong>Aporte mensual:</strong> $${d.montoMensual.toLocaleString('es-CL')} CLP, pagadero dentro de los primeros 5 días de cada mes, durante ${d.mesesCobro} meses.</p>

<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>N° CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>

${DATOS_BANCARIOS}
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO: SUSPENSIÓN Y TÉRMINO</span></p>
<ol>
<li>LA ESCUELA podrá suspender la participación del alumno en caso de mora de 2 o más mensualidades.</li>
<li>EL APODERADO podrá dar término al contrato con 30 días de anticipación, sin derecho a devolución de aportes ya pagados.</li>
<li>La expulsión por conducta incompatible con los valores de la escuela no dará derecho a reembolso.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO: RESPONSABILIDAD</span></p>
<p>LA ESCUELA tomará todas las precauciones razonables para la seguridad del alumno durante las actividades. No obstante, el deporte implica riesgos inherentes. EL APODERADO declara conocer y aceptar dichos riesgos, y autoriza al alumno a participar en entrenamientos y competencias.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">NOVENO: USO DE IMAGEN</span></p>
<p>EL APODERADO autoriza a LA ESCUELA a utilizar fotografías y videos del alumno durante entrenamientos y competencias con fines promocionales e informativos de Lions Soccer School.</p>
</div>

${FOOTER_SEDES}
`
}
