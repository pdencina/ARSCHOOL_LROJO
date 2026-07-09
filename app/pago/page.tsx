'use client'

import Image from 'next/image'

export default function PagoFacilPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fb] to-white">
      {/* Header */}
      <div className="bg-white border-b border-[#e8eaed] py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-arschool.png" alt="AR School" width={40} height={40} className="rounded-lg"/>
            <div>
              <div className="font-bold text-[#1a2332] text-[15px]" style={{ fontFamily: 'DM Sans' }}>AR SCHOOL GLOBAL</div>
              <div className="text-[11px] text-[#9ca3af]">Fundación Educacional AR Ministries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'DM Sans' }}>Pago Fácil</h1>
          <p className="text-[#6b7280] text-[14px]">Realiza tus aportes de forma rápida y segura</p>
        </div>

        {/* Opciones de pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Transbank / Webpay */}
          <a href="https://www.webpay.cl" target="_blank" className="bg-white border border-[var(--ar-border)] rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ti ti-credit-card text-2xl text-blue-600" aria-hidden="true"/>
              </div>
              <div>
                <div className="font-bold text-[#1a2332] text-[14px]">Webpay / Transbank</div>
                <div className="text-[11px] text-[#9ca3af]">Tarjeta de débito o crédito</div>
              </div>
            </div>
            <p className="text-[12px] text-[#6b7280]">Paga con tu tarjeta bancaria de forma segura a través de Transbank.</p>
          </a>

          {/* SumUp */}
          <a href="https://pay.sumup.com" target="_blank" className="bg-white border border-[var(--ar-border)] rounded-xl p-6 hover:border-emerald-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ti ti-qrcode text-2xl text-emerald-600" aria-hidden="true"/>
              </div>
              <div>
                <div className="font-bold text-[#1a2332] text-[14px]">SumUp</div>
                <div className="text-[11px] text-[#9ca3af]">Link de pago / QR</div>
              </div>
            </div>
            <p className="text-[12px] text-[#6b7280]">Paga escaneando un código QR o a través de un link de pago.</p>
          </a>

          {/* Transferencia */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <i className="ti ti-building-bank text-2xl text-amber-600" aria-hidden="true"/>
              </div>
              <div>
                <div className="font-bold text-[#1a2332] text-[14px]">Transferencia bancaria</div>
                <div className="text-[11px] text-[#9ca3af]">Depósito directo</div>
              </div>
            </div>
            <div className="bg-[#f9fafb] rounded-lg p-3 text-[11px] text-[#4b5563] space-y-1">
              <div><strong>Banco:</strong> BancoEstado</div>
              <div><strong>Cuenta Corriente:</strong> 291-0-008051-4</div>
              <div><strong>RUT:</strong> 65.168.392-0</div>
              <div><strong>Nombre:</strong> Fundación Educacional AR Ministries</div>
              <div><strong>Email:</strong> adm@arschoolglobal.com</div>
            </div>
            <p className="text-[10px] text-[#9ca3af] mt-2">Envía el comprobante a adm@arschoolglobal.com indicando nombre del alumno.</p>
          </div>

          {/* Pago presencial */}
          <div className="bg-white border border-[var(--ar-border)] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <i className="ti ti-cash text-2xl text-violet-600" aria-hidden="true"/>
              </div>
              <div>
                <div className="font-bold text-[#1a2332] text-[14px]">Pago presencial</div>
                <div className="text-[11px] text-[#9ca3af]">En secretaría</div>
              </div>
            </div>
            <p className="text-[12px] text-[#6b7280]">Acércate a cualquiera de nuestras sedes para realizar tu aporte en efectivo o con tarjeta.</p>
            <div className="mt-3 text-[11px] text-[#9ca3af] space-y-0.5">
              <div>📍 Victoria 52, Santiago</div>
              <div>📍 Irarrázaval 0565, Puente Alto</div>
              <div>📍 Chiloé 862, Punta Arenas</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-[12px] text-[#9ca3af]">¿Tienes dudas? Escríbenos al <a href="https://wa.me/56936902642" target="_blank" className="text-[var(--ar-accent)] hover:underline">+56 9 3690 2642</a></p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e8eaed] py-4 text-center">
        <p className="text-[10px] text-[#d1d5db]">AR School Global · Fundación Educacional AR Ministries · RUT 65.168.392-0</p>
      </div>
    </div>
  )
}
