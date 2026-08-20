-- ============================================================
-- MIGRACIÓN 042 — Ficha del alumno mejorada + Notas/Bitácora
-- Para coordinadores: foto, notas de seguimiento, dificultades
-- ============================================================

-- =====================
-- 1. CAMPOS ADICIONALES EN ALUMNOS
-- =====================
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS dificultades_aprendizaje text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS condiciones_especiales text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS notas_coordinador text;

-- =====================
-- 2. TABLA DE BITÁCORA / NOTAS DE SEGUIMIENTO
-- =====================
CREATE TABLE IF NOT EXISTS public.notas_alumno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  programa_id uuid REFERENCES public.programas(id),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  -- Contenido
  tipo text DEFAULT 'general' CHECK (tipo IN ('general', 'conducta', 'rendimiento', 'salud', 'apoderado', 'logro')),
  titulo text,
  contenido text NOT NULL,
  -- Metadata
  registrado_por uuid REFERENCES public.usuarios(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notas_alumno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colegio: all notas_alumno" ON public.notas_alumno
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());
GRANT ALL ON public.notas_alumno TO authenticated;
GRANT ALL ON public.notas_alumno TO service_role;

CREATE INDEX IF NOT EXISTS idx_notas_alumno_alumno ON public.notas_alumno(alumno_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notas_alumno_programa ON public.notas_alumno(programa_id);

-- =====================
-- 3. CONDICIONES COMERCIALES EN MATRÍCULA
-- =====================
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS condiciones_comerciales text;

COMMENT ON COLUMN public.matriculas.condiciones_comerciales IS 'Condiciones especiales: matrícula gratis, días adaptación, descuentos, acuerdos especiales';
