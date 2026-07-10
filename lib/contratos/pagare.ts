import { HEADER_FUNDACION, DATOS_BANCARIOS, FOOTER_SEDES } from './estilos'

interface DatosPagare {
  fecha: string
  nombreApoderado: string
  rutApoderado: string
  direccionApoderado: string
  comunaApoderado: string
  montoAnual: number
  montoMensual: number
  mesesCobro: number
  anio: number
  tablaAportes: string
}

export function generarPagare(d: DatosPagare): string {
  return `
${HEADER_FUNDACION}

<h1>PAGARÉ</h1>

<p>En Santiago, a ${d.fecha}, yo, <strong class="highlight">${d.nombreApoderado}</strong>, RUT <strong class="highlight">${d.rutApoderado}</strong>, con domicilio en <strong class="highlight">${d.direccionApoderado}, comuna de ${d.comunaApoderado}</strong>, me obligo a entregar a la <strong>FUNDACIÓN EDUCACIONAL AR MINISTRIES</strong>, RUT 65.168.392-0, a su orden o a sus cesionarios, la suma de <strong class="highlight">$${d.montoAnual.toLocaleString('es-CL')} CLP</strong>, por concepto de <strong>APORTE ANUAL</strong> económico comprometido, según lo establecido en el <strong>CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCACIONALES</strong> suscrito con EL CENTRO, suma que me comprometo a entregar conforme a las siguientes condiciones:</p>

<div class="clausula">
<p><strong>1.</strong> La entrega de esta obligación la haré mediante transferencia electrónica o depósito para lo cual la Fundación ha implementado la siguiente cuenta:</p>
<table>
<thead><tr><th>FECHA</th><th>MONTO</th></tr></thead>
<tbody>${d.tablaAportes}</tbody>
</table>
${DATOS_BANCARIOS}
<p>O tarjeta de crédito en la siguiente página web: www.arschoolglobal.com, sección "Aporte mensual"; en ${d.mesesCobro} cuotas mensuales, iguales y sucesivas de <strong>$${d.montoMensual.toLocaleString('es-CL')} CLP</strong> con vencimiento cada una de ellas en las fechas que se indican en nuestro contrato.</p>
</div>

<div class="clausula">
<p><strong>2.</strong> Al monto correspondiente al <strong>APORTE ANUAL</strong> se aplicaron los descuentos o beneficios otorgados por EL CENTRO al representante, según lo aprobado en cada caso.</p>
</div>

<div class="clausula">
<p><strong>3.</strong> En caso de mora o simplemente retardo en la entrega de una o cualquiera de los <strong>APORTES MENSUALES</strong> en que se divide la obligación, se devengará un interés penal igual al interés máximo convencional permitido por la ley a la fecha del otorgamiento de este pagaré, para las operaciones de crédito de dinero no reajustables. El interés penal aplicable se calculará sobre el único aporte atrasado, o bien, si se llegara a hacer exigible toda la obligación, sobre la totalidad de la obligación, incluidos los intereses en conformidad al art. 9° de la ley n°18.010.</p>
</div>

<div class="clausula">
<p><strong>4.</strong> Si al 5 de diciembre del ${d.anio + 1} aún hay valores impagos por aportes mensuales vencidos, conforme lo que establece el artículo 4 de la ley n°19.628, faculto expresamente a la Fundación para que mi nombre, monto adeudado, considerando sus intereses y reajustes, sean incluidos en listados que se remitan al boletín comercial o al distribuidor de información de carácter económico, financiero, bancario o comercial, con el propósito de que sea incorporado a mi información o boletín. La autorización puede ser revocada, aunque sin efecto retroactivo, lo que también deberá hacerse por escrito.</p>
</div>

<div class="clausula">
<p><strong>5.</strong> Para todos los efectos del presente pagaré, el deudor fija su domicilio en <strong class="highlight">${d.direccionApoderado}, comuna de ${d.comunaApoderado}</strong>, ciudad de Santiago. Sometiéndose a la competencia de sus tribunales ordinarios.</p>
</div>

<div class="clausula">
<p><strong>6.</strong> Fundación Educacional AR Ministries o el portador quedan liberados de la obligación de protestar el presente pagaré respecto de todos los obligados a su entrega.</p>
</div>

<div class="clausula">
<p><strong>7.</strong> Conforme a lo establecido en el cuadro de anexo de la ley de impuestos de timbres, (d.l. N° 3475), y teniendo la Fundación la calidad de beneficiaria del presente pagaré, éste se encuentra exento del impuesto respectivo.</p>
</div>

<div class="firmas-section" style="margin-top:100px;">
<div style="text-align:center;">
<div style="border-top:1.5px solid #1a2332;width:300px;margin:0 auto;padding-top:10px;">
<div style="font-size:12px;font-weight:bold;text-transform:uppercase;">${d.nombreApoderado}</div>
<div style="font-size:11px;color:#4b5563;">RUT N° ${d.rutApoderado}</div>
</div>
</div>
</div>

${FOOTER_SEDES}
`
}
