-- ============================================================
-- MIGRACIÓN 029 — Asistencia por bloque/experiencia
-- Cambia de asistencia diaria a asistencia por bloque.
-- Cada tutor pasa asistencia en SU experiencia/bloque.
-- Un alumno puede tener múltiples registros por día.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Quitar constraint UNIQUE(alumno_id, fecha) que limita a 1 registro por día
ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_alumno_id_fecha_key;
DROP INDEX IF EXISTS idx_asistencias_alumno_fecha_unique;

-- 2. Agregar columnas de bloque/experiencia
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS experiencia_id uuid REFERENCES public.experiencias(id);
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS experiencia_nombre text;
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS bloque_horario text; -- "08:00 - 09:30"
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS grupo text; -- "Grupo A"

-- 3. Nuevo constraint: un alumno solo puede tener 1 registro por bloque por día
-- Si experiencia_id es NULL (asistencia legacy/general), permite solo 1 por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_asistencias_alumno_fecha_bloque
  ON public.asistencias (alumno_id, fecha, COALESCE(bloque_horario, 'general'));

-- 4. Índice para consultar por experiencia
CREATE INDEX IF NOT EXISTS idx_asistencias_experiencia ON public.asistencias(experiencia_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha_registrado ON public.asistencias(fecha, registrado_por);

COMMENT ON COLUMN public.asistencias.experiencia_id IS 'Experiencia/asignatura en la que se toma asistencia (NULL = asistencia general del día)';
COMMENT ON COLUMN public.asistencias.bloque_horario IS 'Bloque horario del día en que se toma asistencia. Ej: "08:00 - 09:30"';
COMMENT ON COLUMN public.asistencias.grupo IS 'Grupo del alumno al momento de tomar asistencia. Ej: "Grupo A"';
