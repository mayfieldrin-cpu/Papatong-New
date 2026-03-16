import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Base dark surfaces
        bg:       '#0f0f0e',
        surface:  '#1a1a18',
        surface2: '#242422',
        surface3: '#2e2e2b',
        // Borders
        'border-subtle':  'rgba(255,255,255,0.06)',
        'border-default': 'rgba(255,255,255,0.12)',
        'border-strong':  'rgba(255,255,255,0.22)',
        // Text
        'text-primary':   '#f0f0ec',
        'text-secondary': '#9a9a94',
        'text-hint':      '#5a5a56',
        // Accent
        amber:     '#EF9F27',
        'amber-dim': '#412402',
        green:     '#1D9E75',
        red:       '#E24B4A',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}

export default config
