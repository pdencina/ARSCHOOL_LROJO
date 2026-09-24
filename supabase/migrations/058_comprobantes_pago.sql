-- ============================================================
-- MIGRACIÓN 058 — Comprobantes (vouchers) por cuota del contrato
--
-- Permite que el gestor de admisión / administración adjunte el voucher de
-- cada cuota cobrada según el contrato (AR School, Play Group, Lions, Worship:
-- cada uno con su cantidad de meses).
--
-- 1) Bucket PRIVADO 'comprobantes' en Storage (los vouchers tienen datos
--    bancarios: se ven solo con enlaces temporales firmados por el servidor).
-- 2) Tabla cobro_comprobantes: un registro por archivo, ligado a la cuota
--    (cobro) y, si con él se registró el pago, al pago correspondiente.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1) Bucket privado (máx. 5 MB por archivo; imágenes y PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes', 'comprobantes', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Comprobantes por cuota
CREATE TABLE IF NOT EXISTS public.cobro_comprobantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id uuid NOT NULL REFERENCES public.cobros(id) ON DELETE CASCADE,
  pago_id uuid REFERENCES public.pagos(id) ON DELETE SET NULL, -- NULL = solo respaldo (cuota ya pagada)
  colegio_id uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE,
  archivo_path text NOT NULL,          -- ruta dentro del bucket 'comprobantes'
  nombre_archivo text,
  tipo_mime text,
  monto integer,                       -- monto que respalda el voucher
  medio_pago text,
  fecha_pago date,
  nota text,
  subido_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobro_comprobantes_cobro ON public.cobro_comprobantes(cobro_id);
CREATE INDEX IF NOT EXISTS idx_cobro_comprobantes_alumno ON public.cobro_comprobantes(alumno_id);

-- 3) Los vouchers que suben los apoderados desde el portal viven en pagos.referencia
--    (imagen base64). Columna liviana para saber si un pago tiene imagen sin descargarla.
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS tiene_comprobante boolean
  GENERATED ALWAYS AS (COALESCE(referencia LIKE 'data:%' OR referencia LIKE 'http%', false)) STORED;

ALTER TABLE public.cobro_comprobantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colegio: select cobro_comprobantes" ON public.cobro_comprobantes;
CREATE POLICY "colegio: select cobro_comprobantes" ON public.cobro_comprobantes
  FOR SELECT USING (colegio_id = public.mi_colegio_id());
GRANT SELECT ON public.cobro_comprobantes TO authenticated;
GRANT ALL ON public.cobro_comprobantes TO service_role;
