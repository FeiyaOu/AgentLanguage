import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge must know our custom token names, otherwise it treats e.g.
// `text-body` as a text color and drops it when merged with `text-fg`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'label', 'body-sm', 'body', 'heading', 'title', 'display'] }],
      rounded: [{ rounded: ['control', 'card', 'pill'] }],
      shadow: [{ shadow: ['raised', 'overlay'] }],
      duration: [{ duration: ['fast', 'base', 'slow'] }],
      ease: [{ ease: ['standard', 'enter', 'exit'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
