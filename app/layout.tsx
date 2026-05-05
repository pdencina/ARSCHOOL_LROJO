import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Folio Verde — Plataforma Educacional',
  description: 'Sistema integral para colegios: fichas pedagógicas, gestión contable y comunicación con familias.',
  keywords: ['educación', 'colegio', 'fichas pedagógicas', 'gestión escolar', 'cobranzas'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
