-- ============================================================
-- MIGRACIÓN 019 — Campo visible_portal en fichas
-- Permite que tutores marquen fichas como visibles para apoderados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.fichas
  ADD COLUMN IF NOT EXISTS visible_portal boolean NOT NULL DEFAULT false;

-- También agregar pdf_url y pdf_nombre si no existen (usados por el modal de subida)
ALTER TABLE public.fichas
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS pdf_nombre text;
