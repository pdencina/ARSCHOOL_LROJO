-- ============================================================
-- MIGRACIÓN 009 — Permisos configurables por rol
-- El super admin puede activar/desactivar módulos por rol desde la plataforma
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permisos_rol (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid REFERENCES public.colegios(id) ON DELETE CASCADE,  -- NULL = default global
  rol         text NOT NULL CHECK (rol IN ('admin','tutor','apoderado','alumno')),
  modulo      text NOT NULL,
  habilitado  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(colegio_id, rol, modulo)
);

ALTER TABLE public.permisos_rol ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: all permisos_rol" ON public.permisos_rol
  FOR ALL USING (true) WITH CHECK (true);

-- Insertar permisos default (globales, colegio_id = NULL)
INSERT INTO public.permisos_rol (colegio_id, rol, modulo, habilitado) VALUES
  -- Admin
  (NULL, 'admin', 'inicio', true),
  (NULL, 'admin', 'alumnos', true),
  (NULL, 'admin', 'asistencias', true),
  (NULL, 'admin', 'evaluaciones', true),
  (NULL, 'admin', 'comunicados', true),
  (NULL, 'admin', 'mensajes', true),
  (NULL, 'admin', 'reporte_diario', true),
  (NULL, 'admin', 'cobranzas', true),
  (NULL, 'admin', 'documentos', true),
  (NULL, 'admin', 'calendario', true),
  (NULL, 'admin', 'fichas', true),
  (NULL, 'admin', 'reportes', true),
  -- Tutor
  (NULL, 'tutor', 'inicio', true),
  (NULL, 'tutor', 'alumnos', true),
  (NULL, 'tutor', 'planificacion', true),
  (NULL, 'tutor', 'asistencias', true),
  (NULL, 'tutor', 'evaluaciones', true),
  (NULL, 'tutor', 'comunicados', true),
  (NULL, 'tutor', 'mensajes', true),
  (NULL, 'tutor', 'libro_clases', true),
  (NULL, 'tutor', 'reporte_diario', true),
  (NULL, 'tutor', 'documentos', true),
  (NULL, 'tutor', 'calendario', true),
  (NULL, 'tutor', 'fichas', true),
  (NULL, 'tutor', 'reportes', false),
  (NULL, 'tutor', 'cobranzas', false),
  -- Apoderado
  (NULL, 'apoderado', 'inicio', true),
  (NULL, 'apoderado', 'reporte_diario', true),
  (NULL, 'apoderado', 'mensajes', true),
  (NULL, 'apoderado', 'comunicados', true),
  (NULL, 'apoderado', 'asistencias', true),
  (NULL, 'apoderado', 'evaluaciones', true),
  (NULL, 'apoderado', 'pagos', true),
  (NULL, 'apoderado', 'perfil', true),
  -- Alumno
  (NULL, 'alumno', 'inicio', true),
  (NULL, 'alumno', 'evaluaciones', true),
  (NULL, 'alumno', 'asistencias', true),
  (NULL, 'alumno', 'tareas', true),
  (NULL, 'alumno', 'comunicados', true),
  (NULL, 'alumno', 'perfil', true)
ON CONFLICT (colegio_id, rol, modulo) DO NOTHING;

DROP TRIGGER IF EXISTS tr_permisos_rol_updated_at ON public.permisos_rol;
CREATE TRIGGER tr_permisos_rol_updated_at BEFORE UPDATE ON public.permisos_rol
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
