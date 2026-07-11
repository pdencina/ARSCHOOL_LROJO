'use client'

import { useState, useEffect } from 'react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function CumpleanosWidget() {
  const [cumpleaneros, setCumpleaneros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cumpleanos?rango=semana')
      .then(r => r.json())
      .then(data => { setCumpleaneros(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null

  const hoy = new Date()
  const diaHoy = hoy.getDate()
  const mesHoy = hoy.getMonth() + 1

  if (cumpleaneros.length === 0) return null

  return (
    <div className="bg-white border border-[var(--ar-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎂</span>
        <h3 className="text-[13px] font-bold text-[#1B3A5C]">Cumpleaños esta semana</h3>
      </div>
      <div className="space-y-2">
        {cumpleaneros.map(c => {
          const esHoy = c.dia_cumple === diaHoy && c.mes_cumple === mesHoy
          return (
            <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${esHoy ? 'bg-[#FEF3EC] border border-[#E8722A]/20' : 'bg-[#f9fafb]'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ${esHoy ? 'bg-[#E8722A] text-white' : 'bg-[#f0f4f8] text-[#1B3A5C]'}`}>
                {c.dia_cumple}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#1B3A5C] truncate">
                  {c.nombre} {c.apellido}
                  {esHoy && <span className="ml-1 text-[#E8722A]">🎉 ¡Hoy!</span>}
                </div>
                <div className="text-[10px] text-[#9ca3af]">{c.curso} · Cumple {c.edad} años</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
