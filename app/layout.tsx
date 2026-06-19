import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'AR School — Gestión Educacional',
    template: '%s | AR School',
  },
  description: 'Sistema integral de gestión escolar: comunicados, asistencias, calificaciones y cobranzas.',
  keywords: ['gestión escolar', 'AR School', 'plataforma educacional', 'colegio'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a2332',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="antialiased">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
