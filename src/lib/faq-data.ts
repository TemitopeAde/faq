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

const baseLanguage = (value?: string | null): string => (value ?? '').trim().toLowerCase().split(/[-_]/)[0] ?? '';

/**
 * Questions a visitor browsing in `language` should see: those tagged with that language plus untagged
 * ("All languages") ones. Questions tagged for another language are never mixed in. If that leaves nothing,
 * fall back to a single language (the one used by the first tagged question) rather than showing every language.
 */
export const itemsForLanguage = <T extends Pick<FAQItem, 'language'>>(faqItems: Array<T>, language?: string | null): Array<T> => {
  const wanted = baseLanguage(language);
  if (!wanted) return faqItems;
  const isUniversal = (item: T) => { const code = baseLanguage(item.language); return !code || code === 'all'; };
  const visible = faqItems.filter((item) => isUniversal(item) || baseLanguage(item.language) === wanted);
  if (visible.length) return visible;
  const fallback = baseLanguage(faqItems.find((item) => !isUniversal(item))?.language);
  return fallback ? faqItems.filter((item) => baseLanguage(item.language) === fallback) : faqItems;
};
