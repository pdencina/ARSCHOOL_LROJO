/**
 * Estado de cuenta de un alumno.
 *
 * Toma la lista de cobros ya generados (aporte_inicial + aporte_mensual) y produce
 * un resumen claro: cuánto es el total del año, cuánto se ha pagado y cuánto queda,
 * más el desglose por concepto. No genera cobros ni toca la base de datos: solo
 * transforma datos que ya existen para que el apoderado (y el admin) vean la película
 * completa de un vistazo.
 */

export interface CobroLike {
  id: string
  monto: number
  monto_pagado?: number | null
  mes: number
  anio: number
  estado: string // 'pendiente' | 'pagado' | 'parcial' | 'mora' | 'anulado'
  tipo_concepto?: string | null // 'aporte_inicial' | 'aporte_mensual' | 'otro'
  fecha_vencimiento?: string | null
  observaciones?: string | null
  _voucherPendiente?: boolean
  alumno?: { nombre?: string; apellido?: string; curso?: string } | null
}

export interface ResumenEstadoCuenta {
  totalAnual: number
  totalPagado: number
  totalPendiente: number
  porcentajePagado: number // 0-100
  // Desglose por tipo de concepto
  inicial: {
    monto: number
    pagado: number
    pendiente: number
    estado: 'pagado' | 'pendiente' | 'parcial' | 'no_aplica'
  }
  mensual: {
    total: number
    pagado: number
    pendiente: number
    cuotas: number
    cuotasPagadas: number
  }
  // Próximo cobro pendiente (por vencimiento)
  proximoVencimiento: {
    monto: number
    mes: number
    anio: number
    fecha_vencimiento: string | null
    concepto: string
  } | null
  cantidadPendientes: number
  alDia: boolean
}

const ESTADOS_NO_CONTABLES = new Set(['anulado'])

function saldoDe(c: CobroLike): number {
  return Math.max(0, (c.monto ?? 0) - (c.monto_pagado ?? 0))
}

function estaPagado(c: CobroLike): boolean {
  return c.estado === 'pagado' || saldoDe(c) === 0
}

/**
 * Calcula el estado de cuenta a partir de una lista de cobros.
 * Ignora cobros anulados. Los cobros de tipo distinto a inicial/mensual se
 * suman al total pero no se desglosan por separado (se tratan como "otros").
 */
export function calcularEstadoCuenta(cobros: CobroLike[]): ResumenEstadoCuenta {
  const activos = (cobros ?? []).filter(c => !ESTADOS_NO_CONTABLES.has(c.estado))

  const totalAnual = activos.reduce((s, c) => s + (c.monto ?? 0), 0)
  const totalPagado = activos.reduce((s, c) => s + Math.min(c.monto ?? 0, c.monto_pagado ?? 0), 0)
  const totalPendiente = activos.reduce((s, c) => s + saldoDe(c), 0)
  const porcentajePagado = totalAnual > 0 ? Math.round((totalPagado / totalAnual) * 100) : 0

  // Aporte inicial (normalmente uno solo)
  const inicialesCobros = activos.filter(c => c.tipo_concepto === 'aporte_inicial')
  const inicialMonto = inicialesCobros.reduce((s, c) => s + (c.monto ?? 0), 0)
  const inicialPagado = inicialesCobros.reduce((s, c) => s + Math.min(c.monto ?? 0, c.monto_pagado ?? 0), 0)
  const inicialPendiente = inicialesCobros.reduce((s, c) => s + saldoDe(c), 0)
  let inicialEstado: 'pagado' | 'pendiente' | 'parcial' | 'no_aplica' = 'no_aplica'
  if (inicialesCobros.length > 0) {
    if (inicialPendiente === 0) inicialEstado = 'pagado'
    else if (inicialPagado > 0) inicialEstado = 'parcial'
    else inicialEstado = 'pendiente'
  }

  // Aportes mensuales
  const mensualesCobros = activos.filter(c => c.tipo_concepto === 'aporte_mensual' || (!c.tipo_concepto && c.tipo_concepto !== 'aporte_inicial'))
  const mensualTotal = mensualesCobros.reduce((s, c) => s + (c.monto ?? 0), 0)
  const mensualPagado = mensualesCobros.reduce((s, c) => s + Math.min(c.monto ?? 0, c.monto_pagado ?? 0), 0)
  const mensualPendiente = mensualesCobros.reduce((s, c) => s + saldoDe(c), 0)
  const cuotasPagadas = mensualesCobros.filter(estaPagado).length

  // Próximo vencimiento: el pendiente más cercano por (anio, mes)
  const pendientes = activos
    .filter(c => !estaPagado(c))
    .sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes))
  const prox = pendientes[0]

  return {
    totalAnual,
    totalPagado,
    totalPendiente,
    porcentajePagado,
    inicial: {
      monto: inicialMonto,
      pagado: inicialPagado,
      pendiente: inicialPendiente,
      estado: inicialEstado,
    },
    mensual: {
      total: mensualTotal,
      pagado: mensualPagado,
      pendiente: mensualPendiente,
      cuotas: mensualesCobros.length,
      cuotasPagadas,
    },
    proximoVencimiento: prox
      ? {
          monto: saldoDe(prox),
          mes: prox.mes,
          anio: prox.anio,
          fecha_vencimiento: prox.fecha_vencimiento ?? null,
          concepto: prox.tipo_concepto === 'aporte_inicial' ? 'Aporte inicial' : `Aporte ${prox.mes}/${prox.anio}`,
        }
      : null,
    cantidadPendientes: pendientes.length,
    alDia: totalPendiente === 0 && activos.length > 0,
  }
}
