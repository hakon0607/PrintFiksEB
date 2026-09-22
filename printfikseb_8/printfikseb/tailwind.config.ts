import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF5FF',
          100: '#DCE9FE',
          200: '#C1D8FD',
          300: '#96BDFB',
          400: '#6499F7',
          500: '#3D76F1',
          600: '#2559C7',
          700: '#1E47A3',
          800: '#1B3C85',
          900: '#18346D',
        },
        ink: {
          50: '#F6F7F9',
          100: '#ECEEF2',
          200: '#D6DAE2',
          300: '#B2B9C6',
          400: '#8891A2',
          500: '#697285',
          600: '#525A6B',
          700: '#3D4453',
          800: '#272C37',
          900: '#14171C',
          950: '#0C0E12',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,23,28,0.04), 0 8px 24px -12px rgba(20,23,28,0.15)',
        lift: '0 2px 4px rgba(20,23,28,0.04), 0 24px 48px -24px rgba(37,89,199,0.35)',
        glow: '0 0 0 1px rgba(37,89,199,0.12), 0 18px 40px -18px rgba(37,89,199,0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(30px,-24px,0) scale(1.08)' },
          '66%': { transform: 'translate3d(-24px,18px,0) scale(0.95)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'layer-print': {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        shimmer: 'shimmer 2.2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
