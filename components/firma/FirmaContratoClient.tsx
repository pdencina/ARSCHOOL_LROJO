'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import FirmaDigital from './FirmaDigital'

interface Props {
  matriculaId: string
  alumno: any
  firmadoContrato: boolean
  firmadoPagare: boolean
}

type TabTipo = 'contrato' | 'pagare'

export default function FirmaContratoClient({ matriculaId, alumno, firmadoContrato, firmadoPagare }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabTipo>(firmadoContrato && !firmadoPagare ? 'pagare' : 'contrato')
  const [saving, setSaving] = useState(false)
  const [contratoFirmado, setContratoFirmado] = useState(firmadoContrato)
  const [pagareFirmado, setPagareFirmado] = useState(firmadoPagare)
  const [consentimiento, setConsentimiento] = useState(false)
  const [documentoRevisado, setDocumentoRevisado] = useState<Record<TabTipo, boolean>>({ contrato: false, pagare: false })

  function handleRevisarDocumento(tipo: TabTipo) {
    const url = tipo === 'pagare'
      ? `/api/contratos?matricula_id=${matriculaId}&tipo=pagare`
      : `/api/contratos?matricula_id=${matriculaId}`
    window.open(url, '_blank')
    setDocumentoRevisado(prev => ({ ...prev, [tipo]: true }))
  }

  async function handleFirmar(firmaDataUrl: string, tipo: TabTipo) {
    if (!consentimiento) {
      toast.error('Debe aceptar la declaración de consentimiento antes de firmar')
      return
    }

    setSaving(true)

    // Obtener el HTML del documento para generar hash de integridad
    let documentoHtml: string | null = null
    try {
      const docUrl = tipo === 'pagare'
        ? `/api/contratos?matricula_id=${matriculaId}&tipo=pagare`
        : `/api/contratos?matricula_id=${matriculaId}`
      const docRes = await fetch(docUrl)
      if (docRes.ok) documentoHtml = await docRes.text()
    } catch { /* continue without hash */ }

    const res = await fetch('/api/contratos/firmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricula_id: matriculaId,
        firma_data: firmaDataUrl,
        tipo,
        consentimiento: true,
        documento_html: documentoHtml,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (tipo === 'contrato') {
        setContratoFirmado(true)
        toast.success('Contrato firmado con validez legal')
        if (!pagareFirmado) { setTab('pagare'); setConsentimiento(false) }
      } else {
        setPagareFirmado(true)
        toast.success('Pagaré firmado con validez legal')
      }
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al guardar la firma')
    }
    setSaving(false)
  }

  const ambosCompletos = contratoFirmado && pagareFirmado
  const [medioPago, setMedioPago] = useState<'' | 'transferencia' | 'tarjeta' | 'cheque' | 'pagare'>('')
  const [pagareConfirmado, setPagareConfirmado] = useState(false)
  const [savingPago, setSavingPago] = useState(false)
  const [pagoRegistrado, setPagoRegistrado] = useState(false)

  // Descuento 5% solo aplica si se paga antes del 12 de marzo del año escolar
  const anioEscolar = new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0) // Si estamos en jul+ es para el año siguiente
  const fechaLimiteDescuento = new Date(anioEscolar, 2, 12) // 12 de marzo
  const descuentoVigente = new Date() < fechaLimiteDescuento
  const porcentajeDescuento = descuentoVigente ? 5 : 0

  async function handleRegistrarMedioPago() {
    if (!medioPago) { toast.error('Seleccione un medio de pago'); return }
    if (medioPago === 'pagare' && !pagareConfirmado) { toast.error('Debe confirmar que se agotaron las opciones preferentes'); return }
    setSavingPago(true)

    const descuento = ['transferencia', 'tarjeta'].includes(medioPago) ? porcentajeDescuento : 0
    const res = await fetch('/api/matriculas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricula_id: matriculaId,
        medio_pago_matricula: medioPago,
        descuento_contado: descuento,
        pagare_confirmado: medioPago === 'pagare' ? pagareConfirmado : false,
      }),
    })

    if (res.ok) {
      toast.success('Medio de pago registrado')
      setPagoRegistrado(true)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Error al registrar medio de pago')
    }
    setSavingPago(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Firma de documentos</h1>
        <p className="page-subtitle">
          Matrícula de {alumno?.nombre} {alumno?.apellido} · {alumno?.curso}
        </p>
      </div>

      {/* Estado general */}
      {ambosCompletos ? (
        <div className="space-y-6">
          {/* Confirmación de firmas */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <i className="ti ti-checks text-xl text-emerald-600" aria-hidden="true"/>
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Documentos firmados</h2>
                <p className="text-[12px] text-[#6b7280]">El contrato y pagaré han sido firmados digitalmente.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={`/api/contratos?matricula_id=${matriculaId}`} target="_blank" className="btn-secondary text-xs">
                <i className="ti ti-file-text text-sm" aria-hidden="true"/> Ver contrato
              </a>
              <a href={`/api/contratos?matricula_id=${matriculaId}&tipo=pagare`} target="_blank" className="btn-secondary text-xs">
                <i className="ti ti-file-dollar text-sm" aria-hidden="true"/> Ver pagaré
              </a>
              <a href={`/api/contratos/certificado?matricula_id=${matriculaId}&tipo=contrato`} target="_blank" className="btn-secondary text-xs">
                <i className="ti ti-certificate text-sm" aria-hidden="true"/> Certificado
              </a>
            </div>
          </div>

          {/* Paso 3: Medio de pago (post-firma) */}
          {!pagoRegistrado ? (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[11px] font-bold">3</div>
                <h2 className="text-[14px] font-semibold text-[#1a2332]" style={{ fontFamily: 'DM Sans' }}>Entrega de aportes — Medio de pago</h2>
              </div>
              <p className="text-[12px] text-[#6b7280] mb-4">Seleccione cómo realizará el pago de los aportes educacionales.</p>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${medioPago === 'transferencia' ? 'border-emerald-400 bg-emerald-50/50' : 'border-[var(--ar-border)] hover:border-slate-300'}`}>
                  <input type="radio" name="medio_pago_post" value="transferencia" checked={medioPago === 'transferencia'} onChange={() => { setMedioPago('transferencia'); setPagareConfirmado(false) }} className="mt-0.5 accent-emerald-600"/>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1a2332]">Transferencia bancaria</span>
                      <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Recomendado</span>
                      {descuentoVigente && <span className="text-[10px] font-bold text-emerald-600 ml-auto">5% dcto.</span>}
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      {descuentoVigente
                        ? `Pago contado vía transferencia. 5% de descuento si se paga antes del 12 de marzo ${anioEscolar}.`
                        : 'Pago contado vía transferencia.'}
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${medioPago === 'tarjeta' ? 'border-emerald-400 bg-emerald-50/50' : 'border-[var(--ar-border)] hover:border-slate-300'}`}>
                  <input type="radio" name="medio_pago_post" value="tarjeta" checked={medioPago === 'tarjeta'} onChange={() => { setMedioPago('tarjeta'); setPagareConfirmado(false) }} className="mt-0.5 accent-emerald-600"/>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1a2332]">Tarjeta de crédito / débito</span>
                      {descuentoVigente && <span className="text-[10px] font-bold text-emerald-600 ml-auto">5% dcto.</span>}
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      {descuentoVigente
                        ? `Pago contado con tarjeta. Mismo descuento (antes del 12 de marzo ${anioEscolar}).`
                        : 'Pago contado con tarjeta.'}
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${medioPago === 'cheque' ? 'border-blue-300 bg-blue-50/30' : 'border-[var(--ar-border)] hover:border-slate-300'}`}>
                  <input type="radio" name="medio_pago_post" value="cheque" checked={medioPago === 'cheque'} onChange={() => { setMedioPago('cheque'); setPagareConfirmado(false) }} className="mt-0.5 accent-blue-600"/>
                  <div className="flex-1">
                    <span className="text-[13px] font-semibold text-[#1a2332]">Cheques</span>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">Pago fraccionado mediante cheques a fecha. Sin descuento.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${medioPago === 'pagare' ? 'border-amber-300 bg-amber-50/50' : 'border-[var(--ar-border)] hover:border-slate-300'}`}>
                  <input type="radio" name="medio_pago_post" value="pagare" checked={medioPago === 'pagare'} onChange={() => setMedioPago('pagare')} className="mt-0.5 accent-amber-600"/>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1a2332]">Pagaré</span>
                      <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Última opción</span>
                    </div>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">Solo si no es posible transferencia, tarjeta o cheques.</p>
                  </div>
                </label>
              </div>

              {medioPago === 'pagare' && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <i className="ti ti-alert-triangle text-amber-600 text-base mt-0.5" aria-hidden="true"/>
                    <p className="text-[11px] text-amber-700">Confirme que el apoderado no puede pagar mediante transferencia, tarjeta o cheques.</p>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={pagareConfirmado} onChange={e => setPagareConfirmado(e.target.checked)} className="w-4 h-4 accent-amber-600 rounded"/>
                    <span className="text-[11px] text-amber-900 font-medium">Confirmo que se agotaron las opciones de pago preferentes.</span>
                  </label>
                </div>
              )}

              <button
                onClick={handleRegistrarMedioPago}
                disabled={!medioPago || savingPago}
                className="mt-4 w-full btn-primary py-3 disabled:opacity-50"
              >
                {savingPago ? 'Registrando...' : 'Registrar medio de pago'}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ti ti-circle-check text-2xl text-emerald-600" aria-hidden="true"/>
              </div>
              <h3 className="text-[14px] font-bold text-[#1a2332] mb-1">Proceso completado</h3>
              <p className="text-[12px] text-[#6b7280] mb-4">Documentos firmados y medio de pago registrado.</p>
              <a href="/matricula" className="btn-primary text-xs">
                Volver a matrículas
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => setTab('contrato')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'contrato'
                  ? 'border-[var(--ar-accent)] text-[var(--ar-accent)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className="ti ti-file-text text-sm" aria-hidden="true"/>
              Contrato
              {contratoFirmado && <i className="ti ti-check text-emerald-500 text-sm ml-1" aria-hidden="true"/>}
            </button>
            <button
              onClick={() => setTab('pagare')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'pagare'
                  ? 'border-[var(--ar-accent)] text-[var(--ar-accent)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <i className="ti ti-file-dollar text-sm" aria-hidden="true"/>
              Pagaré
              {pagareFirmado && <i className="ti ti-check text-emerald-500 text-sm ml-1" aria-hidden="true"/>}
            </button>
          </div>

          {/* Progreso */}
          <div className="flex items-center gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${contratoFirmado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {contratoFirmado ? <i className="ti ti-check text-xs" aria-hidden="true"/> : '1'}
            </div>
            <div className={`h-0.5 flex-1 ${contratoFirmado ? 'bg-emerald-300' : 'bg-slate-200'}`}/>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${pagareFirmado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              {pagareFirmado ? <i className="ti ti-check text-xs" aria-hidden="true"/> : '2'}
            </div>
            <span className="text-[11px] text-slate-400 ml-2">
              {contratoFirmado && pagareFirmado ? 'Completo' : contratoFirmado ? 'Falta pagaré' : 'Falta contrato'}
            </span>
          </div>

          {/* Contenido del tab activo */}
          {tab === 'contrato' && (
            contratoFirmado ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <i className="ti ti-check text-2xl text-emerald-600 block mb-2" aria-hidden="true"/>
                <p className="text-sm font-medium text-emerald-800">Contrato firmado ✓</p>
                <a href={`/api/contratos?matricula_id=${matriculaId}`} target="_blank" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
                  Ver documento completo →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Paso 1: Revisar documento */}
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${documentoRevisado.contrato ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1a2332] text-white'}`}>
                      {documentoRevisado.contrato ? <i className="ti ti-check text-xs" aria-hidden="true"/> : '1'}
                    </div>
                    <span className="text-[13px] font-semibold text-[#1a2332]">Revisar el contrato</span>
                  </div>
                  <div className="bg-[#f9fafb] rounded-lg p-4 text-[12px] text-[#4b5563] mb-3">
                    <p className="mb-2">Antes de firmar, el apoderado debe revisar íntegramente el Contrato de Prestación de Servicios Educacionales.</p>
                    <p className="font-medium text-[#1a2332]">Alumno: {alumno?.nombre} {alumno?.apellido} — {alumno?.curso}</p>
                  </div>
                  <button
                    onClick={() => handleRevisarDocumento('contrato')}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-semibold transition-all ${
                      documentoRevisado.contrato
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#1a2332] text-white hover:bg-[#2a3a52]'
                    }`}
                  >
                    <i className={`ti ${documentoRevisado.contrato ? 'ti-check' : 'ti-file-text'} text-sm`} aria-hidden="true"/>
                    {documentoRevisado.contrato ? 'Documento revisado — Ver de nuevo' : 'Abrir contrato completo para revisión'}
                  </button>
                  {!documentoRevisado.contrato && (
                    <p className="text-[10px] text-[#9ca3af] mt-2 text-center">Se abrirá en una nueva pestaña. Luego podrá firmar aquí.</p>
                  )}
                </div>

                {/* Paso 2: Consentimiento y firma (solo si revisó) */}
                {documentoRevisado.contrato ? (
                  <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <span className="text-[13px] font-semibold text-[#1a2332]">Consentimiento y firma</span>
                    </div>
                    {/* Declaración de consentimiento legal */}
                    <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={consentimiento}
                          onChange={e => setConsentimiento(e.target.checked)}
                          className="w-4 h-4 accent-[#1a2332] mt-0.5 flex-shrink-0"
                        />
                        <div className="text-[11px] text-slate-600 leading-relaxed">
                          <strong className="text-slate-800">Declaración de consentimiento:</strong> Declaro haber leído íntegramente el contrato de prestación de servicios educacionales y acepto sus términos. Confirmo que esta firma electrónica simple tiene plena validez legal conforme a la <strong>Ley 19.799</strong> de Chile. Entiendo que se registrará evidencia digital (fecha, hora, IP) como respaldo de esta firma.
                        </div>
                      </label>
                    </div>
                    <FirmaDigital onFirmar={(firma) => handleFirmar(firma, 'contrato')} />
                    {saving && <p className="text-[12px] text-[#9ca3af] mt-2 text-center">Guardando firma con evidencia legal...</p>}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center opacity-50">
                    <i className="ti ti-lock text-xl text-slate-400 block mb-2" aria-hidden="true"/>
                    <p className="text-[12px] text-slate-500">La firma se habilitará después de revisar el documento</p>
                  </div>
                )}
              </div>
            )
          )}

          {tab === 'pagare' && (
            pagareFirmado ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <i className="ti ti-check text-2xl text-emerald-600 block mb-2" aria-hidden="true"/>
                <p className="text-sm font-medium text-emerald-800">Pagaré firmado ✓</p>
                <a href={`/api/contratos?matricula_id=${matriculaId}&tipo=pagare`} target="_blank" className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
                  Ver documento completo →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Paso 1: Revisar pagaré */}
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${documentoRevisado.pagare ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1a2332] text-white'}`}>
                      {documentoRevisado.pagare ? <i className="ti ti-check text-xs" aria-hidden="true"/> : '1'}
                    </div>
                    <span className="text-[13px] font-semibold text-[#1a2332]">Revisar el pagaré</span>
                  </div>
                  <div className="bg-[#f9fafb] rounded-lg p-4 text-[12px] text-[#4b5563] mb-3">
                    <p className="mb-2">Antes de firmar, el apoderado debe revisar el pagaré de aportes educacionales.</p>
                    <p className="font-medium text-[#1a2332]">Alumno: {alumno?.nombre} {alumno?.apellido} — {alumno?.curso}</p>
                  </div>
                  {!contratoFirmado && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800">
                      <i className="ti ti-alert-triangle text-xs mr-1" aria-hidden="true"/>
                      Se recomienda firmar primero el contrato antes del pagaré.
                    </div>
                  )}
                  <button
                    onClick={() => handleRevisarDocumento('pagare')}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-semibold transition-all ${
                      documentoRevisado.pagare
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-[#1a2332] text-white hover:bg-[#2a3a52]'
                    }`}
                  >
                    <i className={`ti ${documentoRevisado.pagare ? 'ti-check' : 'ti-file-dollar'} text-sm`} aria-hidden="true"/>
                    {documentoRevisado.pagare ? 'Pagaré revisado — Ver de nuevo' : 'Abrir pagaré completo para revisión'}
                  </button>
                  {!documentoRevisado.pagare && (
                    <p className="text-[10px] text-[#9ca3af] mt-2 text-center">Se abrirá en una nueva pestaña. Luego podrá firmar aquí.</p>
                  )}
                </div>

                {/* Paso 2: Consentimiento y firma (solo si revisó) */}
                {documentoRevisado.pagare ? (
                  <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full bg-[#1a2332] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                      <span className="text-[13px] font-semibold text-[#1a2332]">Consentimiento y firma</span>
                    </div>
                    <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={consentimiento}
                          onChange={e => setConsentimiento(e.target.checked)}
                          className="w-4 h-4 accent-[#1a2332] mt-0.5 flex-shrink-0"
                        />
                        <div className="text-[11px] text-slate-600 leading-relaxed">
                          <strong className="text-slate-800">Declaración de consentimiento:</strong> Declaro haber leído íntegramente el pagaré y me obligo al pago de los aportes según el calendario establecido. Confirmo que esta firma electrónica simple tiene plena validez legal conforme a la <strong>Ley 19.799</strong> de Chile.
                        </div>
                      </label>
                    </div>
                    <FirmaDigital onFirmar={(firma) => handleFirmar(firma, 'pagare')} />
                    {saving && <p className="text-[12px] text-[#9ca3af] mt-2 text-center">Guardando firma con evidencia legal...</p>}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center opacity-50">
                    <i className="ti ti-lock text-xl text-slate-400 block mb-2" aria-hidden="true"/>
                    <p className="text-[12px] text-slate-500">La firma se habilitará después de revisar el documento</p>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
