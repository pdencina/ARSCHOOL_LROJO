-- ============================================================
-- MIGRACIÓN 011 — Firma digital en contratos
-- Guarda la firma del apoderado como imagen base64
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS firma_apoderado text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS firmado_at timestamptz;
