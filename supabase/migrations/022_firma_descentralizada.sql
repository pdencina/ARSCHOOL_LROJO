-- ============================================================
-- MIGRACIÓN 022 — Firma descentralizada por sede
-- Permite que gestores de campus firmen contratos localmente
-- sin depender de Santiago. Registra quién gestionó la firma.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Quién gestionó/supervisó la firma en representación del colegio
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS gestionado_por uuid REFERENCES public.usuarios(id);
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS sede_firma text;

-- El campo auditoria_contrato/auditoria_pagare (jsonb) ya existe.
-- A partir de ahora incluirá el objeto "representante_institucional" con:
--   { id, nombre, email, rol, sede }
-- No requiere migración de datos: los contratos anteriores simplemente no tendrán ese campo.

COMMENT ON COLUMN public.matriculas.gestionado_por IS 'Usuario (gestor/admin/pastor) que supervisó la firma del contrato en la sede';
COMMENT ON COLUMN public.matriculas.sede_firma IS 'Sede donde se realizó la firma: santiago, puente_alto, punta_arenas';
