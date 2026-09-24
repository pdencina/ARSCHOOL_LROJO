'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Props {
  matriculaId: string
  onClose: (huboCambios: boolean) => void
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MEDIOS = [
  { value: 'transferencia', label: 'Transferencia / depósito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'webpay', label: 'Webpay / tarjeta' },
  { value: 'app', label: 'App' },
]
const ESTADO_CUOTA: Record<string, { label: string; cls: string }> = {
  pagado: { label: 'Pagada', cls: 'bg-[#EDF5F0] text-[#2D5A3F]' },
  parcial: { label: 'Parcial', cls: 'bg-blue-50 text-blue-700' },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
  mora: { label: 'En mora', cls: 'bg-red-50 text-red-700' },
}
const MAX_MB = 4
const $ = (n: number) => `$${(n ?? 0).toLocaleString('es-CL')}`
const fecha = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00`).toLocaleDateString('es-CL') : '')
const hoyISO = () => new Date().toISOString().slice(0, 10)

// Reduce fotos pesadas del celular antes de subir (el servidor acepta hasta 4 MB).
async function comprimirSiHaceFalta(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || /heic|heif/.test(file.type) || file.size <= 1.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export default function PagosContratoModal({ matriculaId, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<string | null>(null) // cuota con el formulario abierto
  const [huboCambios, setHuboCambios] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/matriculas/${matriculaId}/pagos`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setData(d)
    } catch (e: any) {
      toast.error(e.message || 'No se pudieron cargar los pagos')
    } finally {
      setCargando(false)
    }
  }, [matriculaId])

  useEffect(() => { cargar() }, [cargar])

  const [validando, setValidando] = useState<string | null>(null)

  // Aprobar o rechazar el voucher que envió el apoderado desde el portal
  async function validar(p: any, cobroId: string, accion: 'aprobar' | 'rechazar') {
    let motivo: string | null = null
    if (accion === 'aprobar') {
      if (!confirm(`¿Aprobar el comprobante de ${$(p.monto)}? Se sumará a lo pagado de la cuota.`)) return
    } else {
      motivo = prompt('Motivo del rechazo (se enviará al apoderado por email):', 'El comprobante no es legible o el monto no coincide')
      if (motivo === null) return
    }
    setValidando(p.id)
    try {
      const r = await fetch('/api/pagos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: p.id, cobro_id: cobroId, accion, motivo }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || 'No se pudo validar')
      toast.success(accion === 'aprobar' ? 'Comprobante aprobado' : 'Comprobante rechazado; se avisó al apoderado')
      setHuboCambios(true)
      cargar()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setValidando(null)
    }
  }

  async function quitar(compId: string) {
    if (!confirm('¿Quitar este voucher? El pago registrado (si lo hay) no se anula; solo se quita el archivo de respaldo.')) return
    const r = await fetch(`/api/matriculas/${matriculaId}/pagos?comprobante=${compId}`, { method: 'DELETE' })
    const d = await r.json().catch(() => null)
    if (!r.ok) { toast.error(d?.error || 'No se pudo quitar'); return }
    toast.success('Voucher quitado')
    setHuboCambios(true)
    cargar()
  }

  const m = data?.matricula
  const r = data?.resumen
  const mensuales: any[] = (data?.cuotas ?? []).filter((c: any) => c.tipo_concepto === 'aporte_mensual')

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => onClose(huboCambios)}/>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--ar-text)]">Pagos del contrato</h2>
              {m && (
                <p className="text-[11px] text-[var(--ar-muted)]">
                  {m.alumno?.nombre} {m.alumno?.apellido} · {m.programa?.nombre ?? m.alumno?.curso ?? ''}
                  {m.anio_escolar ? ` · ${m.anio_escolar}` : ''}
                  {m.duracion_contrato_meses ? ` · ${m.duracion_contrato_meses} cuotas` : ''}
                  {m.fecha_inicio ? ` desde ${fecha(m.fecha_inicio)}` : ''}
                </p>
              )}
            </div>
            <button onClick={() => onClose(huboCambios)} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0" aria-label="Cerrar">
              <i className="ti ti-x text-base text-gray-500" aria-hidden="true"/>
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4">
            {cargando && (
              <div className="flex items-center gap-2 text-xs text-[var(--ar-muted)] py-8 justify-center">
                <i className="ti ti-loader-2 animate-spin" aria-hidden="true"/> Cargando cuotas del contrato…
              </div>
            )}

            {data && (
              <>
                {/* Resumen */}
                {/* flex en vez de grid: globals.css fuerza grid-cols-2 a 1 columna en celular */}
                <div className="flex flex-wrap gap-2">
                  <Dato label="Total contrato" valor={$(r.total)}/>
                  <Dato label="Pagado" valor={$(r.pagado)} cls="text-[#2D5A3F]"/>
                  <Dato label="Pendiente" valor={$(r.pendiente)} cls={r.pendiente > 0 ? 'text-amber-700' : 'text-[#2D5A3F]'}/>
                  <Dato label="Cuotas pagadas" valor={`${r.cuotas_pagadas} de ${r.cuotas_mensuales}`}/>
                </div>

                {r.sin_comprobante > 0 && (
                  <Aviso tono="ambar" icono="ti-file-alert">
                    {r.sin_comprobante} cuota{r.sin_comprobante !== 1 ? 's tienen' : ' tiene'} pagos registrados sin voucher adjunto.
                  </Aviso>
                )}
                {(data.advertencias as string[]).map((a, i) => (
                  <Aviso key={i} tono="rojo" icono="ti-alert-triangle">{a}</Aviso>
                ))}

                {/* Cuotas */}
                {data.cuotas.length === 0 ? (
                  <p className="text-xs text-[var(--ar-muted)] text-center py-6">Este contrato no tiene cuotas generadas.</p>
                ) : (
                  <ul className="border border-[var(--ar-border)] rounded-xl divide-y divide-[#f1f2f4]">
                    {data.cuotas.map((c: any) => {
                      const n = mensuales.findIndex(x => x.id === c.id) + 1
                      const titulo = c.tipo_concepto === 'aporte_inicial'
                        ? 'Aporte inicial (matrícula)'
                        : `Cuota ${n} de ${mensuales.length} · ${MESES[c.mes - 1]} ${c.anio}`
                      const est = ESTADO_CUOTA[c.estado] ?? ESTADO_CUOTA.pendiente
                      const porValidar = (c.pagos as any[]).filter(p => p.estado === 'pendiente')
                      return (
                        <li key={c.id} className="p-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <div className="flex-1 min-w-[180px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-semibold text-[var(--ar-text)]">{titulo}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${est.cls}`}>{est.label}</span>
                                {porValidar.length > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700" title="El apoderado envió un comprobante que falta validar">
                                    Voucher por validar
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--ar-muted)]">
                                {$(c.monto)}
                                {c.monto_pagado > 0 && c.saldo > 0 && <> · pagado {$(c.monto_pagado)} · saldo {$(c.saldo)}</>}
                                {c.fecha_vencimiento && <> · vence {fecha(c.fecha_vencimiento)}</>}
                                {c.fecha_pago && c.saldo === 0 && <> · pagada {fecha(c.fecha_pago)}</>}
                              </div>
                            </div>
                            <button
                              onClick={() => setAbierta(abierta === c.id ? null : c.id)}
                              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${abierta === c.id ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white border-[var(--ar-border)] text-[#1B3A5C] hover:bg-slate-50'}`}
                            >
                              <i className="ti ti-paperclip text-xs mr-1" aria-hidden="true"/>
                              {abierta === c.id ? 'Cancelar' : 'Adjuntar voucher'}
                            </button>
                          </div>

                          {/* Vouchers y pagos de la cuota */}
                          {(c.comprobantes.length > 0 || c.pagos.some((p: any) => p.tiene_comprobante && p.estado !== 'pendiente')) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {c.comprobantes.map((v: any) => (
                                <span key={v.id} className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 rounded-md pl-2 pr-1 py-0.5">
                                  <a href={`/api/matriculas/${matriculaId}/pagos/ver?comprobante=${v.id}`} target="_blank" rel="noopener noreferrer" className="text-[#1B3A5C] hover:underline font-medium"
                                    title={[v.nota, v.subido_por_nombre && `Subido por ${v.subido_por_nombre}`].filter(Boolean).join(' · ')}>
                                    <i className={`ti ${v.tipo_mime === 'application/pdf' ? 'ti-file-type-pdf' : 'ti-photo'} text-[11px] mr-0.5`} aria-hidden="true"/>
                                    {v.monto ? $(v.monto) : 'Respaldo'}{v.fecha_pago ? ` · ${fecha(v.fecha_pago)}` : ''}
                                  </a>
                                  <button onClick={() => quitar(v.id)} className="text-slate-400 hover:text-red-600 px-0.5" aria-label="Quitar voucher" title="Quitar voucher">
                                    <i className="ti ti-x text-[10px]" aria-hidden="true"/>
                                  </button>
                                </span>
                              ))}
                              {c.pagos.filter((p: any) => p.tiene_comprobante && p.estado !== 'pendiente').map((p: any) => (
                                <a key={p.id} href={`/api/matriculas/${matriculaId}/pagos/ver?pago=${p.id}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-violet-50 border border-violet-100 text-violet-800 rounded-md px-2 py-0.5 hover:underline"
                                  title="Enviado por el apoderado y aprobado">
                                  <i className="ti ti-user-check text-[11px]" aria-hidden="true"/>
                                  Apoderado · {$(p.monto)} · {fecha(p.created_at)}
                                </a>
                              ))}
                            </div>
                          )}

                          {porValidar.map((p: any) => (
                            <div key={p.id} className="mt-2 flex flex-wrap items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-[160px] text-[11px] text-violet-900">
                                <b>Comprobante del apoderado por validar</b> · {$(p.monto)} · enviado {fecha(p.created_at)}
                                {p.registrado_por_nombre && <span className="block text-[10px] text-violet-700">{p.registrado_por_nombre}</span>}
                              </div>
                              {p.tiene_comprobante && (
                                <a href={`/api/matriculas/${matriculaId}/pagos/ver?pago=${p.id}`} target="_blank" rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-violet-800 hover:underline">
                                  <i className="ti ti-eye text-xs mr-0.5" aria-hidden="true"/>Ver
                                </a>
                              )}
                              <button onClick={() => validar(p, c.id, 'aprobar')} disabled={validando === p.id}
                                className="text-[11px] font-semibold px-3 py-1 rounded-md bg-[#2D5A3F] text-white hover:bg-[#245234] disabled:opacity-50">
                                ✓ Aprobar
                              </button>
                              <button onClick={() => validar(p, c.id, 'rechazar')} disabled={validando === p.id}
                                className="text-[11px] font-semibold px-3 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                                Rechazar
                              </button>
                            </div>
                          ))}

                          {abierta === c.id && (
                            <FormVoucher
                              matriculaId={matriculaId}
                              cuota={c}
                              onListo={() => { setAbierta(null); setHuboCambios(true); cargar() }}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function FormVoucher({ matriculaId, cuota, onListo }: { matriculaId: string; cuota: any; onListo: () => void }) {
  const puedeRegistrar = cuota.saldo > 0
  const [archivo, setArchivo] = useState<File | null>(null)
  const [registrar, setRegistrar] = useState(puedeRegistrar)
  const [monto, setMonto] = useState<number>(cuota.saldo || cuota.monto)
  const [medio, setMedio] = useState('transferencia')
  const [fechaPago, setFechaPago] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function elegir(f: File | null) {
    if (!f) { setArchivo(null); return }
    const listo = await comprimirSiHaceFalta(f)
    if (listo.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo pesa ${(listo.size / 1024 / 1024).toFixed(1)} MB (máx. ${MAX_MB} MB). Sube una foto o captura del comprobante.`)
      return
    }
    setArchivo(listo)
  }

  async function enviar() {
    if (!archivo) { toast.error('Selecciona el voucher'); return }
    if (registrar && (!(monto > 0) || monto > cuota.saldo)) { toast.error(`El monto debe estar entre $1 y ${$(cuota.saldo)}`); return }
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('cobro_id', cuota.id)
      fd.append('archivo', archivo)
      fd.append('registrar_pago', registrar ? '1' : '0')
      fd.append('monto', String(registrar ? monto : (monto || '')))
      fd.append('medio_pago', medio)
      fd.append('fecha_pago', fechaPago)
      if (nota.trim()) fd.append('nota', nota.trim())
      const r = await fetch(`/api/matriculas/${matriculaId}/pagos`, { method: 'POST', body: fd })
      const d = await r.json().catch(() => null)
      if (!r.ok) throw new Error(d?.error || 'No se pudo subir el voucher')
      toast.success(registrar ? 'Pago registrado con su voucher' : 'Voucher adjuntado')
      onListo()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 bg-[#f8fafc] border border-slate-200 rounded-lg p-3 space-y-3">
      <label className="block">
        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Voucher (foto o PDF, máx. {MAX_MB} MB)</span>
        <input type="file" accept="image/*,application/pdf" onChange={e => elegir(e.target.files?.[0] ?? null)}
          className="block w-full text-[11px] file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#1B3A5C] file:text-white file:text-[11px] file:font-semibold"/>
        {archivo && <span className="block text-[10px] text-[var(--ar-muted)] mt-1">{archivo.name} · {(archivo.size / 1024).toFixed(0)} KB</span>}
      </label>

      {puedeRegistrar ? (
        <label className="flex items-start gap-2 text-[11px] text-[var(--ar-text)] cursor-pointer">
          <input type="checkbox" checked={registrar} onChange={e => setRegistrar(e.target.checked)} className="mt-0.5"/>
          <span>
            <b>Registrar el pago</b> con este voucher (la cuota queda pagada o parcial).
            <span className="block text-[10px] text-[var(--ar-muted)]">Desmárcalo si el pago ya estaba registrado y solo quieres adjuntar el respaldo.</span>
          </span>
        </label>
      ) : (
        <p className="text-[10px] text-[var(--ar-muted)]">La cuota ya está pagada: el voucher se adjunta como respaldo.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Monto</span>
          <input type="number" min={1} max={registrar ? cuota.saldo : undefined} value={monto || ''} onChange={e => setMonto(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]"/>
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Medio</span>
          <select value={medio} onChange={e => setMedio(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]">
            {MEDIOS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha de pago</span>
          <input type="date" value={fechaPago} max={hoyISO()} onChange={e => setFechaPago(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]"/>
        </label>
      </div>

      <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional): N° de operación, banco, etc."
        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1B3A5C]"/>

      <button onClick={enviar} disabled={enviando || !archivo}
        className="w-full py-2 bg-[#1B3A5C] text-white text-xs font-semibold rounded-lg hover:bg-[#143050] disabled:opacity-50">
        {enviando ? 'Subiendo…' : registrar ? `Registrar pago de ${$(monto)} y adjuntar voucher` : 'Adjuntar voucher'}
      </button>
    </div>
  )
}

function Dato({ label, valor, cls = 'text-[var(--ar-text)]' }: { label: string; valor: string; cls?: string }) {
  return (
    <div className="flex-1 basis-[calc(50%-4px)] sm:basis-0 min-w-0 bg-[#f8fafc] border border-slate-100 rounded-lg px-3 py-2">
      <div className="text-[10px] text-[var(--ar-muted)]">{label}</div>
      <div className={`text-sm font-bold ${cls}`}>{valor}</div>
    </div>
  )
}

function Aviso({ tono, icono, children }: { tono: 'ambar' | 'rojo'; icono: string; children: React.ReactNode }) {
  const cls = tono === 'rojo' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-[11px] ${cls}`}>
      <i className={`ti ${icono} text-sm mt-px`} aria-hidden="true"/>
      <span>{children}</span>
    </div>
  )
}
