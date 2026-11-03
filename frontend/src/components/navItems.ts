import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Only match the exact path (for Home). */
  end?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/practice', label: 'Practice', icon: PencilSquareIcon },
  { to: '/roleplay', label: 'Roleplay', icon: ChatBubbleLeftRightIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
];
