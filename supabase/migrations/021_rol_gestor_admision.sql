-- ============================================================
-- MIGRACIÓN 021 — Nuevo rol: gestor_admision
-- Gestor de Admisión y Vinculación (matrícula, familias, cobros)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar el constraint antiguo de rol y crear uno nuevo que incluya gestor_admision
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'gestor_admision', 'tutor', 'apoderado', 'alumno'));

-- =====================
-- PERMISOS DEL ROL gestor_admision
-- Acceso a: inicio, matrícula, alumnos, comunicados, mensajes, cobranzas, documentos, calendario
-- =====================
INSERT INTO public.permisos_rol (colegio_id, rol, modulo, habilitado) VALUES
  (NULL, 'gestor_admision', 'inicio', true),
  (NULL, 'gestor_admision', 'matricula', true),
  (NULL, 'gestor_admision', 'alumnos', true),
  (NULL, 'gestor_admision', 'comunicados', true),
  (NULL, 'gestor_admision', 'mensajes', true),
  (NULL, 'gestor_admision', 'cobranzas', true),
  (NULL, 'gestor_admision', 'documentos', true),
  (NULL, 'gestor_admision', 'calendario', true),
  -- Módulos deshabilitados para este rol
  (NULL, 'gestor_admision', 'planificacion', false),
  (NULL, 'gestor_admision', 'evaluaciones', false),
  (NULL, 'gestor_admision', 'libro_clases', false),
  (NULL, 'gestor_admision', 'reporte_diario', false),
  (NULL, 'gestor_admision', 'tareas', false),
  (NULL, 'gestor_admision', 'fichas', false),
  (NULL, 'gestor_admision', 'reportes', false)
ON CONFLICT (colegio_id, rol, modulo) DO NOTHING;