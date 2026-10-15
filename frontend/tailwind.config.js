/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4CAF50',
          light: '#E8F5E9',
          dark: '#2E7D32',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        brand: {
          ungu: '#7E57C2',
          merah: '#EF5350',
          orange: '#FF9800',
          kuning: '#FFEB3B',
          biru: '#42A5F5',
        },
        surface: {
          sidebar: '#1E293B',
          sidebarHover: '#334155',
          sidebarActive: '#475569',
          content: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderDark: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
      },
      spacing: {
        'sidebar': '240px',
        'sidebarCollapsed': '72px',
      },
      backdropBlur: {
        sidebar: '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'cardHover': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'card': '8px',
      },
    },
  },
  plugins: [],
};
