import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook de auto-guardado local para formularios largos.
 * Guarda el estado del formulario en localStorage cada `interval` ms.
 * Restaura el borrador al montar si existe uno guardado.
 * 
 * @param key - Clave única para identificar el formulario (ej: 'planificacion-nueva')
 * @param formData - Estado actual del formulario
 * @param setFormData - Setter del estado del formulario
 * @param options - { interval: ms, enabled: boolean }
 * @returns { hasDraft, clearDraft, lastSaved }
 */
export function useAutoSave<T extends Record<string, any>>(
  key: string,
  formData: T,
  setFormData: (data: T) => void,
  options?: { interval?: number; enabled?: boolean }
) {
  const { interval = 30000, enabled = true } = options ?? {}
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [restored, setRestored] = useState(false)
  const formRef = useRef(formData)
  formRef.current = formData

  const storageKey = `ar_draft_${key}`

  // Restaurar borrador al montar
  useEffect(() => {
    if (!enabled || restored) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.data && parsed.timestamp) {
          // Solo restaurar si el borrador tiene menos de 24 horas
          const age = Date.now() - parsed.timestamp
          if (age < 24 * 60 * 60 * 1000) {
            setHasDraft(true)
          }
        }
      }
    } catch { /* corrupt data, ignore */ }
    setRestored(true)
  }, [storageKey, enabled, restored])

  // Auto-guardar periódicamente
  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      const data = formRef.current
      // Solo guardar si hay contenido significativo
      const hasContent = Object.values(data).some(v => {
        if (typeof v === 'string') return v.trim().length > 0
        if (Array.isArray(v)) return v.some(item => typeof item === 'string' ? item.trim().length > 0 : !!item)
        return false
      })

      if (hasContent) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            data,
            timestamp: Date.now(),
          }))
          setLastSaved(new Date())
          setHasDraft(true)
        } catch { /* storage full, ignore */ }
      }
    }, interval)

    return () => clearInterval(timer)
  }, [storageKey, interval, enabled])

  // Restaurar borrador
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.data) {
          setFormData(parsed.data)
          setHasDraft(false)
        }
      }
    } catch { /* ignore */ }
  }, [storageKey, setFormData])

  // Descartar borrador
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setHasDraft(false)
    setLastSaved(null)
  }, [storageKey])

  return { hasDraft, lastSaved, restoreDraft, clearDraft }
}
