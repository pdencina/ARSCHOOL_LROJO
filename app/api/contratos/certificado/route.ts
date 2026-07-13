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

// GET /api/contratos/certificado?matricula_id=xxx&tipo=contrato|pagare
// Genera un certificado HTML imprimible con la evidencia de firma
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const matriculaId = searchParams.get('matricula_id')
  const tipo = searchParams.get('tipo') ?? 'contrato'
  if (!matriculaId) return new NextResponse('matricula_id requerido', { status: 400 })

  const admin = getAdmin()
  const { data: matricula } = await admin
    .from('matriculas')
    .select('*, alumno:alumnos(nombre, apellido, curso, rut)')
    .eq('id', matriculaId)
    .single()

  if (!matricula) return new NextResponse('Matrícula no encontrada', { status: 404 })
  const m = matricula as any

  const auditoria = tipo === 'pagare' ? m.auditoria_pagare : m.auditoria_contrato
  const firmaImg = tipo === 'pagare' ? m.firma_pagare : m.firma_apoderado
  const firmadoAt = tipo === 'pagare' ? m.firmado_pagare_at : m.firmado_at

  if (!auditoria || !firmaImg) {
    return new NextResponse('Este documento aún no ha sido firmado', { status: 404 })
  }

  const fecha = new Date(firmadoAt).toLocaleString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const tipoLabel = tipo === 'pagare' ? 'Pagaré' : 'Contrato de Prestación de Servicios Educacionales'

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Certificado de Firma Digital</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,sans-serif; color:#1a2332; padding:50px; max-width:700px; margin:0 auto; font-size:12px; }
.header { text-align:center; border-bottom:2px solid #1a2332; padding-bottom:20px; margin-bottom:30px; }
.header h1 { font-size:18px; margin-bottom:4px; }
.header .sub { color:#6b7280; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; }
.section { margin-bottom:24px; }
.section-title { font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; }
.row { display:flex; margin-bottom:6px; }
.row .label { width:160px; font-weight:600; color:#4b5563; flex-shrink:0; }
.row .value { color:#1a2332; }
.hash { font-family:monospace; font-size:10px; background:#f8fafc; padding:2px 6px; border-radius:4px; word-break:break-all; }
.firma-img { border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-top:10px; text-align:center; background:#fafbfc; }
.firma-img img { max-height:100px; }
.legal { margin-top:30px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; font-size:11px; color:#4b5563; line-height:1.6; }
.legal strong { color:#1a2332; }
.footer { margin-top:30px; text-align:center; color:#9ca3af; font-size:9px; border-top:1px solid #e8eaed; padding-top:12px; }
.no-print { margin-top:30px; text-align:center; }
@media print { .no-print { display:none; } body { padding:30px; } }
</style></head><body>

<div class="header">
  <div class="sub">Fundación Educacional AR Ministries</div>
  <h1>Certificado de Firma Electrónica</h1>
  <div class="sub" style="margin-top:8px;">Ley 19.799 — Firma Electrónica Simple</div>
</div>

<div class="section">
  <div class="section-title">Documento firmado</div>
  <div class="row"><div class="label">Tipo:</div><div class="value">${tipoLabel}</div></div>
  <div class="row"><div class="label">Alumno:</div><div class="value">${m.alumno?.nombre} ${m.alumno?.apellido} — ${m.alumno?.curso}</div></div>
  ${m.alumno?.rut ? `<div class="row"><div class="label">RUT alumno:</div><div class="value">${m.alumno.rut}</div></div>` : ''}
  <div class="row"><div class="label">ID matrícula:</div><div class="value" style="font-family:monospace;font-size:10px;">${matriculaId}</div></div>
</div>

<div class="section">
  <div class="section-title">Firmante</div>
  <div class="row"><div class="label">Nombre:</div><div class="value">${auditoria.firmante?.nombre ?? '—'}</div></div>
  <div class="row"><div class="label">Email:</div><div class="value">${auditoria.firmante?.email ?? '—'}</div></div>
  <div class="row"><div class="label">Rol:</div><div class="value">${auditoria.firmante?.rol ?? '—'}</div></div>
  <div class="row"><div class="label">ID usuario:</div><div class="value" style="font-family:monospace;font-size:10px;">${auditoria.firmante?.id ?? '—'}</div></div>
</div>

<div class="section">
  <div class="section-title">Evidencia de firma</div>
  <div class="row"><div class="label">Fecha y hora:</div><div class="value">${fecha}</div></div>
  <div class="row"><div class="label">Dirección IP:</div><div class="value">${auditoria.ip ?? '—'}</div></div>
  <div class="row"><div class="label">Navegador:</div><div class="value" style="font-size:10px;">${(auditoria.user_agent ?? '—').substring(0, 100)}</div></div>
  <div class="row"><div class="label">Hash documento (SHA-256):</div><div class="value"><span class="hash">${auditoria.documento_hash ?? 'No disponible'}</span></div></div>
  <div class="row"><div class="label">Hash firma (SHA-256):</div><div class="value"><span class="hash">${auditoria.firma_hash ?? 'No disponible'}</span></div></div>
  <div class="row"><div class="label">Método:</div><div class="value">Firma Electrónica Simple (FES)</div></div>
  <div class="row"><div class="label">Ley aplicable:</div><div class="value">Ley 19.799 — Chile</div></div>
</div>

<div class="section">
  <div class="section-title">Consentimiento registrado</div>
  <p style="font-size:11px;color:#4b5563;line-height:1.5;font-style:italic;">"${auditoria.consentimiento_texto ?? ''}"</p>
</div>

<div class="section">
  <div class="section-title">Firma capturada</div>
  <div class="firma-img">
    <img src="${firmaImg}" alt="Firma digital"/>
  </div>
</div>

<div class="legal">
  <strong>Aviso legal:</strong> Este certificado acredita que el documento fue firmado electrónicamente por el titular identificado arriba, utilizando Firma Electrónica Simple conforme al artículo 3° de la Ley 19.799 sobre Documentos Electrónicos y Firma Electrónica de Chile. La integridad del documento se verifica mediante el hash SHA-256 registrado al momento de la firma. Cualquier alteración posterior del documento invalidaría esta certificación.
</div>

<div class="footer">
  AR School Global · Fundación Educacional AR Ministries · RUT 65.168.392-0<br/>
  Certificado generado el ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
</div>

<div class="no-print">
  <button onclick="window.print()" style="background:#1a2332;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
  <button onclick="window.close()" style="background:white;color:#1a2332;border:1.5px solid #e2e8f0;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;">Cerrar</button>
</div>

</body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
