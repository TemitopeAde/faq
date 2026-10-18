import type { A11y, Direction } from '@wix/editor-react-types';

export type FaqHarmonyProps = {
  id: string;
  className?: string;
  direction?: Direction;
  a11y?: A11y;
  /** Connection key from an FAQ group in the app dashboard or Aria. */
  connectionKey?: string;
  heading?: string;
  description?: string;
  display?: 'accordion' | 'grid' | 'cards' | 'tabs';
  searchPlaceholder?: string;
  initiallyOpen?: boolean;
  singleOpen?: boolean;
  collectFeedback?: boolean;
  seoSchema?: boolean;
  elementProps?: {
    heading?: { className?: string };
    description?: { className?: string };
    search?: { className?: string };
    category?: { className?: string };
    question?: { className?: string };
    answer?: { className?: string };
    feedback?: { className?: string };
    expand?: { className?: string };
  };
};

export const defaultProps = {
  connectionKey: '',
  heading: 'Frequently asked questions',
  description: '',
  display: 'accordion',
  searchPlaceholder: 'Search questions…',
  initiallyOpen: false,
  singleOpen: false,
  collectFeedback: true,
  seoSchema: true,
} as const satisfies Omit<FaqHarmonyProps, 'id' | 'className'>;
