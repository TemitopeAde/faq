import { FAQ_TEMPLATES, type FAQTemplate } from '../faq-templates';

export type TemplateId = 'online-store' | 'restaurant' | 'services' | 'saas' | 'events';
/** [category, question, answer] in the same order as the English template items. Answers may use inline HTML. */
export type TemplateEntry = readonly [category: string, question: string, answer: string];
export type TemplateContent = Record<TemplateId, ReadonlyArray<TemplateEntry>>;

// Each language is its own chunk and is only downloaded when a group is created from a template.
const loaders = import.meta.glob<{ default: TemplateContent }>('./templates/*.ts');

const toAnswerHtml = (answer: string): string => (answer.trimStart().startsWith('<') ? answer : `<p>${answer}</p>`);

/** The template's questions in the given language; falls back to English if a translation is missing or incomplete. */
export const localizedTemplateItems = async (template: FAQTemplate, language: string): Promise<FAQTemplate['items']> => {
  const load = loaders[`./templates/${language}.ts`];
  if (!load || language === 'en') return template.items;
  try {
    const entries = (await load()).default[template.id as TemplateId];
    if (!entries || entries.length !== template.items.length) return template.items;
    return entries.map(([category, question, answer]) => ({ category, question, answer: toAnswerHtml(answer) }));
  } catch (error) {
    console.error(`Failed to load ${language} template content:`, error);
    return template.items;
  }
};

export const TEMPLATE_IDS = FAQ_TEMPLATES.map((template) => template.id);
