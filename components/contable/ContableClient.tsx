'use client'

import { useState } from 'react'
import type { KpiContable, MorosidadMes, CobroConFamilia } from '@/types'
import { formatMonto, formatFecha, ESTADO_CONFIG } from '@/lib/utils'
import MorosidadChart from './MorosidadChart'
import ModalPago from './ModalPago'
import { BarChart2, FileText, Mail, Download } from 'lucide-react'

interface Props {
  cobros: CobroConFamilia[]
  kpis: KpiContable
  historico: MorosidadMes[]
  ultimosPagos: any[]
  mesActual: string
}

type FiltroEstado = 'todos' | 'pagado' | 'mora' | 'pendiente' | 'parcial'

export default function ContableClient({ cobros, kpis, historico, ultimosPagos, mesActual }: Props) {
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [cobroModal, setCobroModal] = useState<CobroConFamilia | null>(null)

  const cobrosVisibles = filtro === 'todos' ? cobros : cobros.filter(c => c.estado === filtro)
  const pctRecaudado = kpis.proyectado > 0 ? Math.round((kpis.recaudado / kpis.proyectado) * 100) : 0

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-r from-azul-oscuro to-azul px-6 py-5 relative overflow-hidden border-l-[5px] border-l-[#0B2C46]">
        <div className="absolute right-[-60px] top-[-60px] w-48 h-48 rounded-full bg-white/5" />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-azul-claro/20 font-mono text-xs tracking-widest text-white/80 uppercase mb-2">
          💳 Módulo contable
        </div>
        <h2 className="font-playfair text-2xl font-bold text-white">Gestión de cobranzas</h2>
        <p className="text-sm text-white/60 italic mt-1 mb-4">
          Estado de cuentas — {mesActual} · {cobros.length} familias
        </p>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary bg-yellow-400 text-azul-oscuro hover:bg-yellow-300 border-yellow-400 flex items-center gap-1.5">
            <FileText size={13}/> Registrar pago
          </button>
          <button className="border border-white/25 text-white bg-white/10 hover:bg-white/20 px-3 py-2 font-mono text-xs tracking-widest rounded-sm transition-colors flex items-center gap-1.5">
            <Mail size={13}/> Avisos de cobro
          </button>
          <button className="border border-white/25 text-white bg-white/10 hover:bg-white/20 px-3 py-2 font-mono text-xs tracking-widest rounded-sm transition-colors flex items-center gap-1.5">
            <Download size={13}/> Exportar Excel
          </button>
          <button className="border border-white/25 text-white bg-white/10 hover:bg-white/20 px-3 py-2 font-mono text-xs tracking-widest rounded-sm transition-colors flex items-center gap-1.5">
            <BarChart2 size={13}/> Informe mensual
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 border-b border-gray-100">
        <div className="p-4 border-r border-gray-100 relative">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-verde" />
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1.5">Recaudado este mes</div>
          <div className="font-playfair text-2xl font-bold text-verde">{formatMonto(kpis.recaudado)}</div>
          <div className="font-mono text-xs mt-1 text-verde">▲ {pctRecaudado}% del proyectado</div>
        </div>
        <div className="p-4 border-r border-gray-100 relative">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-naranja" />
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1.5">En mora</div>
          <div className="font-playfair text-2xl font-bold text-naranja">{formatMonto(kpis.enMora)}</div>
          <div className="font-mono text-xs mt-1 text-naranja">
            {cobros.filter(c => c.estado === 'mora').length} familias
          </div>
        </div>
        <div className="p-4 border-r border-gray-100 relative">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rojo" />
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1.5">Morosidad crítica</div>
          <div className="font-playfair text-2xl font-bold text-rojo">{kpis.moraCritica}</div>
          <div className="font-mono text-xs mt-1 text-rojo">+2 meses sin pagar</div>
        </div>
        <div className="p-4 relative">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-azul-medio" />
          <div className="font-mono text-xs tracking-widest uppercase text-tinta-s mb-1.5">Familias al día</div>
          <div className="font-playfair text-2xl font-bold text-azul-medio">{kpis.familiasAlDia}</div>
          <div className="font-mono text-xs mt-1 text-tinta-s">de {kpis.totalFamilias} totales</div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1">
        {/* Tabla */}
        <div className="flex-1 p-5 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-playfair text-lg font-bold">Estado de cuentas — {mesActual}</h3>
              <p className="text-xs text-tinta-s italic">{cobros.length} familias registradas</p>
            </div>
            <div className="flex gap-1.5">
              {(['todos','pagado','mora','pendiente','parcial'] as FiltroEstado[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition-colors border capitalize ${filtro === f ? 'bg-azul text-white border-azul' : 'bg-white text-tinta-s border-gray-200 hover:border-azul-medio'}`}
                >
                  {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.label ?? f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-papel">
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Familia / Alumno</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Concepto</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Monto</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Vencimiento</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Estado</th>
                  <th className="font-mono text-xs tracking-widest uppercase text-tinta-s px-3 py-2 text-left border-b-2 border-gray-200">Acción</th>
                </tr>
              </thead>
              <tbody>
                {cobrosVisibles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-tinta-s italic font-lora">
                      No hay cobros con ese filtro.
                    </td>
                  </tr>
                ) : cobrosVisibles.map(cobro => (
                  <tr key={cobro.id} className="border-b border-gray-50 hover:bg-azul-claro/10 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-sm text-tinta">
                        Fam. {cobro.familia?.apellido_apoderado}
                      </div>
                      <div className="font-mono text-xs text-tinta-s mt-0.5">
                        {cobro.familia?.alumno?.nombre} · {cobro.familia?.alumno?.curso}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {cobro.concepto?.nombre ?? 'Mensualidad'}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold">
                      <span className={cobro.estado === 'pagado' ? 'text-verde' : cobro.estado === 'mora' ? 'text-rojo' : 'text-naranja'}>
                        {formatMonto(cobro.monto)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-tinta-s">
                      {formatFecha(cobro.fecha_vencimiento)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`tag ${cobro.estado === 'pagado' ? 'tag-ok' : cobro.estado === 'mora' ? 'tag-mora' : cobro.estado === 'parcial' ? 'tag-par' : 'tag-pend'}`}>
                        {ESTADO_CONFIG[cobro.estado]?.label ?? cobro.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {cobro.estado === 'pagado' ? (
                        <button className="btn-secondary py-1 px-2 text-xs">Boleta</button>
                      ) : (
                        <button
                          onClick={() => setCobroModal(cobro)}
                          className="btn-primary py-1 px-2 text-xs bg-azul"
                        >
                          Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel derecho */}
        <aside className="w-72 bg-white border-l border-gray-100 p-4 shrink-0">
          {/* Gráfico */}
          <div className="mb-5">
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s border-b border-gray-100 pb-2 mb-3">
              Morosidad últimos 6 meses
            </div>
            <MorosidadChart data={historico} />
          </div>

          {/* Acciones rápidas */}
          <div className="mb-5">
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s border-b border-gray-100 pb-2 mb-3">
              Acciones rápidas
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ico: '🧾', txt: 'Emitir facturas automáticas' },
                { ico: '📩', txt: 'Avisos con botón de pago' },
                { ico: '📊', txt: 'Informe de caja mensual' },
                { ico: '💳', txt: 'Configurar pago online' },
              ].map((a, i) => (
                <button key={i} className="p-2.5 border border-gray-200 rounded-sm text-left hover:border-azul-medio hover:bg-azul-claro transition-colors cursor-pointer">
                  <div className="text-base mb-1">{a.ico}</div>
                  <div className="font-mono text-xs text-tinta leading-tight">{a.txt}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Últimos pagos */}
          <div>
            <div className="font-mono text-xs tracking-widest uppercase text-tinta-s border-b border-gray-100 pb-2 mb-3">
              Últimos pagos recibidos
            </div>
            <div className="space-y-0">
              {ultimosPagos.length === 0 ? (
                <p className="text-xs text-tinta-s italic text-center py-3">Sin pagos aún</p>
              ) : ultimosPagos.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-semibold">Fam. {p.cobro?.familia?.apellido_apoderado}</div>
                    <div className="font-mono text-xs text-tinta-s">{p.medio_pago}</div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-verde">
                    +{formatMonto(p.monto)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal */}
      {cobroModal && (
        <ModalPago
          cobro={cobroModal}
          onClose={() => setCobroModal(null)}
        />
      )}
    </div>
  )
}
