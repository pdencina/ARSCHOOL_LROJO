-- ============================================================
-- MIGRACIÓN 050 — Modalidad del contrato (monto completo / matrícula 2x1)
--
-- Permite elegir qué contrato se genera y envía a firma:
--   'completo'      → matrícula y aporte completos
--   'hermanos_2x1'  → matrícula exenta por promoción de hermanos (2x1)
--
-- Se guarda en la matrícula para que el documento firmado sea consistente
-- cada vez que se vuelva a abrir.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS modalidad_contrato text DEFAULT 'completo';

COMMENT ON COLUMN public.matriculas.modalidad_contrato IS
  'completo: matrícula y aporte completos | hermanos_2x1: matrícula exenta por promoción 2x1 de hermanos';

-- Nota: no se marcan automáticamente las matrículas existentes.
-- Una matrícula en $0 puede ser un 2x1 real o simplemente no estar configurada,
-- así que la modalidad se elige explícitamente al generar/enviar el contrato.
