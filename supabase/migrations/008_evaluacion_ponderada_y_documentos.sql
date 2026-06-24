-- ============================================================
-- MIGRACIÓN 008 — Evaluación ponderada + Repositorio de documentos
-- Sprint 2b: Estructura de evaluación ampliada
-- Sprint 3: Repositorio de documentos (reemplazo de Drive)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- EVALUACIÓN PONDERADA
-- =====================

-- Unidades de aprendizaje (agrupan evaluaciones)
CREATE TABLE IF NOT EXISTS public.unidades_aprendizaje (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  materia     text NOT NULL,
  curso       text NOT NULL,
  periodo     text DEFAULT 'semestre_1' CHECK (periodo IN ('semestre_1','semestre_2','trimestre_1','trimestre_2','trimestre_3','anual')),
  activa      boolean NOT NULL DEFAULT true,
  creado_por  uuid REFERENCES public.usuarios(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Agregar ponderación y unidad a evaluaciones existentes
ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS unidad_id uuid REFERENCES public.unidades_aprendizaje(id),
  ADD COLUMN IF NOT EXISTS tipo_evaluacion text DEFAULT 'prueba' 
    CHECK (tipo_evaluacion IN ('prueba','trabajo','presentacion','participacion','tarea','proyecto','autoevaluacion')),
  ADD COLUMN IF NOT EXISTS peso integer DEFAULT 100 CHECK (peso >= 1 AND peso <= 100);

ALTER TABLE public.unidades_aprendizaje ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all unidades_aprendizaje" ON public.unidades_aprendizaje
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

CREATE INDEX IF NOT EXISTS idx_unidades_colegio_materia ON public.unidades_aprendizaje(colegio_id, materia, curso);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_unidad ON public.evaluaciones(unidad_id);

DROP TRIGGER IF EXISTS tr_unidades_aprendizaje_updated_at ON public.unidades_aprendizaje;
CREATE TRIGGER tr_unidades_aprendizaje_updated_at BEFORE UPDATE ON public.unidades_aprendizaje
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================
-- REPOSITORIO DE DOCUMENTOS
-- =====================

CREATE TABLE IF NOT EXISTS public.documentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descripcion text,
  categoria   text NOT NULL DEFAULT 'general' 
    CHECK (categoria IN ('institucional','planificacion','material','administrativo','protocolo','acta','otro')),
  materia     text,
  curso       text,
  archivo_url text,
  archivo_nombre text,
  archivo_tipo text,
  archivo_size integer,
  visible_para text[] DEFAULT ARRAY['admin','tutor'],  -- roles que pueden ver
  subido_por  uuid REFERENCES public.usuarios(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all documentos" ON public.documentos
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

CREATE INDEX IF NOT EXISTS idx_documentos_colegio_cat ON public.documentos(colegio_id, categoria);
CREATE INDEX IF NOT EXISTS idx_documentos_colegio_materia ON public.documentos(colegio_id, materia);

DROP TRIGGER IF EXISTS tr_documentos_updated_at ON public.documentos;
CREATE TRIGGER tr_documentos_updated_at BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================
-- LINKS EXTERNOS (Santillana, Cambridge, etc.)
-- =====================

CREATE TABLE IF NOT EXISTS public.recursos_externos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  url         text NOT NULL,
  descripcion text,
  icono       text,
  materia     text,
  curso       text,
  activo      boolean NOT NULL DEFAULT true,
  orden       integer DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recursos_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all recursos_externos" ON public.recursos_externos
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());
