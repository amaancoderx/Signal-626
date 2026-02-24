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
        signal: {
          cyan: '#00E5FF',
          blue: '#0099FF',
          aqua: '#00F6D2',
          teal: '#00B8A9',
          accent: '#4DC3FF',
          green: '#00ff9c',
          purple: '#7b61ff',
          red: '#FF3355',
          amber: '#FFB300',
          dark: '#07111F',
          darker: '#050A14',
          panel: '#0a1628',
          border: '#0f3d6a',
          muted: '#4a6a8a',
          bright: '#CFFFFF',
          ghost: '#89DFFF',
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'Fira Code', 'monospace'],
        display: ['var(--font-orbitron)', 'sans-serif'],
        body: ['var(--font-rajdhani)', 'var(--font-inter)', 'var(--font-space-grotesk)', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(0,229,255,0.4), 0 0 40px rgba(0,229,255,0.1)',
        'glow-cyan-strong': '0 0 20px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.2)',
        'glow-cyan-intense': '0 0 30px rgba(0,229,255,0.8), 0 0 80px rgba(0,229,255,0.3), 0 0 120px rgba(0,229,255,0.1)',
        'glow-green': '0 0 12px rgba(0,255,156,0.4), 0 0 40px rgba(0,255,156,0.1)',
        'glow-green-strong': '0 0 20px rgba(0,255,156,0.6), 0 0 60px rgba(0,255,156,0.2)',
        'glow-purple': '0 0 12px rgba(123,97,255,0.4), 0 0 40px rgba(123,97,255,0.1)',
        'glow-red': '0 0 20px rgba(255, 68, 102, 0.3)',
        'glow-amber': '0 0 12px rgba(255,179,0,0.4), 0 0 40px rgba(255,179,0,0.1)',
        'inner-glow': 'inset 0 0 30px rgba(0, 212, 255, 0.03)',
        'neon-border': '0 0 8px rgba(0,229,255,0.3), inset 0 0 8px rgba(0,229,255,0.05)',
        glass: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,255,0.05), inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        scan: 'scan 8s linear infinite',
        radar: 'radar 3s linear infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
        flicker: 'flicker 0.15s infinite',
        glow: 'glowCyan 2s ease-in-out infinite alternate',
        'glow-breathe': 'glowBreathe 3s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        counter: 'counter 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'border-flow': 'borderFlow 3s linear infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        'bar-grow': 'barGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-in-out',
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
        radarSweep: {
          '0%': { transform: 'rotate(0deg)', opacity: '0.8' },
          '100%': { transform: 'rotate(360deg)', opacity: '0.8' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.97' },
        },
        glowCyan: {
          '0%': { boxShadow: '0 0 5px rgba(0, 229, 255, 0.2), 0 0 20px rgba(0, 229, 255, 0.05)' },
          '100%': { boxShadow: '0 0 15px rgba(0, 229, 255, 0.4), 0 0 50px rgba(0, 229, 255, 0.15)' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,229,255,0.3), 0 0 20px rgba(0,229,255,0.1)' },
          '50%': { boxShadow: '0 0 16px rgba(0,229,255,0.5), 0 0 40px rgba(0,229,255,0.2)' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,255,156,0.3), 0 0 20px rgba(0,255,156,0.1)' },
          '50%': { boxShadow: '0 0 16px rgba(0,255,156,0.5), 0 0 40px rgba(0,255,156,0.2)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        counter: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        barGrow: {
          '0%': { width: '0%' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        grid: '50px 50px',
      },
    },
  },
  plugins: [],
};

export default config;
