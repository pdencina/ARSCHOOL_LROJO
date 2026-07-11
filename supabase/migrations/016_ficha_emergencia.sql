-- ============================================================
-- MIGRACIÓN 016 — Campos médicos y de emergencia
-- Para la ficha de emergencia imprimible
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Datos médicos del alumno
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS grupo_sanguineo text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS alergias text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS medicamentos text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS condiciones_medicas text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS centro_salud text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS seguro_escolar text;

-- Segundo contacto de emergencia
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS contacto_emergencia_2 text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS telefono_emergencia_2 text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS parentesco_emergencia text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS parentesco_emergencia_2 text;

-- Autorizaciones
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS autoriza_traslado boolean DEFAULT true;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS autoriza_medicamentos boolean DEFAULT false;
