-- ============================================================
-- MIGRACIÓN 021 — Nuevo rol: gestor_admision
-- Gestor de Admisión y Vinculación (matrícula, familias, cobros)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar el constraint antiguo de rol y crear uno nuevo que incluya gestor_admision
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'gestor_admision', 'tutor', 'apoderado', 'alumno'));
