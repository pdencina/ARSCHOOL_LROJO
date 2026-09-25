'use client'

/**
 * Campo de monto en pesos: muestra "$220.500" mientras se escribe y entrega el número
 * limpio (220500). Acepta pegar montos con puntos, espacios o "$".
 */
export default function InputMonto({ value, onChange, placeholder = '$0', className = '', id, disabled }: {
  value: number | string | null | undefined
  onChange: (monto: number) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}) {
  const n = Number(value) || 0
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={n > 0 ? `$${n.toLocaleString('es-CL')}` : ''}
      onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
      placeholder={placeholder}
      className={className}
    />
  )
}
