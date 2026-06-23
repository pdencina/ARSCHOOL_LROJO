-- ============================================================
-- MIGRACIÓN 005 — Onboarding de familias por código de invitación
-- Permite que apoderados se vinculen solos sin intervención admin
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla de códigos de invitación
CREATE TABLE IF NOT EXISTS public.invitaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id   uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  codigo      text NOT NULL UNIQUE,
  parentesco  text DEFAULT 'apoderado',
  usado       boolean NOT NULL DEFAULT false,
  usado_por   uuid REFERENCES public.usuarios(id),
  usado_at    timestamptz,
  expira_at   timestamptz DEFAULT (now() + interval '30 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

-- Admin puede ver/crear invitaciones de su colegio
CREATE POLICY "colegio: all invitaciones" ON public.invitaciones
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

-- Cualquier usuario autenticado puede leer su invitación por código
CREATE POLICY "public: select invitacion por codigo" ON public.invitaciones
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_invitaciones_codigo ON public.invitaciones(codigo);
CREATE INDEX IF NOT EXISTS idx_invitaciones_colegio ON public.invitaciones(colegio_id);
