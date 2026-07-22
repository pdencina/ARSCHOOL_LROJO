-- ============================================================
-- VERIFICADOR DE MIGRACIONES 022-028
-- Ejecutar en Supabase SQL Editor para saber qué falta
-- ============================================================

SELECT '=== VERIFICACIÓN DE MIGRACIONES ===' AS info;

-- =====================
-- MIGRACIÓN 021: Rol gestor_admision
-- =====================
SELECT '--- 021: Rol gestor_admision ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'usuarios_rol_check' 
    AND check_clause LIKE '%gestor_admision%'
  ) THEN '✓ OK: gestor_admision existe en constraint usuarios' 
  ELSE '✗ FALTA: gestor_admision no está en el constraint de roles' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM public.permisos_rol WHERE rol = 'gestor_admision' LIMIT 1
  ) THEN '✓ OK: permisos de gestor_admision existen' 
  ELSE '✗ FALTA: permisos de gestor_admision no insertados' END AS estado;

-- =====================
-- MIGRACIÓN 022: Firma descentralizada
-- =====================
SELECT '--- 022: Firma descentralizada ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'gestionado_por'
  ) THEN '✓ OK: columna gestionado_por existe' 
  ELSE '✗ FALTA: columna gestionado_por en matriculas' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'sede_firma'
  ) THEN '✓ OK: columna sede_firma existe' 
  ELSE '✗ FALTA: columna sede_firma en matriculas' END AS estado;

-- =====================
-- MIGRACIÓN 023: Priorización medio de pago
-- =====================
SELECT '--- 023: Priorización medio de pago ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'medio_pago_matricula'
  ) THEN '✓ OK: columna medio_pago_matricula existe' 
  ELSE '✗ FALTA: columna medio_pago_matricula en matriculas' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'descuento_contado'
  ) THEN '✓ OK: columna descuento_contado existe' 
  ELSE '✗ FALTA: columna descuento_contado en matriculas' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'monto_mensual_final'
  ) THEN '✓ OK: columna monto_mensual_final existe' 
  ELSE '✗ FALTA: columna monto_mensual_final en matriculas' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matriculas' AND column_name = 'pagare_confirmado'
  ) THEN '✓ OK: columna pagare_confirmado existe' 
  ELSE '✗ FALTA: columna pagare_confirmado en matriculas' END AS estado;

-- =====================
-- MIGRACIÓN 024: SLA mensajes
-- =====================
SELECT '--- 024: SLA mensajes ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversaciones' AND column_name = 'pendiente_respuesta'
  ) THEN '✓ OK: columna pendiente_respuesta existe' 
  ELSE '✗ FALTA: columna pendiente_respuesta en conversaciones' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversaciones' AND column_name = 'ultimo_mensaje_familia_at'
  ) THEN '✓ OK: columna ultimo_mensaje_familia_at existe' 
  ELSE '✗ FALTA: columna ultimo_mensaje_familia_at en conversaciones' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sla_respuestas'
  ) THEN '✓ OK: tabla sla_respuestas existe' 
  ELSE '✗ FALTA: tabla sla_respuestas' END AS estado;

-- =====================
-- MIGRACIÓN 025: Rol pastor_campus
-- =====================
SELECT '--- 025: Rol pastor_campus ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'usuarios_rol_check' 
    AND check_clause LIKE '%pastor_campus%'
  ) THEN '✓ OK: pastor_campus existe en constraint usuarios' 
  ELSE '✗ FALTA: pastor_campus no está en el constraint de roles' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'permisos_rol_rol_check' 
    AND check_clause LIKE '%pastor_campus%'
  ) THEN '✓ OK: pastor_campus en constraint permisos_rol' 
  ELSE '✗ FALTA: pastor_campus no está en constraint de permisos_rol (ejecutar fix primero)' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM public.permisos_rol WHERE rol = 'pastor_campus' LIMIT 1
  ) THEN '✓ OK: permisos de pastor_campus existen' 
  ELSE '✗ FALTA: permisos de pastor_campus no insertados' END AS estado;

-- =====================
-- MIGRACIÓN 026: Aportes 2027 finales
-- =====================
SELECT '--- 026: Aportes 2027 ---' AS migracion;
SELECT 
  CASE WHEN (SELECT count(*) FROM public.tabla_aportes WHERE anio = 2027) >= 12
  THEN '✓ OK: tabla_aportes tiene ' || (SELECT count(*) FROM public.tabla_aportes WHERE anio = 2027) || ' registros 2027'
  ELSE '✗ FALTA: tabla_aportes 2027 tiene solo ' || (SELECT count(*) FROM public.tabla_aportes WHERE anio = 2027) || ' registros (necesita 21)' END AS estado;

-- Verificar montos específicos
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM public.tabla_aportes 
    WHERE anio = 2027 AND nivel = 'Playgroup' AND sede = 'puente_alto' AND tipo = 'inicial' AND monto = 64000
  ) THEN '✓ OK: monto Playgroup inicial Puente Alto = $64.000'
  ELSE '✗ FALTA o INCORRECTO: monto Playgroup inicial Puente Alto 2027' END AS estado;

-- =====================
-- MIGRACIÓN 027: Campos ficha ingreso
-- =====================
SELECT '--- 027: Campos ficha ingreso ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alumnos' AND column_name = 'pais_natal'
  ) THEN '✓ OK: columna pais_natal existe' 
  ELSE '✗ FALTA: columna pais_natal en alumnos' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alumnos' AND column_name = 'alergia_alimentaria'
  ) THEN '✓ OK: columna alergia_alimentaria existe' 
  ELSE '✗ FALTA: columna alergia_alimentaria en alumnos' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alumnos' AND column_name = 'diagnostico'
  ) THEN '✓ OK: columna diagnostico existe' 
  ELSE '✗ FALTA: columna diagnostico en alumnos' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'personas_retiro'
  ) THEN '✓ OK: tabla personas_retiro existe' 
  ELSE '✗ FALTA: tabla personas_retiro' END AS estado;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'familias' AND column_name = 'nombre_padre'
  ) THEN '✓ OK: columna nombre_padre en familias existe' 
  ELSE '✗ FALTA: columna nombre_padre en familias' END AS estado;

-- =====================
-- MIGRACIÓN 028: Módulo de becas
-- =====================
SELECT '--- 028: Módulo de becas ---' AS migracion;
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'becas'
  ) THEN '✓ OK: tabla becas existe' 
  ELSE '✗ FALTA: tabla becas' END AS estado;

-- =====================
-- RESUMEN FINAL
-- =====================
SELECT '=== RESUMEN ===' AS info;
SELECT 
  'Tablas principales: ' || 
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') || ' tablas' AS resumen;
