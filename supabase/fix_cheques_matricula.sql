-- Agregar campos de cheque a la tabla matriculas
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS cheques text[]; -- array de números de cheque
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS banco_cheque text;

COMMENT ON COLUMN public.matriculas.cheques IS 'Array con números de cheque por cada cuota mensual';
COMMENT ON COLUMN public.matriculas.banco_cheque IS 'Nombre del banco emisor de los cheques';
