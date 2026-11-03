import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

/** Level-1 elevation: a border on a surface, no shadow. */
const cardVariants = cva('bg-surface border border-line rounded-card', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    interactive: {
      true: 'transition-colors duration-fast ease-standard hover:border-line-strong',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
});

type CardProps = ComponentProps<'div'> & VariantProps<typeof cardVariants>;

export function Card({ className, padding, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding, interactive }), className)} {...props} />;
}
