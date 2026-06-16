/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Clean slate/gray palette
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Teal accent
        accent: {
          50: 'var(--color-accent-50, #f0fdfa)',
          100: 'var(--color-accent-100, #ccfbf1)',
          200: 'var(--color-accent-200, #99f6e4)',
          300: 'var(--color-accent-300, #5eead4)',
          400: 'var(--color-accent-400, #2dd4bf)',
          500: 'var(--color-accent-500, #14b8a6)',
          600: 'var(--color-accent-600, #108474)',
          700: 'var(--color-accent-700, #0f766e)',
          800: 'var(--color-accent-800, #115e59)',
          900: 'var(--color-accent-900, #134e4a)',
          950: 'var(--color-accent-950, #042f2e)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'extra-wide': '0.2em',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
