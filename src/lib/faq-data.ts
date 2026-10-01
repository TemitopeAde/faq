import type { FAQItem } from './faq-types';

export const GROUPS = '@admin14744/faq/faq-groups';
export const FAQ_ITEMS = '@admin14744/faq/faq-items';
export const FAQ_EVENTS = '@admin14744/faq/faq-events';

const slugify = (value: string): string => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'question';

// Stable, unique `faq-…` anchors used for deep links. The widget and the dashboard
// share this so a link copied from the dashboard opens the same question on the site.
export const itemAnchors = (faqItems: Array<Pick<FAQItem, 'question'>>): Array<string> => {
  const used = new Map<string, number>();
  return faqItems.map((item) => {
    const base = `faq-${slugify(item.question)}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  });
};

export const categoriesOf = (faqItems: Array<Pick<FAQItem, 'category'>>): Array<string> =>
  [...new Set(faqItems.map((item) => item.category?.trim() ?? '').filter(Boolean))];
