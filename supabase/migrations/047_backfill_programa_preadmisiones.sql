-- ============================================================
-- MIGRACIÓN 047 — Backfill programa_id en pre_admisiones
-- Hasta ahora programa_id no se poblaba al crear la pre-admisión,
-- lo que impedía a los coordinadores filtrar admisiones por su programa.
-- Se deriva el programa desde el texto de curso_solicitado.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  ar_id uuid;
  play_id uuid;
  lions_id uuid;
  worship_id uuid;
BEGIN
  SELECT id INTO ar_id      FROM public.programas WHERE codigo = 'ar_school';
  SELECT id INTO play_id    FROM public.programas WHERE codigo = 'play_group';
  SELECT id INTO lions_id   FROM public.programas WHERE codigo = 'lions_soccer';
  SELECT id INTO worship_id FROM public.programas WHERE codigo = 'ar_worship';

  -- Lions Soccer
  UPDATE public.pre_admisiones SET programa_id = lions_id
  WHERE programa_id IS NULL AND (curso_solicitado ILIKE '%lions%' OR curso_solicitado ILIKE '%soccer%');

  -- AR Worship / Music and Play
  UPDATE public.pre_admisiones SET programa_id = worship_id
  WHERE programa_id IS NULL AND (curso_solicitado ILIKE '%worship%' OR curso_solicitado ILIKE '%music%');

  -- Play Group / Pre School
  UPDATE public.pre_admisiones SET programa_id = play_id
  WHERE programa_id IS NULL AND (curso_solicitado ILIKE '%play%' OR curso_solicitado ILIKE '%pre school%');

  -- El resto → AR School
  UPDATE public.pre_admisiones SET programa_id = ar_id
  WHERE programa_id IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_admisiones_programa ON public.pre_admisiones(programa_id, estado);
