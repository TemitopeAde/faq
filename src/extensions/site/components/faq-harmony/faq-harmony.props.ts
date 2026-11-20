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
  showSearch?: boolean;
  showCategories?: boolean;
  showExpandAll?: boolean;
  showHeading?: boolean;
  showDescription?: boolean;
  showIcon?: boolean;
  showHelp?: boolean;
  helpText?: string;
  helpLabel?: string;
  helpLink?: string;
  layout?: string;
  icon?: string;
  backgroundColor?: string;
  questionColor?: string;
  answerColor?: string;
  accentColor?: string;
  borderColor?: string;
  questionFont?: string;
  answerFont?: string;
  iconColor?: string;
  iconSize?: number;
  radius?: number;
  gap?: number;
  padding?: number;
  animation?: 'none' | 'fade' | 'slide' | 'zoom';
  hoverEffect?: 'none' | 'lift' | 'highlight' | 'accent';
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  /** Language code (e.g. 'en', 'es', 'fr') or auto-detected from site. */
  language?: string;
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
  showSearch: true,
  showCategories: true,
  showExpandAll: false,
  showHeading: true,
  showDescription: true,
  showIcon: true,
  showHelp: false,
  helpText: '',
  helpLabel: '',
  helpLink: '',
  layout: 'classic',
  icon: 'plus',
  backgroundColor: 'transparent',
  questionColor: '#0f172a',
  answerColor: '#475569',
  accentColor: '#2563eb',
  borderColor: '#2563eb33',
  questionFont: '600 18px system-ui, sans-serif',
  answerFont: '400 15px system-ui, sans-serif',
  iconColor: '#475569',
  iconSize: 18,
  radius: 12,
  gap: 12,
  padding: 28,
  animation: 'fade',
  hoverEffect: 'lift',
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  language: '',
} as const satisfies Omit<FaqHarmonyProps, 'id' | 'className'>;
