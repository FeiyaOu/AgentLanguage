import type { ComponentProps, ReactNode } from 'react';
import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { cn } from './cn';

/*
 * Dropdown menu. Radix handles keyboard navigation, typeahead and focus return;
 * enter/exit are CSS keyframes that grow from the trigger (Radix's transform origin).
 */

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export function MenuContent({
  children,
  className,
  align = 'end',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={8}
        className={cn(
          'z-50 min-w-52 origin-[var(--radix-dropdown-menu-content-transform-origin)]',
          'bg-raised border border-line rounded-card shadow-overlay p-1.5',
          'data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out',
          'motion-reduce:data-[state=open]:animate-fade-in motion-reduce:data-[state=closed]:animate-fade-out',
          className,
        )}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

type MenuItemProps = ComponentProps<typeof RadixMenu.Item> & {
  icon?: ReactNode;
  tone?: 'default' | 'danger';
};

export function MenuItem({ className, icon, tone = 'default', children, ...props }: MenuItemProps) {
  return (
    <RadixMenu.Item
      className={cn(
        'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-control px-2.5 text-body-sm outline-none',
        'transition-colors duration-fast',
        tone === 'danger' ? 'text-danger data-[highlighted]:bg-danger-soft' : 'text-fg data-[highlighted]:bg-sunken',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        tone === 'default' && '[&_svg]:text-muted',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </RadixMenu.Item>
  );
}

export function MenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <RadixMenu.Label className={cn('px-2.5 py-2', className)}>{children}</RadixMenu.Label>;
}

export function MenuSeparator() {
  return <RadixMenu.Separator className="my-1.5 h-px bg-line" />;
}
