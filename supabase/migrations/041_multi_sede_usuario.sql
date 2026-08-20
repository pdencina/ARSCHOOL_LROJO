-- ============================================================
-- MIGRACIÓN 041 — Multi-sede por usuario
-- Un coordinador puede gestionar múltiples sedes
-- ============================================================

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS sedes_ids uuid[];

COMMENT ON COLUMN public.usuarios.sedes_ids IS 'Sedes que este usuario puede gestionar. NULL = solo su colegio_id. Para coordinadores multi-sede.';
