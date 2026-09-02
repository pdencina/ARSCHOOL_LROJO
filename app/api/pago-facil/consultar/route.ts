import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Normaliza un RUT: quita puntos, guión y deja el dígito verificador en mayúscula
function limpiarRut(rut: string): string {
  return (rut || '').replace(/[.\-\s]/g, '').toUpperCase()
}

// POST /api/pago-facil/consultar — Público, sin login
// Recibe el RUT del alumno y devuelve sus cobros pendientes para pagar.
export async function POST(request: NextRequest) {
  const { rut } = await request.json()
  if (!rut || rut.trim().length < 3) {
    return NextResponse.json({ error: 'Ingresa un RUT válido' }, { status: 400 })
  }

  const admin = getAdmin()
  const rutLimpio = limpiarRut(rut)

  // Buscar alumnos cuyo RUT coincida (comparando sin puntos ni guión)
  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido, curso, rut')

  const alumno = (alumnos ?? []).find((a: any) => limpiarRut(a.rut || '') === rutLimpio)
  if (!alumno) {
    return NextResponse.json({ error: 'No encontramos un alumno con ese RUT. Verifica el número o contacta al colegio.' }, { status: 404 })
  }

  // Cobros pendientes / en mora / parciales de ese alumno
  const { data: cobros } = await admin
    .from('cobros')
    .select('id, monto, monto_pagado, estado, mes, anio, tipo_concepto, fecha_vencimiento')
    .eq('alumno_id', (alumno as any).id)
    .in('estado', ['pendiente', 'mora', 'parcial'])
    .order('anio', { ascending: true })
    .order('mes', { ascending: true })

  const items = (cobros ?? []).map((c: any) => ({
    id: c.id,
    concepto: c.tipo_concepto === 'aporte_inicial' ? 'Aporte inicial'
      : c.tipo_concepto === 'aporte_mensual' ? `Aporte mensual ${c.mes}/${c.anio}`
      : `Cobro ${c.mes}/${c.anio}`,
    pendiente: c.monto - (c.monto_pagado ?? 0),
    monto: c.monto,
    estado: c.estado,
    vencimiento: c.fecha_vencimiento,
  })).filter((i: any) => i.pendiente > 0)

  const totalPendiente = items.reduce((s: number, i: any) => s + i.pendiente, 0)

  return NextResponse.json({
    alumno: {
      nombre: `${(alumno as any).nombre} ${(alumno as any).apellido}`,
      curso: (alumno as any).curso,
    },
    items,
    totalPendiente,
  })
}
