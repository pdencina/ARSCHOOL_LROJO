'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MorosidadMes } from '@/types'

interface Props { data: MorosidadMes[] }

export default function MorosidadChart({ data }: Props) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-tinta-s">Sin datos</div>

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
        <XAxis dataKey="mes" tick={{ fontSize: 9, fontFamily: 'DM Mono', fill: '#4A4A4A' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fontFamily: 'DM Mono', fill: '#4A4A4A' }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [`${v}%`, 'Morosidad']}
          contentStyle={{ fontSize: 11, fontFamily: 'DM Mono', border: '1px solid #e5e7eb', borderRadius: 2 }}
        />
        <Bar dataKey="porcentaje" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.porcentaje > 15 ? '#C0392B' : d.porcentaje > 8 ? '#CA6F1E' : '#1E8449'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
