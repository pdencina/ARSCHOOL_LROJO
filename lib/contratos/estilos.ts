// Estilos compartidos para todos los documentos legales
export const ESTILOS_CONTRATO = `
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
.firmas-section { margin-top: 80px; page-break-inside: avoid; }
.firmas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
.firma-box { text-align: center; }
.firma-espacio { height: 100px; display: flex; align-items: flex-end; justify-content: center; }
.firma-img { max-height: 90px; max-width: 200px; object-fit: contain; }
.firma-linea { border-top: 1.5px solid #1a2332; margin-top: 8px; margin-bottom: 10px; width: 100%; }
.firma-nombre { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 2px; }
.firma-detalle { font-size: 11px; color: #4b5563; margin-bottom: 2px; }
.firma-rol { font-size: 11px; color: #6b7280; }
.firma-timestamp { font-size: 10px; color: #9ca3af; margin-top: 6px; font-style: italic; }
.datos-bancarios { background:#f8f9fb;border-radius:8px;padding:12px 16px;margin:12px 0; }
.datos-bancarios p { margin:0;font-size:12px;line-height:1.6; }
.datos-bancarios .titulo { margin:0 0 4px;font-weight:bold;font-size:12px; }
.footer-sedes { margin-top: 60px; text-align: center; font-size: 10px; color: #6b7280; border-top: 1px solid #e8eaed; padding-top: 16px; }
.no-print { text-align: center; margin-top: 40px; }
@media print { .no-print { display: none; } body { padding: 40px 50px; } }
`

export const HEADER_FUNDACION = `
<div class="header">
<h2>FUNDACIÓN</h2>
<h3>arm global</h3>
</div>`

export const FOOTER_SEDES = `
<div class="footer-sedes">
<strong>Sede Santiago:</strong> Victoria 52, Santiago, Chile<br/>
<strong>Sede Puente Alto:</strong> Av. José Manuel Irarrázaval 0565, Puente Alto, Santiago, Chile.<br/>
<strong>Sede Punta Arenas:</strong> Chiloé 862, Punta Arenas, Chile.<br/>
e-mail: contacto@arschoolglobal.com · www.arschoolglobal.com
</div>`

export const DATOS_BANCARIOS = `
<div class="datos-bancarios">
<p class="titulo">Datos bancarios para transferencia:</p>
<p>
Nombre: Fundación Educacional AR Ministries<br/>
RUT: 65.168.392-0<br/>
Banco: BancoEstado · Cuenta Corriente N° 291-0-008051-4<br/>
Correo: adm@arschoolglobal.com
</p>
</div>`

export function botonImprimir(fecha: string) {
  return `
<div class="no-print" style="margin-top:50px;text-align:center;padding:20px 0;border-top:1px solid #e8eaed;">
<p style="font-size:11px;color:#9ca3af;margin-bottom:12px;">Documento generado por AR School Global · ${fecha}</p>
<button onclick="window.print()" style="background:#1B3A5C;color:white;border:none;padding:12px 36px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
<button onclick="window.close()" style="background:white;color:#1B3A5C;border:1.5px solid #e8eaed;padding:12px 36px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:10px;">Cerrar</button>
</div>`
}

export function seccionFirmas(firmaApoderado: string | null, firmadoAt: string | null, nombreApoderado: string, rutApoderado: string) {
  return `
<div class="firmas-section">
<div class="firmas-grid">
<div class="firma-box">
<div class="firma-espacio"></div>
<div class="firma-linea"></div>
<div class="firma-nombre">PATRICIO FERNANDO BURGOS PÉREZ</div>
<div class="firma-detalle">RUT N° 12.274.490-6</div>
<div class="firma-rol">Representante Legal<br/>Fundación Educacional AR Ministries</div>
</div>
<div class="firma-box">
<div class="firma-espacio">
${firmaApoderado ? `<img src="${firmaApoderado}" class="firma-img" alt="Firma del apoderado"/>` : ''}
</div>
<div class="firma-linea"></div>
<div class="firma-nombre">${nombreApoderado}</div>
<div class="firma-detalle">RUT N° ${rutApoderado}</div>
<div class="firma-rol">Apoderado/a</div>
${firmadoAt ? `<div class="firma-timestamp">Firmado digitalmente el ${firmadoAt}</div>` : ''}
</div>
</div>
</div>`
}
