'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import FirmaDigital from './FirmaDigital'

interface Props {
  matriculaId: string
  alumno: any
  firmado: boolean
}

export default function FirmaContratoClient({ matriculaId, alumno, firmado }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [firmaOk, setFirmaOk] = useState(firmado)

  async function handleFirmar(firmaDataUrl: string) {
    setSaving(true)
    const res = await fetch('/api/contratos/firmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricula_id: matriculaId, firma_data: firmaDataUrl }),
    })

    if (res.ok) {
      toast.success('Contrato firmado correctamente')
      setFirmaOk(true)
      router.refresh()
    } else {
      toast.error('Error al guardar la firma')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="page-title">Firma del contrato</h1>
        <p className="page-subtitle">Contrato de matrícula de {alumno?.nombre} {alumno?.apellido} · {alumno?.curso}</p>
      </div>

      {firmaOk ? (
        <div className="bg-white border border-[var(--ar-border)] rounded-xl p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-check text-3xl text-emerald-600" aria-hidden="true"/>
          </div>
          <h2 className="text-[16px] font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'DM Sans' }}>Contrato firmado</h2>
          <p className="text-[13px] text-[#6b7280] mb-4">La firma digital ha sido registrada exitosamente.</p>
          <div className="flex gap-2 justify-center">
            <a href={`/api/contratos?matricula_id=${matriculaId}`} target="_blank" className="btn-secondary text-xs">
              <i className="ti ti-file-text text-sm" aria-hidden="true"/> Ver contrato
            </a>
            <a href="/matricula" className="btn-primary text-xs">
              Volver a matrículas
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview del contrato */}
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
              <p className="mb-2">Al firmar este documento, el apoderado confirma haber leído y aceptado todas las cláusulas del Contrato de Prestación de Servicios Educacionales de la Fundación Educacional AR Ministries.</p>
              <p className="font-medium text-[#1a2332]">Alumno: {alumno?.nombre} {alumno?.apellido} — {alumno?.curso}</p>
            </div>
          </div>

          {/* Pad de firma */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <FirmaDigital onFirmar={handleFirmar} />
            {saving && <p className="text-[12px] text-[#9ca3af] mt-2 text-center">Guardando firma...</p>}
          </div>
        </div>
      )}
    </div>
  )
}
