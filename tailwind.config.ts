import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:     ['Inter', 'system-ui', 'sans-serif'],
        display:  ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'monospace'],
        playfair: ['Space Grotesk', 'sans-serif'],
        lora:     ['Inter', 'sans-serif'],
      },
      colors: {
        rojo:    { DEFAULT: '#B91C1C', medio: '#DC2626', claro: '#FEE2E2', oscuro: '#7F1D1D' },
        azul:    { DEFAULT: '#1B4FD8', medio: '#3B6EF0', claro: '#EEF2FF', oscuro: '#1E3A8A' },
        verde:   { DEFAULT: '#2D5A3F', claro: '#D1FAE5', oscuro: '#065F46' },
        amarillo:{ DEFAULT: '#9A5B00', claro: '#FEF3C7' },
        naranja: { DEFAULT: '#C45A1A', claro: '#FED7AA' },
        crema:   '#F8FAFC',
        papel:   '#F1F5F9',
        tinta:   '#0F172A',
        'tinta-s': '#556270',
        /* Role-specific accent colors */
        'role-admin':     '#C45A1A',
        'role-pastor':    '#4A3080',
        'role-gestor':    '#1B3A5C',
        'role-tutor':     '#2D5A3F',
        'role-apoderado': '#3D7A94',
        'role-alumno':    '#6B4C9A',
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
}
export default config