-- ============================================================
-- MIGRACIÓN 010 — Módulo de Matrícula
-- Proceso unificado que crea alumno + familia + cobros + acceso
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.matriculas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id      uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id       uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  familia_id      uuid REFERENCES public.familias(id),
  anio_escolar    integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  estado          text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pendiente','anulada','egresada')),
  fecha_matricula date NOT NULL DEFAULT CURRENT_DATE,
  monto_matricula integer DEFAULT 0,
  plan_cobro_id   uuid REFERENCES public.planes_cobro(id),
  observaciones   text,
  registrado_por  uuid REFERENCES public.usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, anio_escolar)
);

ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all matriculas" ON public.matriculas
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.matriculas TO authenticated;
GRANT ALL ON public.matriculas TO service_role;

CREATE INDEX IF NOT EXISTS idx_matriculas_colegio_anio ON public.matriculas(colegio_id, anio_escolar);
CREATE INDEX IF NOT EXISTS idx_matriculas_alumno ON public.matriculas(alumno_id);

DROP TRIGGER IF EXISTS tr_matriculas_updated_at ON public.matriculas;
CREATE TRIGGER tr_matriculas_updated_at BEFORE UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Agregar campo link_pago a cobros para SumUp/Transbank
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS link_pago text;
