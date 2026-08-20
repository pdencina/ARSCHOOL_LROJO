-- ============================================================
-- MIGRACIÓN 039 — Rol Coordinador
-- Para coordinadores de programa (Lions Soccer, AR Worship, etc.)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Actualizar constraint de roles para incluir coordinador
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador', 'tutor', 'apoderado', 'alumno'));

-- Actualizar constraint en permisos_rol
ALTER TABLE public.permisos_rol DROP CONSTRAINT IF EXISTS permisos_rol_rol_check;
ALTER TABLE public.permisos_rol ADD CONSTRAINT permisos_rol_rol_check
  CHECK (rol IN ('admin', 'pastor_campus', 'gestor_admision', 'coordinador', 'tutor', 'apoderado', 'alumno'));
