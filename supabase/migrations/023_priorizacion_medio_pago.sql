-- ============================================================
-- MIGRACIÓN 023 — Priorización de medio de pago + descuento contado
-- Política: 1° Transferencia/tarjeta (con descuento), 2° Cheques, 3° Pagaré (última opción)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Medio de pago elegido al momento de matricular
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS medio_pago_matricula text
  CHECK (medio_pago_matricula IN ('transferencia', 'tarjeta', 'cheque', 'pagare'));

-- Porcentaje de descuento aplicado por pago contado (ej: 5 = 5%)
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS descuento_contado numeric(5,2) DEFAULT 0;

-- Monto final después de aplicar descuento
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS monto_mensual_final integer;

-- Si eligió pagaré, registrar que se confirmó explícitamente
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS pagare_confirmado boolean DEFAULT false;

COMMENT ON COLUMN public.matriculas.medio_pago_matricula IS 'Medio de pago elegido: transferencia, tarjeta (con descuento), cheque, pagare (última opción)';
COMMENT ON COLUMN public.matriculas.descuento_contado IS 'Porcentaje de descuento por pago contado (transferencia/tarjeta). Ej: 5.00 = 5%';
COMMENT ON COLUMN public.matriculas.monto_mensual_final IS 'Monto mensual después de aplicar descuento por pago contado';
COMMENT ON COLUMN public.matriculas.pagare_confirmado IS 'True si el gestor confirmó explícitamente que se agotaron las opciones preferentes antes de usar pagaré';
