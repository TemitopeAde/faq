import type { FAQWidgetSettings, FontValue } from './faq-types';

export type PresetDisplay = 'accordion' | 'grid' | 'cards' | 'tabs';
export type FAQPreset = FAQWidgetSettings & {
  id: string;
  name: string;
  category: string;
  display: PresetDisplay;
  padding: number;
  /** Extra widget props the look depends on, e.g. turning on expand/collapse buttons. */
  extras: Record<string, string>;
};

const font = (value: string): FontValue => ({ font: value, textDecoration: '' });
const SANS = 'system-ui, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const base = {
  connectionKey: '', heading: 'Frequently asked questions', description: '',
  icon: 'plus' as const, iconColor: '#475569', iconSize: 18, initiallyOpen: false,
};

type Shape = { display: PresetDisplay; radius: number; gap: number; padding: number; question: string; answer: string; extras?: Record<string, string> };
const shape = (display: PresetDisplay, radius: number, gap: number, padding: number, question = `600 18px ${SANS}`, answer = `400 15px ${SANS}`, extras: Record<string, string> = {}): Shape =>
  ({ display, radius, gap, padding, question, answer, extras });

// [id, name, category, background, question, answer, accent, shape]. Each preset changes the display style,
// spacing and type as well as colors, and the matching `data-layout` rules in faq-widget.module.css add its signature details.
const definitions: Array<[string, string, string, string, string, string, string, Shape]> = [
  ['classic', 'Classic Accordion', 'Accordion', 'transparent', '#0f172a', '#475569', '#2563eb', shape('accordion', 12, 12, 28)],
  ['minimal', 'Minimal Lines', 'List', '#ffffff', '#111827', '#4b5563', '#111827', shape('accordion', 0, 0, 12, `500 17px ${SANS}`)],
  ['cards', 'Soft Cards', 'Cards', '#f8fafc', '#0f172a', '#475569', '#2563eb', shape('cards', 18, 18, 28)],
  ['dark', 'Midnight Support', 'Support', '#0f172a', '#f8fafc', '#cbd5e1', '#38bdf8', shape('accordion', 16, 10, 32)],
  ['split', 'Split Columns', 'Layout', '#ffffff', '#172554', '#475569', '#4f46e5', shape('grid', 12, 16, 28)],
  ['category-tabs', 'Category Tabs', 'Categories', '#f8fafc', '#1e293b', '#475569', '#7c3aed', shape('tabs', 12, 12, 28, undefined, undefined, { 'show-categories': 'true' })],
  ['sidebar', 'Sidebar Categories', 'Categories', '#ffffff', '#1f2937', '#4b5563', '#059669', shape('tabs', 8, 8, 24, `600 16px ${SANS}`, undefined, { 'show-categories': 'true' })],
  ['search', 'Search First', 'Help Center', '#ffffff', '#111827', '#475569', '#ea580c', shape('accordion', 14, 10, 32, undefined, undefined, { 'show-search': 'true' })],
  ['docs', 'Documentation Index', 'Documentation', '#ffffff', '#1e293b', '#475569', '#0284c7', shape('accordion', 6, 6, 24, `600 16px ${SANS}`, `400 15px ${SANS}`)],
  ['numbered', 'Numbered Questions', 'List', '#fffbeb', '#78350f', '#92400e', '#d97706', shape('accordion', 10, 10, 28)],
  ['timeline', 'Timeline Answers', 'Timeline', '#f8fafc', '#334155', '#64748b', '#0d9488', shape('accordion', 10, 18, 28, `600 17px ${SANS}`)],
  ['compact', 'Compact Support', 'Support', '#ffffff', '#111827', '#4b5563', '#64748b', shape('accordion', 6, 4, 16, `600 15px ${SANS}`, `400 14px ${SANS}`)],
  ['help-center', 'Help Center', 'Support', '#eff6ff', '#1e3a8a', '#1e40af', '#2563eb', shape('grid', 14, 14, 32)],
  ['pricing', 'Pricing FAQ', 'Business', '#f0fdf4', '#14532d', '#166534', '#16a34a', shape('cards', 16, 16, 28)],
  ['product', 'Product Questions', 'Product', '#fff7ed', '#431407', '#7c2d12', '#ea580c', shape('grid', 12, 14, 28)],
  ['onboarding', 'Onboarding Steps', 'Onboarding', '#faf5ff', '#3b0764', '#581c87', '#9333ea', shape('accordion', 14, 12, 28)],
  ['policy', 'Policy & Legal', 'Policy', '#f8fafc', '#1e293b', '#475569', '#475569', shape('accordion', 4, 0, 24, `600 17px ${SERIF}`, `400 16px ${SERIF}`)],
  ['conversation', 'Conversation Style', 'Support', '#fdf2f8', '#500724', '#831843', '#db2777', shape('accordion', 20, 12, 28)],
  ['newspaper', 'Editorial Borders', 'Editorial', '#fffbeb', '#292524', '#57534e', '#78716c', shape('accordion', 0, 0, 24, `700 19px ${SERIF}`, `400 16px ${SERIF}`)],
  ['pastel', 'Pastel Rounded', 'Cards', '#fdf4ff', '#4a044e', '#86198f', '#c026d3', shape('cards', 24, 16, 28)],
  ['featured', 'Featured Answer', 'Highlight', '#ecfeff', '#164e63', '#155e75', '#0891b2', shape('accordion', 16, 12, 28)],
  ['expand-all', 'Knowledge Base', 'Documentation', '#f1f5f9', '#0f172a', '#334155', '#334155', shape('accordion', 8, 8, 28, undefined, undefined, { 'show-expand-all': 'true', 'single-open': 'false' })],
  ['mobile', 'Mobile Stacked', 'Responsive', '#ffffff', '#0f172a', '#475569', '#4f46e5', shape('accordion', 14, 10, 16, `600 17px ${SANS}`, `400 16px ${SANS}`)],
  ['clean', 'Clean Answers', 'Minimal', '#ffffff', '#18181b', '#52525b', '#18181b', shape('accordion', 0, 4, 20)],
];

const presetIcons: Array<FAQWidgetSettings['icon']> = ['plus', 'chevron', 'arrow', 'minus'];

export const FAQ_PRESETS: Array<FAQPreset> = definitions.map(([id, name, category, backgroundColor, questionColor, answerColor, accentColor, look], index) => ({
  ...base, id, name, category, layout: id, icon: presetIcons[index % presetIcons.length],
  backgroundColor, questionColor, answerColor, accentColor, borderColor: `${accentColor}33`,
  iconColor: accentColor, display: look.display, radius: look.radius, gap: look.gap, padding: look.padding,
  questionFont: font(look.question), answerFont: font(look.answer), extras: look.extras ?? {},
}));

export const presetById = (id: string): FAQPreset => FAQ_PRESETS.find((preset) => preset.id === id) ?? FAQ_PRESETS[0];

/** Every widget prop a preset sets. Other settings (connection, text, toggles not listed in `extras`) are left alone. */
export const presetProps = (preset: FAQPreset): Record<string, string> => ({
  layout: preset.id, display: preset.display,
  'background-color': preset.backgroundColor, 'question-color': preset.questionColor, 'answer-color': preset.answerColor,
  'accent-color': preset.accentColor, 'border-color': preset.borderColor, 'icon-color': preset.iconColor,
  icon: preset.icon, 'icon-size': String(preset.iconSize), radius: String(preset.radius), gap: String(preset.gap), padding: String(preset.padding),
  'question-font': JSON.stringify(preset.questionFont), 'answer-font': JSON.stringify(preset.answerFont),
  ...preset.extras,
});
