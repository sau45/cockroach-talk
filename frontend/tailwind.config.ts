import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        foreground: '#EDEDED',
        card: {
          DEFAULT: '#1B1B1B',
          foreground: '#EDEDED'
        },
        popover: {
          DEFAULT: '#1B1B1B',
          foreground: '#EDEDED'
        },
        primary: {
          DEFAULT: '#9F75FF',
          foreground: '#111111'
        },
        secondary: {
          DEFAULT: '#27272A',
          foreground: '#EDEDED'
        },
        muted: {
          DEFAULT: '#27272A',
          foreground: '#A1A1AA'
        },
        accent: {
          DEFAULT: '#9F75FF',
          foreground: '#111111',
          coral: '#FF6B6B',
          gold: '#FCD34D'
        },
        destructive: {
          DEFAULT: '#FF6B6B',
          foreground: '#FFFFFF'
        },
        border: '#3F3F46',
        input: '#27272A',
        ring: '#9F75FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'brutal-sm': '3px 3px 0px #9F75FF',
        'brutal': '4px 4px 0px #9F75FF',
        'brutal-lg': '6px 6px 0px #9F75FF',
        'brutal-dark': '4px 4px 0px #3F3F46',
        'brutal-coral': '4px 4px 0px #FF6B6B',
        'brutal-dark-sm': '2px 2px 0px #3F3F46',
      },
      borderRadius: {
        'brutal-sm': '4px',
        'brutal-md': '6px',
        'brutal-lg': '8px',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
