-- ============================================================
-- MIGRACIÓN 048 — Permisos de módulos para el rol coordinador
--
-- La migración 039 creó el rol 'coordinador' pero nunca insertó
-- sus filas en permisos_rol. Como el Sidebar oculta cualquier ítem
-- cuyo módulo no esté habilitado, el coordinador solo veía Admisiones
-- y su programa. Aquí habilitamos los módulos que necesita para
-- gestionar su programa de punta a punta (matrícula, contratos, etc.).
--
-- Nota: se evita ON CONFLICT porque el índice UNIQUE incluye colegio_id
-- y en Postgres los NULL se consideran distintos entre sí.
--
-- Ejecutar en Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  mods text[] := ARRAY[
    'inicio',
    'matricula',    -- Matrículas + contratos + firma electrónica
    'alumnos',
    'asistencias',
    'comunicados',
    'mensajes',
    'cobranzas',    -- Aportes / Cobranza
    'documentos',
    'calendario',
    'fichas',
    'reportes',
    'lions_soccer',
    'ar_worship'
  ];
  m text;
BEGIN
  FOREACH m IN ARRAY mods LOOP
    -- Si ya existe (global), asegurarse de que esté habilitado
    UPDATE public.permisos_rol
      SET habilitado = true
      WHERE rol = 'coordinador' AND colegio_id IS NULL AND modulo = m;

    -- Si no existe, crearlo
    IF NOT EXISTS (
      SELECT 1 FROM public.permisos_rol
      WHERE rol = 'coordinador' AND colegio_id IS NULL AND modulo = m
    ) THEN
      INSERT INTO public.permisos_rol (colegio_id, rol, modulo, habilitado)
      VALUES (NULL, 'coordinador', m, true);
    END IF;
  END LOOP;
END $$;

-- Verificación:
-- SELECT modulo, habilitado FROM public.permisos_rol
-- WHERE rol = 'coordinador' AND colegio_id IS NULL ORDER BY modulo;
