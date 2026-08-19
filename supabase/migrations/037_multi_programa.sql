-- ============================================================
-- MIGRACIÓN 037 — Multi-programa
-- 
-- Agrega soporte para múltiples programas dentro de la
-- Fundación ARM Global: AR School, Play and Group, 
-- Lions Soccer School, AR Worship School
--
-- Cada programa tiene su propio contrato, aportes, y responsable
-- ============================================================

-- =====================
-- 1. TABLA DE PROGRAMAS
-- =====================
CREATE TABLE IF NOT EXISTS public.programas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE, -- 'ar_school', 'play_group', 'lions_soccer', 'ar_worship'
  nombre text NOT NULL,
  nombre_corto text,
  descripcion text,
  color text, -- color de acento para UI
  icono text, -- icono de tabler icons
  -- Responsable
  responsable_id uuid REFERENCES public.usuarios(id),
  -- Config
  tiene_contrato boolean DEFAULT true,
  tiene_pagare boolean DEFAULT true,
  tiene_asistencia boolean DEFAULT true,
  tiene_evaluaciones boolean DEFAULT false,
  meses_cobro_default integer DEFAULT 10,
  -- Metadata
  sitio_web text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.programas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public: select programas" ON public.programas FOR SELECT USING (true);
CREATE POLICY "service: all programas" ON public.programas FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT ON public.programas TO anon;
GRANT ALL ON public.programas TO authenticated;
GRANT ALL ON public.programas TO service_role;

-- =====================
-- 2. SEED: LOS 4 PROGRAMAS
-- =====================
INSERT INTO public.programas (codigo, nombre, nombre_corto, descripcion, color, icono, tiene_contrato, tiene_pagare, tiene_asistencia, tiene_evaluaciones, meses_cobro_default, sitio_web) VALUES
  ('ar_school', 'AR School', 'AR School', 'Centro educativo para niños/as y adolescentes de 6 a 17 años', '#1B3A5C', 'ti-school', true, true, true, true, 10, 'https://www.arschoolglobal.com'),
  ('play_group', 'Play and Group', 'Play & Group', 'Centro educativo para niños y niñas de 1 a 5 años', '#C45A1A', 'ti-mood-kid', true, true, true, false, 12, 'https://www.arschoolglobal.com'),
  ('lions_soccer', 'Lions Soccer School', 'Lions Soccer', 'Escuela de fútbol para niños/as y adolescentes', '#2D5A3F', 'ti-ball-football', true, true, true, false, 10, NULL),
  ('ar_worship', 'AR Worship School', 'AR Worship', 'Escuela de música para niños/as y adolescentes', '#6B4C9A', 'ti-music', true, true, true, false, 10, 'https://www.arworshipschool.com')
ON CONFLICT (codigo) DO NOTHING;

-- =====================
-- 3. AGREGAR programa_id A TABLAS EXISTENTES
-- =====================

-- Alumnos: un alumno puede estar en un programa principal
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.programas(id);

-- Matrículas: cada matrícula pertenece a un programa
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.programas(id);

-- Cobros: filtrar por programa
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.programas(id);

-- Tabla de aportes: montos por programa
ALTER TABLE public.tabla_aportes ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.programas(id);

-- Pre-admisiones: saber a qué programa postula
ALTER TABLE public.pre_admisiones ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.programas(id);

-- =====================
-- 4. INSCRIPCIONES MULTI-PROGRAMA
-- (Un alumno puede estar en AR School + Lions Soccer)
-- =====================
CREATE TABLE IF NOT EXISTS public.inscripciones_programa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  programa_id uuid NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  colegio_id uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  estado text DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'finalizada')),
  fecha_inscripcion date DEFAULT CURRENT_DATE,
  fecha_fin date,
  horario text, -- "Martes y Jueves 16:00-17:30"
  nivel text, -- "Sub-12", "Intermedio", etc.
  observaciones text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alumno_id, programa_id)
);

ALTER TABLE public.inscripciones_programa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colegio: all inscripciones_programa" ON public.inscripciones_programa
  FOR ALL USING (colegio_id = public.mi_colegio_id())
  WITH CHECK (colegio_id = public.mi_colegio_id());
GRANT ALL ON public.inscripciones_programa TO authenticated;
GRANT ALL ON public.inscripciones_programa TO service_role;

-- =====================
-- 5. ROL coordinador_programa
-- =====================
-- Agregar al check constraint de usuarios si existe
-- El coordinador solo ve su(s) programa(s) asignado(s)

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS programa_ids uuid[]; -- Array de programas asignados

COMMENT ON COLUMN public.usuarios.programa_ids IS 'Programas que este usuario puede gestionar. NULL = todos (super_admin). Para coordinadores: solo sus programas.';

-- =====================
-- 6. ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_alumnos_programa ON public.alumnos(programa_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_programa ON public.matriculas(programa_id);
CREATE INDEX IF NOT EXISTS idx_cobros_programa ON public.cobros(programa_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_programa_alumno ON public.inscripciones_programa(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_programa_programa ON public.inscripciones_programa(programa_id, estado);

-- =====================
-- 7. ACTUALIZAR DATOS EXISTENTES
-- Asignar programa AR School o Play a alumnos existentes
-- =====================
DO $$
DECLARE
  ar_id uuid;
  play_id uuid;
BEGIN
  SELECT id INTO ar_id FROM public.programas WHERE codigo = 'ar_school';
  SELECT id INTO play_id FROM public.programas WHERE codigo = 'play_group';
  
  -- Alumnos Play Group / Pre School → programa Play
  UPDATE public.alumnos SET programa_id = play_id 
  WHERE programa_id IS NULL 
    AND (curso ILIKE '%play%' OR curso ILIKE '%pre school%');
  
  -- El resto → AR School
  UPDATE public.alumnos SET programa_id = ar_id 
  WHERE programa_id IS NULL;
  
  -- Matrículas sin programa → asignar según alumno
  UPDATE public.matriculas m SET programa_id = a.programa_id
  FROM public.alumnos a WHERE m.alumno_id = a.id AND m.programa_id IS NULL;
END $$;
