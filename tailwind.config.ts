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
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        lora: ['Lora', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        rojo: {
          DEFAULT: '#C0392B',
          medio: '#E74C3C',
          claro: '#FADBD8',
          oscuro: '#922B21',
        },
        azul: {
          DEFAULT: '#1A5276',
          medio: '#2980B9',
          claro: '#D6EAF8',
          oscuro: '#154360',
        },
        verde: {
          DEFAULT: '#1E8449',
          claro: '#D5F5E3',
          oscuro: '#145A32',
        },
        amarillo: {
          DEFAULT: '#D4AC0D',
          claro: '#FEF9E7',
        },
        naranja: {
          DEFAULT: '#CA6F1E',
          claro: '#FDEBD0',
        },
        crema: '#FDFBF7',
        papel: '#F5F1E8',
        tinta: '#1C1C1C',
        'tinta-s': '#4A4A4A',
      },
    },
  },
  plugins: [],
}
export default config
