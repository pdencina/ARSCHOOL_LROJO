-- ============================================================
-- FIX: Unificar tabla de aportes — solo valores 2027
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar todos los registros 2026
DELETE FROM public.tabla_aportes WHERE anio = 2026;

-- Verificar que quedan los 2027
-- Si no hay datos 2027, insertar los correctos:
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto, tipo_ingreso) VALUES
  -- Iniciales 2027 (todas las sedes)
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'santiago', 90000, 'todos'),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 72000, 'todos'),
  ('Playgroup', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 90000, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'santiago', 140000, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'puente_alto', 117000, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'inicial', 2027, 'punta_arenas', 140000, 'todos'),
  -- Mensuales 2027 Santiago
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'santiago', 286000, 'todos'),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'santiago', 214500, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'santiago', 302500, 'todos'),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'santiago', 242000, 'todos'),
  -- Mensuales 2027 Puente Alto
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'puente_alto', 234000, 'todos'),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'puente_alto', 175500, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'puente_alto', 247500, 'todos'),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'puente_alto', 242000, 'todos'),
  -- Mensuales 2027 Punta Arenas
  ('Playgroup', 'presencial', 'completa', 'mensual', 2027, 'punta_arenas', 286000, 'todos'),
  ('Playgroup', 'presencial', 'media', 'mensual', 2027, 'punta_arenas', 214500, 'todos'),
  ('Preschool a High School', 'presencial', NULL, 'mensual', 2027, 'punta_arenas', 302500, 'todos'),
  ('Preschool a High School', 'online', NULL, 'mensual', 2027, 'punta_arenas', 242000, 'todos')
ON CONFLICT DO NOTHING;

-- Actualizar el año de búsqueda en el page de matrícula
-- (El código busca por new Date().getFullYear() que es 2026)
-- Solución: también insertar para 2026 con mismos valores 2027
INSERT INTO public.tabla_aportes (nivel, modalidad, jornada, tipo, anio, sede, monto, tipo_ingreso)
SELECT nivel, modalidad, jornada, tipo, 2026 as anio, sede, monto, tipo_ingreso
FROM public.tabla_aportes WHERE anio = 2027
ON CONFLICT DO NOTHING;
