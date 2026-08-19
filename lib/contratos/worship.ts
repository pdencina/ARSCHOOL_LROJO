import { HEADER_FUNDACION, DATOS_BANCARIOS, FOOTER_SEDES } from './estilos'

interface DatosContratoWorship {
  fecha: string
  nombreApoderado: string
  rutApoderado: string
  direccionApoderado: string
  comunaApoderado: string
  nombreAlumno: string
  rutAlumno: string
  fechaNacimiento: string
  instrumento: string
  ciclo: string // "Ciclo 1", "Ciclo 2"
  horario: string
  sede: string
  anio: number
  montoInicial: number
  montoMensual: number
  mesesCobro: number
  tablaAportes: string
}

export function generarContratoWorship(d: DatosContratoWorship): string {
  return `
${HEADER_FUNDACION}

<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS — AR WORSHIP SCHOOL</h1>

<p>En Santiago, a ${d.fecha}, se celebra el presente Contrato de Prestación de Servicios de Formación Musical entre la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, a través de su programa <strong>AR WORSHIP SCHOOL</strong>, representada por <strong>PATRICIO FERNANDO BURGOS PÉREZ</strong>, RUT 12.274.490-6, en adelante "LA ESCUELA", y don/doña <strong class="highlight">${d.nombreApoderado}</strong>, RUT <strong class="highlight">${d.rutApoderado}</strong>, domiciliado/a en <strong class="highlight">${d.direccionApoderado}, ${d.comunaApoderado}</strong>, en adelante "EL ALUMNO/APODERADO", quienes convienen lo siguiente:</p>

<div class="clausula">
<p><span class="clausula-title">PRIMERO: OBJETO DEL CONTRATO</span></p>
<p>LA ESCUELA se compromete a prestar servicios de formación musical al alumno/a <strong class="highlight">${d.nombreAlumno}</strong>, RUT <strong class="highlight">${d.rutAlumno}</strong>, nacido/a el <strong class="highlight">${d.fechaNacimiento}</strong>, en el instrumento <strong class="highlight">${d.instrumento}</strong>, dentro del <strong class="highlight">${d.ciclo}</strong> del plan de estudios de AR Worship School.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SEGUNDO: PROGRAMA Y PLAN DE ESTUDIOS</span></p>
<p>El programa AR Worship School se organiza en 2 ciclos de 2 semestres cada uno (4 semestres totales), con las siguientes áreas de formación por semestre:</p>
<ol>
<li><strong>Instrumento</strong> — Clases prácticas del instrumento elegido</li>
<li><strong>Teoría Musical</strong> — Fundamentos de lectura, armonía y composición</li>
<li><strong>Ministerial</strong> — Formación en liderazgo de adoración y servicio</li>
<li><strong>Ensamble</strong> — Práctica grupal e integración musical (desde semestre 2)</li>
</ol>
<p>Adicionalmente, el alumno tendrá acceso a:</p>
<ul>
<li>Masterclass con músicos invitados</li>
<li>Plataforma online de recursos y materiales</li>
<li>Clases ministeriales complementarias</li>
</ul>
</div>

<div class="clausula">
<p><span class="clausula-title">TERCERO: HORARIO Y LUGAR</span></p>
<p>Las clases se realizarán según el siguiente horario:</p>
<ul>
<li><strong>Ciclo 1:</strong> Sábados de 09:30 a 10:50 hrs.</li>
<li><strong>Ciclo 2:</strong> Sábados de 11:20 a 12:40 hrs.</li>
</ul>
<p>El alumno asistirá en el horario correspondiente a su ciclo: <strong class="highlight">${d.horario || 'Según ciclo asignado'}</strong>.</p>
<p>El lugar de clases será en la sede <strong class="highlight">${d.sede}</strong>. LA ESCUELA se reserva el derecho de modificar horarios por razones de fuerza mayor, comunicando con anticipación.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">CUARTO: OBLIGACIONES DE LA ESCUELA</span></p>
<ol>
<li>Proporcionar enseñanza musical de calidad a cargo de profesores capacitados.</li>
<li>Facilitar los instrumentos y equipos necesarios durante las clases (excepto instrumentos personales).</li>
<li>Realizar evaluaciones semestrales de progreso.</li>
<li>Otorgar certificado de completación al finalizar cada ciclo.</li>
<li>Proveer acceso a la plataforma online de recursos.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">QUINTO: OBLIGACIONES DEL ALUMNO/APODERADO</span></p>
<ol>
<li>Asistir regularmente a las clases programadas.</li>
<li>Pagar oportunamente los aportes según la cláusula SÉPTIMA.</li>
<li>Mantener un comportamiento respetuoso con profesores y compañeros.</li>
<li>Dedicar tiempo de práctica personal fuera de las clases.</li>
<li>Informar con anticipación sobre inasistencias.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">SEXTO: PERÍODO DE VIGENCIA</span></p>
<p>El presente contrato tiene vigencia por un período de <strong>1 año académico</strong> (2 semestres), desde la fecha de firma hasta completar el ciclo correspondiente. La renovación para el siguiente ciclo será voluntaria.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">SÉPTIMO: APORTES</span></p>
<p>EL ALUMNO/APODERADO se compromete a entregar los siguientes aportes:</p>
${d.montoInicial > 0 ? `<p><strong>Aporte inicial (inscripción):</strong> $${d.montoInicial.toLocaleString('es-CL')} CLP — pago único anual.</p>` : ''}
<p><strong>Aporte anual:</strong> $${(d.montoMensual * d.mesesCobro).toLocaleString('es-CL')} CLP, dividido en ${d.mesesCobro} cuotas de $${d.montoMensual.toLocaleString('es-CL')} CLP cada una.</p>

<table>
<thead><tr><th>FECHA</th><th>MONTO</th><th>N° CHEQUE</th><th>BANCO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>

${DATOS_BANCARIOS}
</div>

<div class="clausula">
<p><span class="clausula-title">OCTAVO: BENEFICIOS FAMILIA</span></p>
<p>En caso de inscribir a un segundo hermano/a:</p>
<ul>
<li>2×1 en matrícula (inscripción del segundo es gratuita)</li>
<li>50% de descuento en el aporte anual del segundo alumno</li>
</ul>
<p>Estos beneficios se aplican previa verificación del parentesco.</p>
</div>

<div class="clausula">
<p><span class="clausula-title">NOVENO: SUSPENSIÓN Y TÉRMINO</span></p>
<ol>
<li>LA ESCUELA podrá suspender la participación en caso de mora de 2 o más cuotas.</li>
<li>EL ALUMNO/APODERADO podrá dar término con 30 días de anticipación, sin devolución de aportes pagados.</li>
<li>La inasistencia por más de 4 clases consecutivas sin justificación se considerará abandono.</li>
</ol>
</div>

<div class="clausula">
<p><span class="clausula-title">DÉCIMO: USO DE IMAGEN</span></p>
<p>EL ALUMNO/APODERADO autoriza a LA ESCUELA a utilizar fotografías y videos de las actividades con fines promocionales e informativos de AR Worship School y la Fundación ARM Global.</p>
</div>

${FOOTER_SEDES}
`
}
