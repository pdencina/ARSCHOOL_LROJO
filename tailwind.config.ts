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
        rojo:    { DEFAULT: '#EF4444', medio: '#F87171', claro: '#FEE2E2', oscuro: '#B91C1C' },
        azul:    { DEFAULT: '#1B4FD8', medio: '#3B6EF0', claro: '#EEF2FF', oscuro: '#1E3A8A' },
        verde:   { DEFAULT: '#10B981', claro: '#D1FAE5', oscuro: '#065F46' },
        amarillo:{ DEFAULT: '#F59E0B', claro: '#FEF3C7' },
        naranja: { DEFAULT: '#F97316', claro: '#FED7AA' },
        crema:   '#F8FAFC',
        papel:   '#F1F5F9',
        tinta:   '#0F172A',
        'tinta-s': '#64748B',
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