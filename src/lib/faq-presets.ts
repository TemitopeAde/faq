import type { FAQWidgetSettings } from './faq-types';

export type FAQPreset = FAQWidgetSettings & { id: string; name: string; category: string };

const base = {
  connectionKey: '', heading: 'Frequently asked questions', description: '',
  questionFont: { font: '600 18px system-ui', textDecoration: '' },
  answerFont: { font: '400 15px system-ui', textDecoration: '' },
  icon: 'plus' as const, iconColor: '#475569', iconSize: 18, radius: 12, gap: 12, initiallyOpen: false,
};

const definitions: Array<[string, string, string, string, string, string, string]> = [
  ['classic', 'Classic Accordion', 'Accordion', '#ffffff', '#0f172a', '#475569', '#2563eb'],
  ['minimal', 'Minimal Lines', 'List', '#ffffff', '#111827', '#4b5563', '#111827'],
  ['cards', 'Soft Cards', 'Cards', '#f8fafc', '#0f172a', '#475569', '#2563eb'],
  ['dark', 'Midnight Support', 'Support', '#0f172a', '#f8fafc', '#cbd5e1', '#38bdf8'],
  ['split', 'Split Columns', 'Layout', '#ffffff', '#172554', '#475569', '#4f46e5'],
  ['category-tabs', 'Category Tabs', 'Categories', '#f8fafc', '#1e293b', '#475569', '#7c3aed'],
  ['sidebar', 'Sidebar Categories', 'Categories', '#ffffff', '#1f2937', '#4b5563', '#059669'],
  ['search', 'Search First', 'Help Center', '#ffffff', '#111827', '#475569', '#ea580c'],
  ['docs', 'Documentation Index', 'Documentation', '#ffffff', '#1e293b', '#475569', '#0284c7'],
  ['numbered', 'Numbered Questions', 'List', '#fffbeb', '#78350f', '#92400e', '#d97706'],
  ['timeline', 'Timeline Answers', 'Timeline', '#f8fafc', '#334155', '#64748b', '#0d9488'],
  ['compact', 'Compact Support', 'Support', '#ffffff', '#111827', '#4b5563', '#64748b'],
  ['help-center', 'Help Center', 'Support', '#eff6ff', '#1e3a8a', '#1e40af', '#2563eb'],
  ['pricing', 'Pricing FAQ', 'Business', '#f0fdf4', '#14532d', '#166534', '#16a34a'],
  ['product', 'Product Questions', 'Product', '#fff7ed', '#431407', '#7c2d12', '#ea580c'],
  ['onboarding', 'Onboarding Steps', 'Onboarding', '#faf5ff', '#3b0764', '#581c87', '#9333ea'],
  ['policy', 'Policy & Legal', 'Policy', '#f8fafc', '#1e293b', '#475569', '#475569'],
  ['conversation', 'Conversation Style', 'Support', '#fdf2f8', '#500724', '#831843', '#db2777'],
  ['newspaper', 'Editorial Borders', 'Editorial', '#fffbeb', '#292524', '#57534e', '#78716c'],
  ['pastel', 'Pastel Rounded', 'Cards', '#fdf4ff', '#4a044e', '#86198f', '#c026d3'],
  ['featured', 'Featured Answer', 'Highlight', '#ecfeff', '#164e63', '#155e75', '#0891b2'],
  ['expand-all', 'Knowledge Base', 'Documentation', '#f1f5f9', '#0f172a', '#334155', '#334155'],
  ['mobile', 'Mobile Stacked', 'Responsive', '#ffffff', '#0f172a', '#475569', '#4f46e5'],
  ['clean', 'Clean Answers', 'Minimal', '#ffffff', '#18181b', '#52525b', '#18181b'],
];

const presetIcons: Array<FAQWidgetSettings['icon']> = ['plus', 'chevron', 'arrow', 'minus'];

export const FAQ_PRESETS: Array<FAQPreset> = definitions.map(([id, name, category, backgroundColor, questionColor, answerColor, accentColor], index) => ({
  ...base, id, name, category, layout: id, icon: presetIcons[index % presetIcons.length], backgroundColor, questionColor, answerColor, accentColor, borderColor: `${accentColor}33`,
}));

export const presetById = (id: string): FAQPreset => FAQ_PRESETS.find((preset) => preset.id === id) ?? FAQ_PRESETS[0];
