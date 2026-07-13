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
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-checks text-3xl text-emerald-600" aria-hidden="true"/>
          </div>
          <h2 className="text-[16px] font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'DM Sans' }}>Documentos firmados</h2>
          <p className="text-[13px] text-[#6b7280] mb-4">El contrato y pagaré han sido firmados digitalmente.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <a href={`/api/contratos?matricula_id=${matriculaId}`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-file-text text-sm" aria-hidden="true"/> Ver contrato
            </a>
            <a href={`/api/contratos?matricula_id=${matriculaId}&tipo=pagare`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-file-dollar text-sm" aria-hidden="true"/> Ver pagaré
            </a>
            <a href={`/api/contratos/certificado?matricula_id=${matriculaId}&tipo=contrato`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-certificate text-sm" aria-hidden="true"/> Certificado contrato
            </a>
            <a href={`/api/contratos/certificado?matricula_id=${matriculaId}&tipo=pagare`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-certificate text-sm" aria-hidden="true"/> Certificado pagaré
            </a>
            <a href="/matricula" className="btn-primary text-xs">
              Volver a matrículas
            </a>
          </div>
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
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[12px] text-[#6b7280]">
                      Contrato de prestación de servicios educacionales — AR School {new Date().getFullYear()}
                    </div>
                    <a href={`/api/contratos?matricula_id=${matriculaId}`} target="_blank" className="text-[11px] text-[var(--ar-accent)] hover:underline">
                      Ver contrato completo →
                    </a>
                  </div>
                  <div className="bg-[#f9fafb] rounded-lg p-4 text-[12px] text-[#4b5563]">
                    <p className="mb-2">Al firmar este documento, el apoderado confirma haber leído y aceptado todas las cláusulas del Contrato de Prestación de Servicios Educacionales.</p>
                    <p className="font-medium text-[#1a2332]">Alumno: {alumno?.nombre} {alumno?.apellido} — {alumno?.curso}</p>
                  </div>
                </div>
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
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
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[12px] text-[#6b7280]">
                      Pagaré de aportes educacionales — AR School {new Date().getFullYear()}
                    </div>
                    <a href={`/api/contratos?matricula_id=${matriculaId}&tipo=pagare`} target="_blank" className="text-[11px] text-[var(--ar-accent)] hover:underline">
                      Ver pagaré completo →
                    </a>
                  </div>
                  <div className="bg-[#f9fafb] rounded-lg p-4 text-[12px] text-[#4b5563]">
                    <p className="mb-2">Al firmar este pagaré, el apoderado se compromete al pago de los aportes mensuales según el calendario establecido en el contrato.</p>
                    <p className="font-medium text-[#1a2332]">Alumno: {alumno?.nombre} {alumno?.apellido} — {alumno?.curso}</p>
                  </div>
                  {!contratoFirmado && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800">
                      <i className="ti ti-alert-triangle text-xs mr-1" aria-hidden="true"/>
                      Se recomienda firmar primero el contrato antes del pagaré.
                    </div>
                  )}
                </div>
                <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
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
                        <strong className="text-slate-800">Declaración de consentimiento:</strong> Declaro haber leído íntegramente el pagaré y me obligo al pago de los aportes según el calendario establecido. Confirmo que esta firma electrónica simple tiene plena validez legal conforme a la <strong>Ley 19.799</strong> de Chile.
                      </div>
                    </label>
                  </div>
                  <FirmaDigital onFirmar={(firma) => handleFirmar(firma, 'pagare')} />
                  {saving && <p className="text-[12px] text-[#9ca3af] mt-2 text-center">Guardando firma con evidencia legal...</p>}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
