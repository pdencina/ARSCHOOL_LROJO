-- ============================================================
-- MIGRACIÓN 027 — Campos faltantes ficha de ingreso
-- Basado en: Formulario Ingreso PlayGroup + Formulario Ingreso ARS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- CAMPOS EN TABLA ALUMNOS
-- =====================

-- Identificación adicional
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS pais_natal text DEFAULT 'Chile';

-- Información de salud y emergencias
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS alergia_alimentaria text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS alergia_medicamento text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS enfermedad_cronica text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS centro_salud_emergencia text;

-- Antecedentes educativos
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS jardin_previo text; -- PlayGroup: ¿ha estado en otro jardín?
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS ultimo_anio_aprobado text; -- ARS: último año escolar aprobado
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS ha_reprobado boolean DEFAULT false;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS curso_reprobado text; -- cuál curso reprobó
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS diagnostico text; -- dificultad de aprendizaje o diagnóstico
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS contacto_especialista text; -- teléfono del especialista tratante

-- Modalidad de estudio
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS modalidad text DEFAULT 'presencial'
  CHECK (modalidad IN ('presencial', 'online'));

-- =====================
-- PERSONA AUTORIZADA PARA RETIRO (adicional a padres)
-- Puede haber más de una persona autorizada por alumno
-- =====================
CREATE TABLE IF NOT EXISTS public.personas_retiro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  parentesco  text,
  rut         text,
  telefono    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personas_retiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all personas_retiro" ON public.personas_retiro
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.alumnos a WHERE a.id = alumno_id AND a.colegio_id = public.mi_colegio_id())
  );

GRANT ALL ON public.personas_retiro TO authenticated;
GRANT ALL ON public.personas_retiro TO service_role;

CREATE INDEX IF NOT EXISTS idx_personas_retiro_alumno ON public.personas_retiro(alumno_id);

-- =====================
-- DATOS ADICIONALES DEL PADRE (separado de madre/apoderado principal)
-- En tabla familias: ya existe nombre_apoderado como principal.
-- Agregamos campos para el segundo padre/madre.
-- =====================
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS nombre_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS apellido_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS rut_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS telefono_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS email_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS direccion_padre text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS telefono_trabajo_apoderado text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS telefono_trabajo_padre text;
