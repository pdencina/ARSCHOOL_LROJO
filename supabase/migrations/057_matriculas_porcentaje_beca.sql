-- ============================================================
-- MIGRACIÓN 057 — Guardar el % de beca en la matrícula
--
-- El modal "Editar matrícula" y el contrato usan matriculas.porcentaje_beca,
-- pero la columna nunca se creó: la beca se aplicaba a los cobros al recalcular
-- y se perdía al volver a abrir el modal (volvía a 0). Un segundo guardado
-- recalculaba los cobros SIN la beca.
--
-- Convención: monto_mensual es el aporte ANTES de la beca; los cobros se generan
-- con monto_mensual × (1 − porcentaje_beca/100). Las matrículas antiguas quedan
-- con 0 % (su monto_mensual ya venía con el descuento aplicado), así que sus
-- montos no cambian.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS porcentaje_beca numeric NOT NULL DEFAULT 0;
