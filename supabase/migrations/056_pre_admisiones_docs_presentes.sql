-- ============================================================
-- MIGRACIÓN 056 — Lista liviana de documentos presentes
--
-- Los documentos de una solicitud se guardan en pre_admisiones.documentos
-- (jsonb con las imágenes/PDF en base64). Las listas de Admisiones y de
-- Matrícula solo necesitan saber QUÉ documentos están, pero hasta ahora
-- descargaban el contenido completo de todas las solicitudes.
--
-- Esta migración agrega docs_presentes: columna calculada (se mantiene
-- sola en cada insert/update) con los nombres de los documentos que tienen
-- contenido. Las listas leen esta columna; el detalle sigue trayendo los
-- documentos completos.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.docs_presentes(d jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN d IS NULL OR jsonb_typeof(d) <> 'object' THEN '{}'::text[]
    ELSE COALESCE(
      (SELECT array_agg(e.key ORDER BY e.key)
       FROM jsonb_each_text(d) AS e
       WHERE COALESCE(e.value, '') <> ''),
      '{}'::text[])
  END
$$;

ALTER TABLE public.pre_admisiones
  ADD COLUMN IF NOT EXISTS docs_presentes text[]
  GENERATED ALWAYS AS (public.docs_presentes(documentos)) STORED;

-- Verificación:
-- SELECT codigo_seguimiento, docs_presentes FROM public.pre_admisiones ORDER BY created_at DESC LIMIT 10;
