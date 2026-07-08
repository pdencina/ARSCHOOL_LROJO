-- ============================================================
-- MIGRACIÓN 013 — Campos adicionales de admisión
-- Agrega campos del formulario de admisión a alumnos y familias
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Campos del alumno
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS sexo text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS prevision_salud text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS contacto_emergencia text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS telefono_emergencia text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS jornada text DEFAULT 'completa';
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS sede text;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS tipo_ingreso text DEFAULT 'nuevo';

-- Campos de familia (rut y dirección si no existen)
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS rut text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS direccion text;
ALTER TABLE public.familias ADD COLUMN IF NOT EXISTS comuna text;
