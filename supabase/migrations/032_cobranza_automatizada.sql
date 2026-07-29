-- ============================================================
-- MIGRACIÓN 032 — Módulo de Cobranza Automatizada
-- Campos para seguimiento de morosidad, plan de pagos,
-- alertas escalonadas y auditoría financiera
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- =====================
-- 1. MEJORAS A TABLA COBROS
-- =====================

-- Número de cuota dentro del plan de pagos
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS numero_cuota integer;

-- Días de atraso (calculado automáticamente por cron)
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS dias_atraso integer DEFAULT 0;

-- Semáforo de morosidad
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS semaforo text DEFAULT 'verde'
  CHECK (semaforo IN ('verde', 'amarillo', 'naranja', 'rojo'));

-- Fecha del último recordatorio enviado
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS ultimo_recordatorio_at timestamptz;

-- Cantidad de recordatorios enviados
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS recordatorios_enviados integer DEFAULT 0;

-- Tipo de concepto (para diferenciar matrícula vs mensualidad)
ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS tipo_concepto text
  CHECK (tipo_concepto IN ('aporte_inicial', 'aporte_mensual', 'otro'));

-- =====================
-- 2. ESTADOS DEL CONTRATO EN MATRÍCULAS
-- =====================
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS estado_contrato text DEFAULT 'borrador'
  CHECK (estado_contrato IN ('borrador', 'enviado', 'firmado', 'rechazado'));

ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS estado_pago_matricula text DEFAULT 'pendiente'
  CHECK (estado_pago_matricula IN ('pendiente', 'pagado', 'vencido'));

-- =====================
-- 3. MODALIDAD DE PAGO EN MATRÍCULA
-- =====================
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS modalidad_pago text DEFAULT 'mensual'
  CHECK (modalidad_pago IN ('anual', 'mensual'));

-- =====================
-- 4. LOG DE AUDITORÍA FINANCIERA
-- =====================
CREATE TABLE IF NOT EXISTS public.log_cobranza (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id      uuid NOT NULL REFERENCES public.colegios(id) ON DELETE CASCADE,
  cobro_id        uuid REFERENCES public.cobros(id) ON DELETE SET NULL,
  alumno_id       uuid REFERENCES public.alumnos(id) ON DELETE SET NULL,
  familia_id      uuid REFERENCES public.familias(id) ON DELETE SET NULL,
  tipo            text NOT NULL CHECK (tipo IN (
    'recordatorio_pre_vencimiento',
    'recordatorio_post_vencimiento',
    'pago_confirmado',
    'cobro_generado',
    'estado_actualizado',
    'alerta_admin',
    'contrato_firmado',
    'matricula_pagada'
  )),
  detalle         text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.log_cobranza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colegio: select log_cobranza" ON public.log_cobranza
  FOR SELECT USING (colegio_id = public.mi_colegio_id());

GRANT ALL ON public.log_cobranza TO authenticated;
GRANT ALL ON public.log_cobranza TO service_role;

CREATE INDEX IF NOT EXISTS idx_log_cobranza_colegio_fecha ON public.log_cobranza(colegio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_cobranza_cobro ON public.log_cobranza(cobro_id);
CREATE INDEX IF NOT EXISTS idx_log_cobranza_alumno ON public.log_cobranza(alumno_id);

-- =====================
-- 5. ÍNDICES PARA PERFORMANCE DE COBRANZA
-- =====================
CREATE INDEX IF NOT EXISTS idx_cobros_estado_vencimiento ON public.cobros(estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_cobros_semaforo ON public.cobros(colegio_id, semaforo);
CREATE INDEX IF NOT EXISTS idx_cobros_dias_atraso ON public.cobros(colegio_id, dias_atraso DESC) WHERE dias_atraso > 0;

-- =====================
-- 6. COMENTARIOS
-- =====================
COMMENT ON COLUMN public.cobros.semaforo IS 'verde: al día | amarillo: <5 días para vencer | naranja: 1-15 días atraso | rojo: >15 días atraso';
COMMENT ON COLUMN public.cobros.dias_atraso IS 'Calculado automáticamente por cron diario. 0 si está al día o pagado.';
COMMENT ON COLUMN public.cobros.numero_cuota IS 'Número secuencial de la cuota (1-10) dentro del plan de pagos anual';
COMMENT ON TABLE public.log_cobranza IS 'Registro de todas las acciones de cobranza: recordatorios enviados, pagos, cambios de estado';
