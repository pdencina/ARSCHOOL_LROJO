import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMonto(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatFecha(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function getMesNombre(mes: number): string {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return meses[mes - 1] ?? ''
}

export function calcularPorcentaje(valor: number, total: number): number {
  if (total === 0) return 0
  return Math.round((valor / total) * 100)
}

export const MATERIAS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  lenguaje:          { label: 'Lenguaje',      color: '#C0392B', bg: '#FADBD8', border: '#922B21', emoji: '📖' },
  matematicas:       { label: 'Matemáticas',   color: '#1A5276', bg: '#D6EAF8', border: '#154360', emoji: '🔢' },
  ciencias:          { label: 'Cs. Naturales', color: '#1E8449', bg: '#D5F5E3', border: '#145A32', emoji: '🌿' },
  historia:          { label: 'Historia',      color: '#7D6608', bg: '#FEF9E7', border: '#7D6608', emoji: '🌍' },
  ingles:            { label: 'Inglés',        color: '#7D3C98', bg: '#F5EEF8', border: '#6C3483', emoji: '🇬🇧' },
  artes:             { label: 'Artes',         color: '#CA6F1E', bg: '#FDEBD0', border: '#7E5109', emoji: '🎨' },
  educacion_fisica:  { label: 'Ed. Física',    color: '#17A589', bg: '#E8F8F5', border: '#148F77', emoji: '⚽' },
  otro:              { label: 'Otro',          color: '#4A4A4A', bg: '#F5F1E8', border: '#2C2C2C', emoji: '📄' },
}

export const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  pagado:   { label: 'Al día',    className: 'bg-verde-claro text-verde-oscuro' },
  mora:     { label: 'En mora',   className: 'bg-rojo-claro text-rojo-oscuro' },
  pendiente:{ label: 'Pendiente', className: 'bg-amarillo-claro text-yellow-800' },
  parcial:  { label: 'Parcial',   className: 'bg-naranja-claro text-orange-900' },
  anulado:  { label: 'Anulado',   className: 'bg-gray-100 text-gray-500' },
}
