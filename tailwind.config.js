/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#faf8f2',
        ink: '#24334a',
        'ink-soft': '#30445f',
        muted: '#5e6d81',
        line: '#e8e5dc',
        grape: { DEFAULT: '#6a51c4', tint: '#eee9ff', deep: '#513a9e' },
        grass: { DEFAULT: '#1c7350', bright: '#35b779', tint: '#e4f5ec' },
        sun: { DEFAULT: '#f6c84a', tint: '#fff3cc', deep: '#7d5a0e' },
        mango: { DEFAULT: '#9a570f', tint: '#fff0dd' },
        coral: { DEFAULT: '#b83e37', tint: '#ffe8e5' },
        sky: { DEFAULT: '#1a7291', tint: '#e4f5fa' },
        stone: '#687384',
      },
      fontFamily: {
        sans: ['Nunito Variable', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.5rem', xl3: '2rem' },
      boxShadow: {
        card: '0 1px 2px rgba(36,51,74,0.04), 0 8px 24px -12px rgba(36,51,74,0.14)',
        float: '0 18px 40px -18px rgba(36,51,74,0.35)',
        press: '0 4px 0 0 rgba(36,51,74,0.18)',
      },
      keyframes: {
        'pop-in': { '0%': { transform: 'scale(.82)', opacity: '0' }, '70%': { transform: 'scale(1.03)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'rise': { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'float-slow': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'shake': { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-5px)' }, '75%': { transform: 'translateX(5px)' } },
      },
      animation: {
        'pop-in': 'pop-in .28s cubic-bezier(.2,.9,.3,1.2) both',
        rise: 'rise .35s ease-out both',
        'float-slow': 'float-slow 4.5s ease-in-out infinite',
        shake: 'shake .32s ease-in-out',
      },
    },
  },
  plugins: [],
}
