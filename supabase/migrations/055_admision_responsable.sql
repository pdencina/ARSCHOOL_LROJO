-- ============================================================
-- MIGRACIÓN 055 — Responsable asignado a cada solicitud de admisión
--
-- Permite asignar una solicitud a una persona del equipo de la sede
-- (admin, pastor_campus, gestor_admision o coordinador) para saber quién
-- está a cargo del caso. Se usa en la bandeja con el filtro "Mías".
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.pre_admisiones ADD COLUMN IF NOT EXISTS asignado_a uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pre_admisiones_asignado_a_fkey') THEN
    ALTER TABLE public.pre_admisiones
      ADD CONSTRAINT pre_admisiones_asignado_a_fkey
      FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_admisiones_asignado ON public.pre_admisiones(asignado_a);
