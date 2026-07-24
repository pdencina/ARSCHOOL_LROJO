-- ============================================================
-- MIGRACIÓN 030 — Soporte Webpay Plus en pagos
-- Agrega estado y metadata a la tabla pagos para tracking de transacciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'confirmado'
  CHECK (estado IN ('pendiente', 'confirmado', 'rechazado', 'anulado'));
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.pagos.estado IS 'pendiente: transacción iniciada en Webpay | confirmado: pago exitoso | rechazado: rechazado por banco | anulado: reversado';
COMMENT ON COLUMN public.pagos.metadata IS 'Datos de la transacción Webpay: authorization_code, card_number, response_code, etc.';
