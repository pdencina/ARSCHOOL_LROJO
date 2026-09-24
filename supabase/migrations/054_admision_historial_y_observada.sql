-- ============================================================
-- MIGRACIÓN 054 — Historial de solicitudes de admisión + estado "observada"
--
-- 1) Nuevo estado 'observada' en pre_admisiones: el equipo pidió una
--    corrección y se está esperando al apoderado (antes quedaba como
--    'en_revision', indistinguible de "la estamos revisando").
-- 2) Tabla pre_admision_eventos: registro de todo lo que pasa con cada
--    solicitud (envío, aprobación, corrección pedida/recibida, notas
--    internas, matrícula...), con quién y cuándo.
-- 3) Backfill: evento "enviada" para las solicitudes existentes y un
--    evento con la última revisión conocida.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1) Estado 'observada' (reemplaza el CHECK de estado, sea cual sea su nombre)
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.pre_admisiones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%estado%'
  LOOP
    EXECUTE format('ALTER TABLE public.pre_admisiones DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.pre_admisiones ADD CONSTRAINT pre_admisiones_estado_check
  CHECK (estado IN ('pendiente', 'en_revision', 'observada', 'aprobada', 'matriculada', 'rechazada', 'desistida'));

-- 2) Historial
CREATE TABLE IF NOT EXISTS public.pre_admision_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_admision_id uuid NOT NULL REFERENCES public.pre_admisiones(id) ON DELETE CASCADE,
  colegio_id uuid REFERENCES public.colegios(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL, -- NULL = apoderado / sistema
  accion text NOT NULL,           -- enviada, aprobada, rechazada, en_revision, observada, corregida, nota, matricula_iniciada, matriculada, desistida, matricula_eliminada
  estado_anterior text,
  estado_nuevo text,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_admision_eventos_pa ON public.pre_admision_eventos(pre_admision_id, created_at);

ALTER TABLE public.pre_admision_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colegio: select pre_admision_eventos" ON public.pre_admision_eventos;
CREATE POLICY "colegio: select pre_admision_eventos" ON public.pre_admision_eventos
  FOR SELECT USING (colegio_id = public.mi_colegio_id());
GRANT SELECT ON public.pre_admision_eventos TO authenticated;
GRANT ALL ON public.pre_admision_eventos TO service_role;

-- 3) Backfill (solo si la solicitud aún no tiene eventos)
INSERT INTO public.pre_admision_eventos (pre_admision_id, colegio_id, accion, estado_nuevo, comentario, created_at)
SELECT pa.id, pa.colegio_id, 'enviada', 'pendiente', NULL, pa.created_at
FROM public.pre_admisiones pa
WHERE NOT EXISTS (SELECT 1 FROM public.pre_admision_eventos e WHERE e.pre_admision_id = pa.id);

INSERT INTO public.pre_admision_eventos (pre_admision_id, colegio_id, usuario_id, accion, estado_nuevo, comentario, created_at)
SELECT pa.id, pa.colegio_id, pa.revisado_por, pa.estado, pa.estado,
       'Registro anterior al historial (última revisión conocida)', pa.revisado_at
FROM public.pre_admisiones pa
WHERE pa.revisado_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.pre_admision_eventos e WHERE e.pre_admision_id = pa.id AND e.accion <> 'enviada');
