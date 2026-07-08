-- ============================================================
-- MIGRACIÓN 012 — Agregar monto_mensual a matrículas
-- Para que el contrato pueda leer el monto real sin depender de cobros
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS monto_mensual integer DEFAULT 0;
