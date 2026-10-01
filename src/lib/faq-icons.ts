import type { FAQWidgetSettings } from './faq-types';

export type FAQIcon = FAQWidgetSettings['icon'];

// SVG path data on a 24x24 viewBox, stroked with currentColor so the icon colour setting applies.
export const FAQ_ICONS: Array<{ id: FAQIcon; name: string; path: string }> = [
  { id: 'plus', name: 'Plus', path: 'M12 5v14M5 12h14' },
  { id: 'chevron', name: 'Chevron', path: 'M6 9l6 6 6-6' },
  { id: 'arrow', name: 'Arrow', path: 'M5 12h14M13 6l6 6-6 6' },
  { id: 'minus', name: 'Minus', path: 'M5 12h14' },
  { id: 'caret', name: 'Caret', path: 'M7 10l5 5 5-5z' },
  { id: 'circle-plus', name: 'Circle plus', path: 'M12 8v8M8 12h8M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18' },
  { id: 'circle-chevron', name: 'Circle chevron', path: 'M8.5 10.5l3.5 3.5 3.5-3.5M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18' },
];

export const iconById = (id: string | null | undefined) => FAQ_ICONS.find((icon) => icon.id === id) ?? FAQ_ICONS[0];

export const iconSvg = (id: string | null | undefined, size = '1em'): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconById(id).path}"/></svg>`;
