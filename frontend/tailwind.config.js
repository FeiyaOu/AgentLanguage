/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

// Semantic color tokens live in src/styles/tokens.css as RGB channels.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy alias used by the Feedback page; remove once it is migrated to tokens.
        primary: colors.orange,
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        raised: token('raised'),
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        fg: token('fg'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'),
          soft: token('accent-soft'),
          line: token('accent-line'),
          text: token('accent-text'),
        },
        ring: token('ring'),
        // Pre-mixed with alpha per theme, so no opacity modifier.
        scrim: 'var(--color-scrim)',
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Named type scale: [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
        label: ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
        heading: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        title: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        display: ['2.75rem', { lineHeight: '3.25rem', letterSpacing: '-0.025em', fontWeight: '650' }],
      },
      // Radius rule: controls → control, cards/panels → card, chips/avatars → pill
      borderRadius: {
        control: '10px',
        card: '16px',
        pill: '9999px',
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        enter: 'var(--ease-enter)',
        exit: 'var(--ease-exit)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, calc(-50% + 8px)) scale(0.97)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, calc(-50% + 4px)) scale(0.98)' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'menu-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.98)' },
        },
        shimmer: { to: { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-base) var(--ease-standard)',
        'fade-out': 'fade-out var(--duration-fast) var(--ease-exit)',
        'dialog-in': 'dialog-in var(--duration-base) var(--ease-enter)',
        'dialog-out': 'dialog-out var(--duration-fast) var(--ease-exit)',
        'menu-in': 'menu-in var(--duration-fast) var(--ease-enter)',
        'menu-out': 'menu-out var(--duration-fast) var(--ease-exit)',
        shimmer: 'shimmer 1.6s var(--ease-standard) infinite',
      },
    },
  },
  plugins: [],
}
