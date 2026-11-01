import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-pill font-semibold select-none overflow-hidden',
  {
    variants: {
      size: {
        sm: 'size-8 text-caption',
        md: 'size-10 text-body-sm',
        lg: 'size-14 text-heading',
      },
      tone: {
        /** Light tint: lets a persona's emoji read clearly. */
        soft: 'bg-accent-soft ring-1 ring-inset ring-accent-line/70 text-accent-text',
        /** Brand fill: the signed-in user's own avatar. */
        solid: 'bg-accent text-accent-fg',
      },
    },
    defaultVariants: {
      size: 'md',
      tone: 'soft',
    },
  },
);

type AvatarProps = VariantProps<typeof avatarVariants> & {
  /** Person or character name — used for initials and the accessible label. */
  name: string;
  /** Shown instead of initials, e.g. a persona's emoji. */
  emoji?: string;
  src?: string;
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '');
}

export function Avatar({ name, emoji, src, size, tone, className }: AvatarProps) {
  return (
    <span className={cn(avatarVariants({ size, tone }), className)} role="img" aria-label={name}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : emoji ? (
        <span className={cn(size === 'lg' ? 'text-[1.75rem]' : size === 'sm' ? 'text-base' : 'text-xl')} aria-hidden>
          {emoji}
        </span>
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
