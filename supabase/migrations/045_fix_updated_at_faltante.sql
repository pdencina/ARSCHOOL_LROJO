-- ============================================================
-- MIGRACIÓN 045 — Corrige columna updated_at faltante
-- Varias tablas tienen el trigger set_updated_at() que ejecuta
-- "new.updated_at = now()", pero les faltaba la columna updated_at.
-- Eso hacía fallar TODO UPDATE sobre esas tablas con el error:
--   record "new" has no field "updated_at"
-- (rompía editar familias/correo, marcar cobros como pagados, etc.)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.cobros   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.fichas   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Columna de auditoría faltante en pagos (quién registró el pago).
-- La usa el flujo unificado /api/pagos.
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS registrado_por uuid REFERENCES public.usuarios(id);

-- Verificación: no debe quedar ninguna tabla con el trigger pero sin la columna.
-- SELECT c.relname AS tabla
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND NOT t.tgisinternal
--   AND t.tgfoid = 'public.set_updated_at'::regproc
--   AND NOT EXISTS (
--     SELECT 1 FROM information_schema.columns col
--     WHERE col.table_schema = 'public'
--       AND col.table_name = c.relname
--       AND col.column_name = 'updated_at'
--   );
