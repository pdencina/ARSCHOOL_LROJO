import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AR School — Plataforma Educacional',
  description: 'Sistema integral para AR School Global: comunicados, asistencias, calificaciones y cobranzas.',
  keywords: ['educación', 'AR School', 'gestión escolar', 'ARM Global'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}