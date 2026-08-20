-- ============================================================
-- MIGRACIÓN 040 — Módulo de Control de Ingreso y Retiro
-- Rol: Tutor Supervisor
-- Registra llegadas, atrasos, retiros anticipados y firma digital
-- ============================================================

-- =====================
-- 1. AGREGAR ROL tutor_supervisor
-- =====================
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'pastor_campus', 'gestor_admision', 'coordinador', 'tutor_supervisor', 'tutor', 'apoderado', 'alumno'));

ALTER TABLE public.permisos_rol DROP CONSTRAINT IF EXISTS permisos_rol_rol_check;
ALTER TABLE public.permisos_rol ADD CONSTRAINT permisos_rol_rol_check
  CHECK (rol IN ('admin', 'pastor_campus', 'gestor_admision', 'coordinador', 'tutor_supervisor', 'tutor', 'apoderado', 'alumno'));

-- =====================
-- 2. TABLA DE REGISTROS DE INGRESO/RETIRO
-- =====================
CREATE TABLE IF NOT EXISTS public.registros_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Tipo de registro
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'retiro')),
  
  -- Horarios
  hora_registro time NOT NULL DEFAULT LOCALTIME,
  hora_esperada time, -- Hora que debía llegar/salir según jornada
  
  -- Clasificación
  es_atraso boolean DEFAULT false,
  es_anticipado boolean DEFAULT false, -- retiro antes de hora
  minutos_diferencia integer DEFAULT 0, -- +5 = 5 min tarde, -30 = 30 min antes
  
  -- Justificación
  justificado boolean DEFAULT false,
  motivo text,
  
  -- Persona que retira (solo para tipo='retiro')
  persona_retiro_nombre text,
  persona_retiro_rut text,
  persona_retiro_parentesco text,
  es_autorizada boolean DEFAULT true, -- ¿está en la lista de autorizados?
  
  -- Firma digital del retiro (FES)
  firma_retiro text, -- Nombre completo como firma
  firma_retiro_at timestamptz,
  
  -- Auditoría
  registrado_por uuid REFERENCES public.usuarios(id),
  observaciones text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.registros_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: all registros_control" ON public.registros_control
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.registros_control TO authenticated;
GRANT ALL ON public.registros_control TO service_role;

CREATE INDEX IF NOT EXISTS idx_registros_control_fecha ON public.registros_control(colegio_id, fecha, tipo);
CREATE INDEX IF NOT EXISTS idx_registros_control_alumno ON public.registros_control(alumno_id, fecha);

-- =====================
-- 3. TABLA DE PERSONAS AUTORIZADAS PARA RETIRO
-- (complementa la que ya existe en matricula)
-- =====================
CREATE TABLE IF NOT EXISTS public.personas_retiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rut text,
  parentesco text,
  telefono text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.personas_retiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service: all personas_retiro" ON public.personas_retiro FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.personas_retiro TO authenticated;
GRANT ALL ON public.personas_retiro TO service_role;

CREATE INDEX IF NOT EXISTS idx_personas_retiro_alumno ON public.personas_retiro(alumno_id) WHERE activo = true;
