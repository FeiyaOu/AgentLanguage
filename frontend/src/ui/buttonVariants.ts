import { cva } from 'class-variance-authority';

/**
 * States: default · hover · active (pressed) · focus-visible · disabled · loading.
 * Loading keeps the button's width (content is hidden, not removed) so layout never jumps,
 * and does not use the disabled look: a button that dims the instant it's clicked flashes.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none',
    'transition-[background-color,border-color,color,transform] duration-fast ease-standard',
    'active:scale-[0.98] motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none [&:disabled:not([aria-busy=true])]:opacity-45',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'bg-surface text-fg border border-line hover:border-line-strong hover:bg-sunken',
        ghost: 'text-muted hover:text-fg hover:bg-sunken',
        danger: 'bg-surface text-danger border border-line hover:border-danger/40 hover:bg-danger-soft',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm rounded-control',
        md: 'h-10 px-4 text-body-sm rounded-control',
        lg: 'h-12 px-6 text-body rounded-control',
        icon: 'size-10 rounded-pill',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);
