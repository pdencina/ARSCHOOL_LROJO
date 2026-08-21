-- ============================================================
-- MIGRACIÓN 044 — Tabla códigos de verificación para retiro
-- Almacena códigos temporales enviados al email del apoderado
-- para autorizar el retiro de alumnos del establecimiento
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.codigos_retiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_ids uuid[] NOT NULL,
  codigo text NOT NULL,
  codigo_expira_at timestamptz NOT NULL,
  intentos integer DEFAULT 0,
  email_destino text NOT NULL,
  persona_nombre text,
  persona_rut text,
  persona_parentesco text,
  registrado_por uuid REFERENCES public.usuarios(id),
  usado boolean DEFAULT false,
  usado_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.codigos_retiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service: all codigos_retiro" ON public.codigos_retiro
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.codigos_retiro TO authenticated;
GRANT ALL ON public.codigos_retiro TO service_role;

-- Índice para búsqueda rápida por colegio + alumnos
CREATE INDEX IF NOT EXISTS idx_codigos_retiro_colegio ON public.codigos_retiro(colegio_id, created_at DESC);

-- Limpiar códigos viejos (más de 1 hora) automáticamente con cron o manualmente
COMMENT ON TABLE public.codigos_retiro IS 'Códigos temporales de verificación por email para autorizar retiro de alumnos. Expiran en 10 minutos.';
