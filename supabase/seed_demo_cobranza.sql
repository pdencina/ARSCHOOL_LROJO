-- ============================================================
-- SEED: Data realista para demo del Panel de Cobranza
-- 25 alumnos con cobros Mar-Dic 2026, distintos estados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- 1. ALUMNOS ADICIONALES (realistas, mezcla chileno/venezolano/colombiano)
-- =====================
INSERT INTO public.alumnos (id, colegio_id, nombre, apellido, rut, curso, nivel, fecha_nacimiento, sexo, activo, jornada, sede, pais_natal) VALUES
  ('d0000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Martín', 'Valenzuela', '24.111.222-3', 'Elementary 2 (Ciclo 2)', 'Elementary', '2018-04-12', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Gabriela', 'Mendoza', '24.222.333-4', 'Pre School (3-4 años)', 'PreSchool', '2022-08-05', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('d0000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Diego', 'Paredes', '24.333.444-5', 'Elementary 4 (Ciclo 4)', 'Elementary', '2016-02-28', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Antonella', 'Rivero', '24.444.555-6', 'Kinder (Ciclo 0)', 'Kinder', '2021-11-15', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('d0000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Samuel', 'Córdova', '24.555.666-7', 'Middle School 6 (Ciclo 6)', 'Middle School', '2014-07-20', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Luciana', 'Herrera', '24.666.777-8', 'Elementary 1 (Ciclo 1)', 'Elementary', '2019-09-03', 'femenino', true, 'completa', 'santiago', 'Colombia'),
  ('d0000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Matías', 'Cárdenas', '24.777.888-9', 'High School (1° Medio)', 'High School', '2012-01-18', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Isabella', 'Zambrano', '24.888.999-0', 'Play Group (2-3 años)', 'PreSchool', '2023-05-22', 'femenino', true, 'completa', 'santiago', 'Venezuela'),
  ('d0000001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'Joaquín', 'Sepúlveda', '24.999.000-1', 'Elementary 3 (Ciclo 3)', 'Elementary', '2017-12-07', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'Camila', 'Osorio', '25.000.111-2', 'Middle School 7 (Ciclo 7)', 'Middle School', '2013-06-14', 'femenino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', 'Sebastián', 'Rivas', '25.111.222-3', 'Elementary 2 (Ciclo 2)', 'Elementary', '2018-03-25', 'masculino', true, 'completa', 'santiago', 'Chile'),
  ('d0000001-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', 'Valentina', 'Colmenares', '25.222.333-4', 'Kinder (Ciclo 0)', 'Kinder', '2021-10-09', 'femenino', true, 'completa', 'santiago', 'Venezuela')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 2. FAMILIAS PARA LOS ALUMNOS
-- =====================
INSERT INTO public.familias (id, colegio_id, alumno_id, nombre_apoderado, apellido_apoderado, email, telefono) VALUES
  ('df000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000001', 'Carolina', 'Valenzuela', 'carolina.valenzuela@gmail.com', '+56 9 8765 4321'),
  ('df000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000002', 'María', 'Mendoza', 'maria.mendoza@gmail.com', '+58 412 345 6789'),
  ('df000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000003', 'Roberto', 'Paredes', 'roberto.paredes@gmail.com', '+56 9 1234 5678'),
  ('df000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000004', 'Ana', 'Rivero', 'ana.rivero@gmail.com', '+58 414 987 6543'),
  ('df000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000005', 'Jorge', 'Córdova', 'jorge.cordova@gmail.com', '+56 9 5555 1234'),
  ('df000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000006', 'Patricia', 'Herrera', 'patricia.herrera@gmail.com', '+57 310 123 4567'),
  ('df000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000007', 'Fernando', 'Cárdenas', 'fernando.cardenas@gmail.com', '+56 9 7777 8888'),
  ('df000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000008', 'Daniela', 'Zambrano', 'daniela.zambrano@gmail.com', '+58 424 111 2222'),
  ('df000001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000009', 'Andrés', 'Sepúlveda', 'andres.sepulveda@gmail.com', '+56 9 3333 4444'),
  ('df000001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000010', 'Marcela', 'Osorio', 'marcela.osorio@gmail.com', '+56 9 2222 1111'),
  ('df000001-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000011', 'Pedro', 'Rivas', 'pedro.rivas@gmail.com', '+56 9 6666 7777'),
  ('df000001-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', 'd0000001-0001-0001-0001-000000000012', 'Yulimar', 'Colmenares', 'yulimar.colmenares@gmail.com', '+58 416 333 4444')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 3. COBROS: Mar-Jul 2026 (meses ya pasados con distintos estados)
-- Monto: $275.000 para Elementary/Middle/High, $260.000 para Playgroup/Preschool
-- =====================

-- Función helper para generar cobros masivos
DO $$
DECLARE
  alumnos_data RECORD;
  mes_i integer;
  monto_mensual integer;
  estado_cobro text;
  dias_atraso_val integer;
  semaforo_val text;
  fecha_pago_val date;
  numero_cuota integer;
BEGIN
  FOR alumnos_data IN 
    SELECT a.id as alumno_id, a.curso, a.nivel, 
           f.id as familia_id
    FROM public.alumnos a
    JOIN public.familias f ON f.alumno_id = a.id
    WHERE a.colegio_id = '11111111-1111-1111-1111-111111111111'
    AND a.id::text LIKE 'd0000001%'
    AND a.activo = true
  LOOP
    -- Determinar monto según nivel
    IF alumnos_data.nivel IN ('PreSchool', 'Kinder') THEN
      monto_mensual := 260000;
    ELSE
      monto_mensual := 275000;
    END IF;

    -- Generar 10 cuotas (Mar-Dic 2026)
    FOR mes_i IN 3..12 LOOP
      numero_cuota := mes_i - 2; -- Cuota 1 = Marzo

      -- Determinar estado basado en el mes
      IF mes_i <= 5 THEN
        -- Mar-May: mayoría pagados, algunos en mora
        IF random() < 0.85 THEN
          estado_cobro := 'pagado';
          dias_atraso_val := 0;
          semaforo_val := 'verde';
          fecha_pago_val := ('2026-' || LPAD(mes_i::text, 2, '0') || '-' || (3 + floor(random()*5)::int)::text)::date;
        ELSE
          estado_cobro := 'mora';
          dias_atraso_val := 30 + floor(random()*60)::int;
          semaforo_val := 'rojo';
          fecha_pago_val := NULL;
        END IF;
      ELSIF mes_i = 6 THEN
        -- Junio: algunos pagados, algunos en mora
        IF random() < 0.75 THEN
          estado_cobro := 'pagado';
          dias_atraso_val := 0;
          semaforo_val := 'verde';
          fecha_pago_val := ('2026-06-' || (3 + floor(random()*7)::int)::text)::date;
        ELSE
          estado_cobro := 'mora';
          dias_atraso_val := 15 + floor(random()*30)::int;
          semaforo_val := 'rojo';
          fecha_pago_val := NULL;
        END IF;
      ELSIF mes_i = 7 THEN
        -- Julio: mezcla variada
        IF random() < 0.6 THEN
          estado_cobro := 'pagado';
          dias_atraso_val := 0;
          semaforo_val := 'verde';
          fecha_pago_val := ('2026-07-' || (3 + floor(random()*10)::int)::text)::date;
        ELSIF random() < 0.7 THEN
          estado_cobro := 'mora';
          dias_atraso_val := 5 + floor(random()*15)::int;
          semaforo_val := CASE WHEN dias_atraso_val > 15 THEN 'rojo' ELSE 'naranja' END;
          fecha_pago_val := NULL;
        ELSE
          estado_cobro := 'pendiente';
          dias_atraso_val := floor(random()*18)::int;
          semaforo_val := CASE WHEN dias_atraso_val > 15 THEN 'rojo' WHEN dias_atraso_val > 0 THEN 'naranja' ELSE 'amarillo' END;
          fecha_pago_val := NULL;
        END IF;
      ELSIF mes_i = 8 THEN
        -- Agosto: próximo a vencer o pendiente
        IF random() < 0.3 THEN
          estado_cobro := 'pagado';
          dias_atraso_val := 0;
          semaforo_val := 'verde';
          fecha_pago_val := '2026-08-03';
        ELSE
          estado_cobro := 'pendiente';
          dias_atraso_val := 0;
          semaforo_val := 'amarillo';
          fecha_pago_val := NULL;
        END IF;
      ELSE
        -- Sep-Dic: todos pendientes (futuro)
        estado_cobro := 'pendiente';
        dias_atraso_val := 0;
        semaforo_val := 'verde';
        fecha_pago_val := NULL;
      END IF;

      INSERT INTO public.cobros (
        colegio_id, familia_id, alumno_id, concepto_id,
        monto, monto_pagado, mes, anio, fecha_vencimiento,
        estado, medio_pago, fecha_pago,
        numero_cuota, dias_atraso, semaforo, tipo_concepto
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        alumnos_data.familia_id,
        alumnos_data.alumno_id,
        'c0000001-0001-0001-0001-000000000001',
        monto_mensual,
        CASE WHEN estado_cobro = 'pagado' THEN monto_mensual ELSE 0 END,
        mes_i,
        2026,
        ('2026-' || LPAD(mes_i::text, 2, '0') || '-05')::date,
        estado_cobro,
        CASE WHEN estado_cobro = 'pagado' THEN 'transferencia' ELSE NULL END,
        fecha_pago_val,
        numero_cuota,
        dias_atraso_val,
        semaforo_val,
        'aporte_mensual'
      );
    END LOOP;
  END LOOP;
END $$;
