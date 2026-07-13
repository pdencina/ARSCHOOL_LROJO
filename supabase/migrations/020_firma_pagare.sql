-- ============================================================
-- MIGRACIÓN 020 — Firma digital del pagaré + auditoría legal
-- Agrega campos para firma del pagaré y registros de auditoría
-- para validez legal bajo Ley 19.799 (FES)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS firma_pagare text;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS firmado_pagare_at timestamptz;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS auditoria_contrato jsonb;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS auditoria_pagare jsonb;
