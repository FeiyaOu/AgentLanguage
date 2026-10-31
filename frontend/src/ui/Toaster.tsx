import { Toaster as SonnerToaster } from 'sonner';

/**
 * App-wide toast host. Styled with tokens (unstyled mode), so it follows the
 * light/dark theme through CSS variables rather than Sonner's own theme prop.
 * Trigger toasts with `toast()`, re-exported from the ui index.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'w-[min(calc(100vw-2rem),360px)] flex items-start gap-3 bg-raised text-fg border border-line rounded-card shadow-overlay px-4 py-3',
          title: 'text-body-sm font-medium',
          description: 'text-caption text-muted mt-0.5',
          icon: 'mt-0.5 shrink-0',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          warning: '[&_[data-icon]]:text-warning',
          actionButton: 'ml-auto shrink-0 text-body-sm font-medium text-accent-text hover:underline',
        },
      }}
    />
  );
}
