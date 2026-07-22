-- ============================================================
-- MIGRACIÓN 025 — Nuevo rol: pastor_campus
-- Pastor de campus con acceso total a su sede (como admin)
-- Maneja: comercial, admisión, contratos, aportes, comunicados,
-- académico, reportes, redes sociales — todo dentro de su sede.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Actualizar constraint de roles para incluir pastor_campus
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'tutor', 'apoderado', 'alumno'));

-- Actualizar constraint de roles en permisos_rol para incluir pastor_campus
ALTER TABLE public.permisos_rol DROP CONSTRAINT IF EXISTS permisos_rol_rol_check;
ALTER TABLE public.permisos_rol ADD CONSTRAINT permisos_rol_rol_check
  CHECK (rol IN ('admin', 'pastor_campus', 'gestor_admision', 'tutor', 'apoderado', 'alumno'));

-- =====================
-- PERMISOS DEL ROL pastor_campus
-- Acceso a TODOS los módulos (igual que admin, pero scoped a su colegio_id)
-- =====================
INSERT INTO public.permisos_rol (colegio_id, rol, modulo, habilitado) VALUES
  (NULL, 'pastor_campus', 'inicio', true),
  (NULL, 'pastor_campus', 'matricula', true),
  (NULL, 'pastor_campus', 'alumnos', true),
  (NULL, 'pastor_campus', 'planificacion', true),
  (NULL, 'pastor_campus', 'asistencias', true),
  (NULL, 'pastor_campus', 'evaluaciones', true),
  (NULL, 'pastor_campus', 'comunicados', true),
  (NULL, 'pastor_campus', 'mensajes', true),
  (NULL, 'pastor_campus', 'libro_clases', true),
  (NULL, 'pastor_campus', 'reporte_diario', true),
  (NULL, 'pastor_campus', 'tareas', true),
  (NULL, 'pastor_campus', 'cobranzas', true),
  (NULL, 'pastor_campus', 'documentos', true),
  (NULL, 'pastor_campus', 'calendario', true),
  (NULL, 'pastor_campus', 'fichas', true),
  (NULL, 'pastor_campus', 'reportes', true)
ON CONFLICT (colegio_id, rol, modulo) DO NOTHING;
