-- ============================================================
-- MIGRACIÓN 028 — Módulo de Becas
-- Tipos: socioeconómica, especial (asignada por equipo directivo)
-- Vigencia: 1 año escolar, renovable por nueva postulación
-- Estados: postulada → en_revision → aprobada / rechazada → vigente → vencida
-- Basado en: Instructivo Becas 2027 AR School
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.becas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id        uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id         uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  familia_id        uuid REFERENCES public.familias(id),

  -- Tipo de beca
  tipo              text NOT NULL CHECK (tipo IN ('socioeconomica', 'especial')),

  -- Porcentaje de descuento en aporte mensual (excluye matrícula)
  porcentaje        numeric(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),

  -- Vigencia
  anio_escolar      integer NOT NULL,
  estado            text NOT NULL DEFAULT 'postulada'
                    CHECK (estado IN ('postulada', 'en_revision', 'aprobada', 'rechazada', 'vigente', 'vencida', 'revocada')),

  -- Fechas del proceso
  fecha_postulacion timestamptz NOT NULL DEFAULT now(),
  fecha_revision    timestamptz,
  fecha_resolucion  timestamptz,

  -- Quién aprueba/rechaza
  revisado_por      uuid REFERENCES public.usuarios(id),
  aprobado_por      uuid REFERENCES public.usuarios(id),

  -- Motivo (para rechazo o revocación)
  motivo_resolucion text,

  -- Observaciones y contexto
  observaciones     text,

  -- Documentos adjuntos (URLs de archivos en storage)
  documentos_adjuntos jsonb DEFAULT '[]'::jsonb,

  -- Puntaje de evaluación (según instructivo, cada documento tiene puntaje)
  puntaje_evaluacion numeric(5,2),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Una sola beca activa por alumno por año
  UNIQUE(alumno_id, anio_escolar)
);

ALTER TABLE public.becas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all becas" ON public.becas
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.becas TO authenticated;
GRANT ALL ON public.becas TO service_role;

CREATE INDEX IF NOT EXISTS idx_becas_colegio_anio ON public.becas(colegio_id, anio_escolar);
CREATE INDEX IF NOT EXISTS idx_becas_alumno ON public.becas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_becas_estado ON public.becas(estado);

DROP TRIGGER IF EXISTS tr_becas_updated_at ON public.becas;
CREATE TRIGGER tr_becas_updated_at BEFORE UPDATE ON public.becas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Motivos de pérdida de beca (para auditoría)
COMMENT ON COLUMN public.becas.estado IS 'postulada: enviada por apoderado | en_revision: comisión evaluando | aprobada: aceptada, pendiente de activar | rechazada: no otorgada | vigente: activa durante el año | vencida: terminó el año escolar | revocada: perdida por incumplimiento';
COMMENT ON COLUMN public.becas.tipo IS 'socioeconomica: por dificultades económicas (con documentación) | especial: asignada por equipo directivo de forma excepcional';
COMMENT ON COLUMN public.becas.porcentaje IS 'Porcentaje de descuento aplicable SOLO al aporte mensual. La matrícula se excluye siempre.';
