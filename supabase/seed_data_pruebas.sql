-- ============================================================
-- SEED: Data de pruebas para AR School
-- Crea tutores, alumnos, experiencias y horario
-- IMPORTANTE: Los tutores necesitan usuarios en auth.users
-- Ejecutar DESPUÉS de crear los usuarios con el endpoint /api/seed
-- Colegio Santiago: 11111111-1111-1111-1111-111111111111
-- ============================================================

-- =====================
-- EXPERIENCIAS DE APRENDIZAJE
-- =====================
INSERT INTO public.experiencias (id, colegio_id, nombre, tipo, duracion_min, requiere_espacio) VALUES
  ('e0000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Lenguaje y Comunicación', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Matemáticas', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Ciencias Naturales', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Historia y Cultura', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Inglés', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Deportes / Motricidad', 'academica', 90, 'patio'),
  ('e0000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Música / Arte', 'academica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Taller de Valores', 'valorica', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'Devocional / Espiritual', 'espiritual', 90, 'sala'),
  ('e0000001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'Tecnología', 'academica', 90, 'sala')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- ALUMNOS (30 alumnos distribuidos en 4 cursos)
-- =====================

-- Play Group (6 alumnos)
INSERT INTO public.alumnos (id, colegio_id, nombre, apellido, rut, curso, nivel, fecha_nacimiento, sexo, activo, jornada, sede, pais_natal) VALUES
  ('a0000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Sofía', 'González', '23.456.789-0', 'Play Group (2-3 años)', 'PreSchool', '2023-03-15', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Mateo', 'Rodríguez', '23.456.790-1', 'Play Group (2-3 años)', 'PreSchool', '2023-06-20', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Isabella', 'Martínez', '23.456.791-2', 'Play Group (2-3 años)', 'PreSchool', '2023-01-10', 'femenino', true, 'media', 'santiago', 'Venezuela'),
  ('a0000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Lucas', 'López', '23.456.792-3', 'Play Group (2-3 años)', 'PreSchool', '2023-08-05', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Valentina', 'Hernández', '23.456.793-4', 'Play Group (2-3 años)', 'PreSchool', '2023-04-22', 'femenino', true, 'media', 'santiago', 'Colombia'),
  ('a0000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Benjamín', 'Díaz', '23.456.794-5', 'Play Group (2-3 años)', 'PreSchool', '2023-11-30', 'masculino', true, 'completa', 'santiago', 'Chile'),

  -- Elementary 1 (8 alumnos)
  ('a0000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Emilia', 'Torres', '22.345.678-1', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-02-14', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Agustín', 'Vargas', '22.345.679-2', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-07-08', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'Catalina', 'Muñoz', '22.345.680-3', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-05-19', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('a0000001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'Tomás', 'Rojas', '22.345.681-4', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-09-25', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', 'Amanda', 'Soto', '22.345.682-5', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-12-03', 'femenino', true, 'completa', 'santiago', 'Perú'),
  ('a0000001-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', 'Daniel', 'Peña', '22.345.683-6', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-04-11', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000013', '11111111-1111-1111-1111-111111111111', 'Martina', 'Riquelme', '22.345.684-7', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-08-28', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000014', '11111111-1111-1111-1111-111111111111', 'Sebastián', 'Fuentes', '22.345.685-8', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-01-07', 'masculino', true, 'completa', 'santiago', 'Venezuela'),

  -- Elementary 3 (8 alumnos)
  ('a0000001-0001-0001-0001-000000000015', '11111111-1111-1111-1111-111111111111', 'Isidora', 'Contreras', '21.234.567-0', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-03-22', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000016', '11111111-1111-1111-1111-111111111111', 'Vicente', 'Araya', '21.234.568-1', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-06-14', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000017', '11111111-1111-1111-1111-111111111111', 'Florencia', 'Bravo', '21.234.569-2', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-10-01', 'femenino', true, 'completa', 'santiago', 'Argentina'),
  ('a0000001-0001-0001-0001-000000000018', '11111111-1111-1111-1111-111111111111', 'Maximiliano', 'Castro', '21.234.570-3', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-02-18', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000019', '11111111-1111-1111-1111-111111111111', 'Antonella', 'Vega', '21.234.571-4', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-07-30', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('a0000001-0001-0001-0001-000000000020', '11111111-1111-1111-1111-111111111111', 'Joaquín', 'Espinoza', '21.234.572-5', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-11-12', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000021', '11111111-1111-1111-1111-111111111111', 'Renata', 'Paredes', '21.234.573-6', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-05-05', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000022', '11111111-1111-1111-1111-111111111111', 'Nicolás', 'Gutiérrez', '21.234.574-7', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-09-20', 'masculino', true, 'completa', 'santiago', 'Perú'),

  -- Middle School 5 (8 alumnos)
  ('a0000001-0001-0001-0001-000000000023', '11111111-1111-1111-1111-111111111111', 'Francisca', 'Olivares', '20.123.456-0', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-04-10', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000024', '11111111-1111-1111-1111-111111111111', 'Ignacio', 'Morales', '20.123.457-1', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-08-23', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000025', '11111111-1111-1111-1111-111111111111', 'Camila', 'Figueroa', '20.123.458-2', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-01-17', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('a0000001-0001-0001-0001-000000000026', '11111111-1111-1111-1111-111111111111', 'Felipe', 'Reyes', '20.123.459-3', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-06-29', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000027', '11111111-1111-1111-1111-111111111111', 'Trinidad', 'Salazar', '20.123.460-4', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-12-08', 'femenino', true, 'completa', 'santiago', 'Colombia'),
  ('a0000001-0001-0001-0001-000000000028', '11111111-1111-1111-1111-111111111111', 'Cristóbal', 'Pizarro', '20.123.461-5', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-03-14', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000029', '11111111-1111-1111-1111-111111111111', 'Javiera', 'Medina', '20.123.462-6', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-10-25', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('a0000001-0001-0001-0001-000000000030', '11111111-1111-1111-1111-111111111111', 'Alonso', 'Carrasco', '20.123.463-7', 'Middle School 5 (Ciclo 5)', 'Middle School', '2015-07-02', 'masculino', true, 'completa', 'santiago', 'Venezuela')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- ESPACIOS
-- =====================
INSERT INTO public.espacios (id, colegio_id, nombre, capacidad, tipo, sede, activo) VALUES
  ('50000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Sala A', 15, 'sala', 'santiago', true),
  ('50000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Sala B', 15, 'sala', 'santiago', true),
  ('50000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Sala C', 12, 'sala', 'santiago', true),
  ('50000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Patio', 40, 'patio', 'santiago', true),
  ('50000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Biblioteca', 20, 'biblioteca', 'santiago', true)
ON CONFLICT (id) DO NOTHING;
