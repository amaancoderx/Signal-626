import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'signal': {
          green: '#FFFFFF',
          cyan: '#D0D8E0',
          red: '#FF3B3B',
          amber: '#FFB800',
          dark: '#0A0F14',
          darker: '#050709',
          panel: '#0C1218',
          border: '#1a2a3a',
          muted: '#7A8A99',
          bright: '#E6F1FF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'Inter', 'Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 8px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.1)',
        'glow-green-strong': '0 0 16px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.15)',
        'glow-cyan': '0 0 8px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.1)',
        'glow-red': '0 0 20px rgba(255, 59, 59, 0.3)',
        'inner-glow': 'inset 0 0 30px rgba(255, 255, 255, 0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'radar': 'radar 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'counter': 'counter 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.97' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.15), 0 0 20px rgba(255, 255, 255, 0.05)' },
          '100%': { boxShadow: '0 0 10px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        counter: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
};

export default config;
