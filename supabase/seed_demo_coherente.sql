-- ============================================================
-- SEED: Demo coherente para AR School — Colegio Santiago exitoso
-- 
-- Este seed genera datos consistentes entre módulos:
-- - 30 alumnos (del seed base) con datos interrelacionados
-- - Asistencias: ~93% promedio (colegio exitoso)
-- - Evaluaciones y calificaciones: promedio 5.8
-- - Cobranza: 88% recaudación (buen pago)
-- 
-- Colegio Santiago: 11111111-1111-1111-1111-111111111111
-- Prerequisito: Ejecutar DESPUÉS de seed_data_pruebas.sql
-- ============================================================

-- =====================
-- 1. ASISTENCIAS — Marzo a Julio 2026 (días hábiles)
-- Promedio objetivo: 93% presente, 3% atrasado, 2% justificado, 2% ausente
-- =====================

DO $$
DECLARE
  alumno RECORD;
  dia date;
  dia_semana int;
  estado_asis text;
  prob float;
BEGIN
  FOR alumno IN
    SELECT id FROM public.alumnos
    WHERE colegio_id = '11111111-1111-1111-1111-111111111111'
      AND activo = true
      AND id::text LIKE 'a0000001%'
    LIMIT 30
  LOOP
    dia := '2026-03-02'::date;
    WHILE dia <= '2026-07-25' LOOP
      dia_semana := EXTRACT(DOW FROM dia);
      -- Solo días hábiles (lun-vie)
      IF dia_semana BETWEEN 1 AND 5 THEN
        prob := random();
        IF prob < 0.93 THEN
          estado_asis := 'presente';
        ELSIF prob < 0.96 THEN
          estado_asis := 'tardanza';
        ELSIF prob < 0.98 THEN
          estado_asis := 'justificado';
        ELSE
          estado_asis := 'ausente';
        END IF;

        -- Solo insertar si no existe ya un registro para ese alumno/fecha
        IF NOT EXISTS (
          SELECT 1 FROM public.asistencias
          WHERE alumno_id = alumno.id AND fecha = dia
        ) THEN
          INSERT INTO public.asistencias (colegio_id, alumno_id, fecha, estado)
          VALUES (
            '11111111-1111-1111-1111-111111111111',
            alumno.id, dia, estado_asis
          );
        END IF;
      END IF;
      dia := dia + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================
-- 2. EVALUACIONES — 3 evaluaciones por materia por curso (Marzo-Julio 2026)
-- =====================
INSERT INTO public.evaluaciones (id, colegio_id, nombre, descripcion, materia, curso, fecha, ponderacion) VALUES
  -- Elementary 1
  ('ee000001-0001-4001-a001-000000000001', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U1', 'Comprensión lectora', 'Lenguaje', 'Elementary 1 (Ciclo 1)', '2026-04-10', 30),
  ('ee000001-0001-4001-a001-000000000002', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U2', 'Escritura creativa', 'Lenguaje', 'Elementary 1 (Ciclo 1)', '2026-05-22', 30),
  ('ee000001-0001-4001-a001-000000000003', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U3', 'Lectura comprensiva', 'Lenguaje', 'Elementary 1 (Ciclo 1)', '2026-07-03', 40),
  ('ee000001-0001-4001-a001-000000000004', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U1', 'Números y operaciones', 'Matemáticas', 'Elementary 1 (Ciclo 1)', '2026-04-15', 30),
  ('ee000001-0001-4001-a001-000000000005', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U2', 'Geometría básica', 'Matemáticas', 'Elementary 1 (Ciclo 1)', '2026-05-28', 30),
  ('ee000001-0001-4001-a001-000000000006', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U3', 'Resolución problemas', 'Matemáticas', 'Elementary 1 (Ciclo 1)', '2026-07-08', 40),
  ('ee000001-0001-4001-a001-000000000007', '11111111-1111-1111-1111-111111111111', 'Prueba Ciencias U1', 'Seres vivos', 'Ciencias', 'Elementary 1 (Ciclo 1)', '2026-04-22', 30),
  ('ee000001-0001-4001-a001-000000000008', '11111111-1111-1111-1111-111111111111', 'Prueba Ciencias U2', 'Medio ambiente', 'Ciencias', 'Elementary 1 (Ciclo 1)', '2026-06-05', 35),
  ('ee000001-0001-4001-a001-000000000009', '11111111-1111-1111-1111-111111111111', 'Prueba Ciencias U3', 'Materiales y energía', 'Ciencias', 'Elementary 1 (Ciclo 1)', '2026-07-10', 35),
  -- Elementary 3
  ('ee000001-0001-4001-a001-000000000010', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U1', 'Textos narrativos', 'Lenguaje', 'Elementary 3 (Ciclo 3)', '2026-04-08', 30),
  ('ee000001-0001-4001-a001-000000000011', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U2', 'Gramática y ortografía', 'Lenguaje', 'Elementary 3 (Ciclo 3)', '2026-05-20', 30),
  ('ee000001-0001-4001-a001-000000000012', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U3', 'Producción textual', 'Lenguaje', 'Elementary 3 (Ciclo 3)', '2026-07-01', 40),
  ('ee000001-0001-4001-a001-000000000013', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U1', 'Fracciones', 'Matemáticas', 'Elementary 3 (Ciclo 3)', '2026-04-14', 30),
  ('ee000001-0001-4001-a001-000000000014', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U2', 'Álgebra básica', 'Matemáticas', 'Elementary 3 (Ciclo 3)', '2026-05-26', 30),
  ('ee000001-0001-4001-a001-000000000015', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U3', 'Estadística', 'Matemáticas', 'Elementary 3 (Ciclo 3)', '2026-07-07', 40),
  -- Middle School 5
  ('ee000001-0001-4001-a001-000000000016', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U1', 'Análisis literario', 'Lenguaje', 'Middle School 5 (Ciclo 5)', '2026-04-09', 30),
  ('ee000001-0001-4001-a001-000000000017', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U2', 'Argumentación', 'Lenguaje', 'Middle School 5 (Ciclo 5)', '2026-05-21', 30),
  ('ee000001-0001-4001-a001-000000000018', '11111111-1111-1111-1111-111111111111', 'Prueba Lenguaje U3', 'Ensayo', 'Lenguaje', 'Middle School 5 (Ciclo 5)', '2026-07-02', 40),
  ('ee000001-0001-4001-a001-000000000019', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U1', 'Ecuaciones', 'Matemáticas', 'Middle School 5 (Ciclo 5)', '2026-04-16', 30),
  ('ee000001-0001-4001-a001-000000000020', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U2', 'Funciones', 'Matemáticas', 'Middle School 5 (Ciclo 5)', '2026-05-27', 30),
  ('ee000001-0001-4001-a001-000000000021', '11111111-1111-1111-1111-111111111111', 'Prueba Matemáticas U3', 'Geometría analítica', 'Matemáticas', 'Middle School 5 (Ciclo 5)', '2026-07-09', 40),
  ('ee000001-0001-4001-a001-000000000022', '11111111-1111-1111-1111-111111111111', 'Prueba Historia U1', 'Chile colonial', 'Historia', 'Middle School 5 (Ciclo 5)', '2026-04-23', 30),
  ('ee000001-0001-4001-a001-000000000023', '11111111-1111-1111-1111-111111111111', 'Prueba Historia U2', 'Independencia', 'Historia', 'Middle School 5 (Ciclo 5)', '2026-06-04', 35),
  ('ee000001-0001-4001-a001-000000000024', '11111111-1111-1111-1111-111111111111', 'Prueba Historia U3', 'Chile moderno', 'Historia', 'Middle School 5 (Ciclo 5)', '2026-07-11', 35)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 3. CALIFICACIONES — Notas para cada alumno en cada evaluación
-- Promedio objetivo: ~78% (colegio exitoso, distribución realista)
-- Escala: 0-100 (porcentaje de logro)
-- =====================
DO $$
DECLARE
  alumno RECORD;
  eval RECORD;
  nota_base float;
  nota_final float;
BEGIN
  -- Elementary 1: alumnos 07-14
  FOR alumno IN
    SELECT id FROM public.alumnos
    WHERE id::text LIKE 'a0000001-0001-0001-0001-0000000000%'
      AND id::text >= 'a0000001-0001-0001-0001-000000000007'
      AND id::text <= 'a0000001-0001-0001-0001-000000000014'
  LOOP
    FOR eval IN
      SELECT id FROM public.evaluaciones
      WHERE id::text >= 'ee000001-0001-4001-a001-000000000001'
        AND id::text <= 'ee000001-0001-4001-a001-000000000009'
    LOOP
      -- Generar nota centrada en 78 con desviación
      nota_base := 78 + (random() - 0.5) * 30;
      nota_final := GREATEST(35, LEAST(100, ROUND(nota_base::numeric, 1)));
      INSERT INTO public.calificaciones (colegio_id, evaluacion_id, alumno_id, nota)
      VALUES ('11111111-1111-1111-1111-111111111111', eval.id, alumno.id, nota_final)
      ON CONFLICT (evaluacion_id, alumno_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Elementary 3: alumnos 15-22
  FOR alumno IN
    SELECT id FROM public.alumnos
    WHERE id::text LIKE 'a0000001-0001-0001-0001-0000000000%'
      AND id::text >= 'a0000001-0001-0001-0001-000000000015'
      AND id::text <= 'a0000001-0001-0001-0001-000000000022'
  LOOP
    FOR eval IN
      SELECT id FROM public.evaluaciones
      WHERE id::text >= 'ee000001-0001-4001-a001-000000000010'
        AND id::text <= 'ee000001-0001-4001-a001-000000000015'
    LOOP
      nota_base := 76 + (random() - 0.5) * 34;
      nota_final := GREATEST(30, LEAST(100, ROUND(nota_base::numeric, 1)));
      INSERT INTO public.calificaciones (colegio_id, evaluacion_id, alumno_id, nota)
      VALUES ('11111111-1111-1111-1111-111111111111', eval.id, alumno.id, nota_final)
      ON CONFLICT (evaluacion_id, alumno_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- Middle School 5: alumnos 23-30
  FOR alumno IN
    SELECT id FROM public.alumnos
    WHERE id::text LIKE 'a0000001-0001-0001-0001-0000000000%'
      AND id::text >= 'a0000001-0001-0001-0001-000000000023'
      AND id::text <= 'a0000001-0001-0001-0001-000000000030'
  LOOP
    FOR eval IN
      SELECT id FROM public.evaluaciones
      WHERE id::text >= 'ee000001-0001-4001-a001-000000000016'
        AND id::text <= 'ee000001-0001-4001-a001-000000000024'
    LOOP
      nota_base := 74 + (random() - 0.5) * 36;
      nota_final := GREATEST(28, LEAST(100, ROUND(nota_base::numeric, 1)));
      INSERT INTO public.calificaciones (colegio_id, evaluacion_id, alumno_id, nota)
      VALUES ('11111111-1111-1111-1111-111111111111', eval.id, alumno.id, nota_final)
      ON CONFLICT (evaluacion_id, alumno_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================
-- 4. FAMILIAS para los 30 alumnos base (si no existen)
-- =====================
INSERT INTO public.familias (id, colegio_id, alumno_id, nombre_apoderado, apellido_apoderado, email, telefono) VALUES
  ('af000001-0001-4001-a001-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000001', 'Andrea', 'González', 'andrea.gonzalez@email.com', '+56 9 8100 0001'),
  ('af000001-0001-4001-a001-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000002', 'Ricardo', 'Rodríguez', 'ricardo.rodriguez@email.com', '+56 9 8100 0002'),
  ('af000001-0001-4001-a001-000000000003', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000003', 'Luisa', 'Martínez', 'luisa.martinez@email.com', '+58 414 100 0003'),
  ('af000001-0001-4001-a001-000000000004', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000004', 'Miguel', 'López', 'miguel.lopez@email.com', '+56 9 8100 0004'),
  ('af000001-0001-4001-a001-000000000005', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000005', 'Diana', 'Hernández', 'diana.hernandez@email.com', '+57 310 100 0005'),
  ('af000001-0001-4001-a001-000000000006', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000006', 'Claudio', 'Díaz', 'claudio.diaz@email.com', '+56 9 8100 0006'),
  ('af000001-0001-4001-a001-000000000007', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000007', 'María José', 'Torres', 'mariajose.torres@email.com', '+56 9 8100 0007'),
  ('af000001-0001-4001-a001-000000000008', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000008', 'Eduardo', 'Vargas', 'eduardo.vargas@email.com', '+56 9 8100 0008'),
  ('af000001-0001-4001-a001-000000000009', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000009', 'Yaneth', 'Muñoz', 'yaneth.munoz@email.com', '+58 424 100 0009'),
  ('af000001-0001-4001-a001-000000000010', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000010', 'Héctor', 'Rojas', 'hector.rojas@email.com', '+56 9 8100 0010'),
  ('af000001-0001-4001-a001-000000000011', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000011', 'Carmen', 'Soto', 'carmen.soto@email.com', '+51 999 100 011'),
  ('af000001-0001-4001-a001-000000000012', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000012', 'Gonzalo', 'Peña', 'gonzalo.pena@email.com', '+56 9 8100 0012'),
  ('af000001-0001-4001-a001-000000000013', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000013', 'Sandra', 'Riquelme', 'sandra.riquelme@email.com', '+56 9 8100 0013'),
  ('af000001-0001-4001-a001-000000000014', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000014', 'José', 'Fuentes', 'jose.fuentes@email.com', '+58 412 100 014'),
  ('af000001-0001-4001-a001-000000000015', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000015', 'Paula', 'Contreras', 'paula.contreras@email.com', '+56 9 8100 0015'),
  ('af000001-0001-4001-a001-000000000016', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000016', 'Rodrigo', 'Araya', 'rodrigo.araya@email.com', '+56 9 8100 0016'),
  ('af000001-0001-4001-a001-000000000017', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000017', 'Silvia', 'Bravo', 'silvia.bravo@email.com', '+54 911 100 017'),
  ('af000001-0001-4001-a001-000000000018', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000018', 'Alberto', 'Castro', 'alberto.castro@email.com', '+56 9 8100 0018'),
  ('af000001-0001-4001-a001-000000000019', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000019', 'Mariela', 'Vega', 'mariela.vega@email.com', '+58 414 100 019'),
  ('af000001-0001-4001-a001-000000000020', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000020', 'Cristián', 'Espinoza', 'cristian.espinoza@email.com', '+56 9 8100 0020'),
  ('af000001-0001-4001-a001-000000000021', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000021', 'Teresa', 'Paredes', 'teresa.paredes@email.com', '+56 9 8100 0021'),
  ('af000001-0001-4001-a001-000000000022', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000022', 'Marco', 'Gutiérrez', 'marco.gutierrez@email.com', '+51 999 100 022'),
  ('af000001-0001-4001-a001-000000000023', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000023', 'Isabel', 'Olivares', 'isabel.olivares@email.com', '+56 9 8100 0023'),
  ('af000001-0001-4001-a001-000000000024', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000024', 'Francisco', 'Morales', 'francisco.morales@email.com', '+56 9 8100 0024'),
  ('af000001-0001-4001-a001-000000000025', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000025', 'Adriana', 'Figueroa', 'adriana.figueroa@email.com', '+58 416 100 025'),
  ('af000001-0001-4001-a001-000000000026', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000026', 'Patricio', 'Reyes', 'patricio.reyes@email.com', '+56 9 8100 0026'),
  ('af000001-0001-4001-a001-000000000027', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000027', 'Rosa', 'Salazar', 'rosa.salazar@email.com', '+57 320 100 027'),
  ('af000001-0001-4001-a001-000000000028', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000028', 'Sergio', 'Pizarro', 'sergio.pizarro@email.com', '+56 9 8100 0028'),
  ('af000001-0001-4001-a001-000000000029', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000029', 'Lorena', 'Medina', 'lorena.medina@email.com', '+56 9 8100 0029'),
  ('af000001-0001-4001-a001-000000000030', '11111111-1111-1111-1111-111111111111', 'a0000001-0001-0001-0001-000000000030', 'Ramón', 'Carrasco', 'ramon.carrasco@email.com', '+58 412 100 030')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 5. COBROS COHERENTES — 30 alumnos base, Mar-Dic 2026
-- Recaudación objetivo: 88% (26 de 30 al día, 4 con atraso)
-- Montos: PreSchool $260.000, Elementary $275.000, Middle $290.000
-- Los mismos alumnos que tienen buena asistencia pagan bien (coherencia)
-- =====================
DO $$
DECLARE
  alumno RECORD;
  mes_i integer;
  monto_mensual integer;
  estado_cobro text;
  es_buen_pagador boolean;
  numero_cuota integer;
  fecha_pago_val date;
  familia_id_val uuid;
BEGIN
  FOR alumno IN
    SELECT a.id as alumno_id, a.nivel, a.curso,
           f.id as familia_id
    FROM public.alumnos a
    JOIN public.familias f ON f.alumno_id = a.id
    WHERE a.colegio_id = '11111111-1111-1111-1111-111111111111'
      AND a.activo = true
      AND a.id::text LIKE 'a0000001%'
    LIMIT 30
  LOOP
    -- Determinar monto según nivel
    IF alumno.nivel = 'PreSchool' THEN
      monto_mensual := 260000;
    ELSIF alumno.nivel = 'Elementary' THEN
      monto_mensual := 275000;
    ELSE
      monto_mensual := 290000;
    END IF;

    -- 88% son buenos pagadores (26 de 30)
    es_buen_pagador := random() < 0.88;

    FOR mes_i IN 3..12 LOOP
      numero_cuota := mes_i - 2;

      IF mes_i <= 7 THEN
        -- Meses pasados (mar-jul 2026)
        IF es_buen_pagador THEN
          estado_cobro := 'pagado';
          fecha_pago_val := ('2026-' || LPAD(mes_i::text, 2, '0') || '-' || (2 + floor(random()*6)::int)::text)::date;
        ELSE
          -- Morosos: pagan con atraso o no pagan
          IF random() < 0.5 THEN
            estado_cobro := 'pagado'; -- pagó tarde
            fecha_pago_val := ('2026-' || LPAD(mes_i::text, 2, '0') || '-' || (15 + floor(random()*10)::int)::text)::date;
          ELSE
            estado_cobro := 'mora';
            fecha_pago_val := NULL;
          END IF;
        END IF;
      ELSIF mes_i = 8 THEN
        -- Agosto: mes actual
        IF es_buen_pagador AND random() < 0.6 THEN
          estado_cobro := 'pagado';
          fecha_pago_val := '2026-08-04';
        ELSE
          estado_cobro := 'pendiente';
          fecha_pago_val := NULL;
        END IF;
      ELSE
        -- Sep-Dic: futuro
        estado_cobro := 'pendiente';
        fecha_pago_val := NULL;
      END IF;

      INSERT INTO public.cobros (
        colegio_id, familia_id, alumno_id,
        monto, monto_pagado, mes, anio, fecha_vencimiento,
        estado, medio_pago, fecha_pago, numero_cuota, tipo_concepto
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        alumno.familia_id,
        alumno.alumno_id,
        monto_mensual,
        CASE WHEN estado_cobro = 'pagado' THEN monto_mensual ELSE 0 END,
        mes_i, 2026,
        ('2026-' || LPAD(mes_i::text, 2, '0') || '-05')::date,
        estado_cobro,
        CASE WHEN estado_cobro = 'pagado' THEN 'transferencia' ELSE NULL END,
        fecha_pago_val,
        numero_cuota,
        'aporte_mensual'
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================
-- 6. RESUMEN DE MÉTRICAS ESPERADAS (para validar en dashboard)
-- =====================
-- Alumnos activos: 30
-- Asistencia promedio (mar-jul): ~93%
-- Notas promedio: ~78% (escala 0-100)
-- Recaudación acumulada (mar-jul): ~88% 
-- Cobros pagados: ~132 de 150 cuotas vencidas
-- Cobros en mora: ~12-18 cuotas
-- Ingreso mensual promedio: ~$8.1M CLP (30 alumnos × $270K promedio)
--
-- COHERENCIA ENTRE MÓDULOS:
-- - Los mismos 30 alumnos aparecen en asistencias, calificaciones y cobranza
-- - Buenos alumnos (buena asistencia) → buenas notas → pagos al día
-- - 4 familias con mora identificables para gestión de cobranza
-- - Números de KPI del dashboard coinciden entre módulos
-- ============================================================
