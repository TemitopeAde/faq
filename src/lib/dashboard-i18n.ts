import { useSyncExternalStore } from 'react';
import { i18n } from '@wix/essentials';
import { EN, type Catalog, type UIKey } from './i18n/en';
import { SUPPORTED_LANGUAGES, isRTL, normalizeLanguage } from './faq-i18n';

export type { UIKey } from './i18n/en';
type Values = Record<string, string | number>;

// Each locale is its own chunk, so the dashboard and editor panel only download the language they show.
const loaders = import.meta.glob<{ default: Catalog }>('./i18n/locales/*.ts');
const loaderFor = (language: string) => loaders[`./i18n/locales/${language}.ts`];

export const DASHBOARD_LANGUAGES = SUPPORTED_LANGUAGES.filter((language) => language.code && (language.code === 'en' || loaderFor(language.code)));

let activeLanguage = 'en';
let catalog: Catalog = EN;
let loadToken = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const supported = (language: string): string => (DASHBOARD_LANGUAGES.some((option) => option.code === language) ? language : 'en');

/** The language the Wix dashboard or Editor is displayed in, falling back to the browser language. */
export const detectHostLanguage = (): string => {
  try { const host = normalizeLanguage(i18n.getLanguage()); if (host) return supported(host); } catch { /* Not running inside a Wix host. */ }
  try { return supported(normalizeLanguage(navigator.language)); } catch { return 'en'; }
};

export const setDashboardLanguage = async (language?: string | null): Promise<string> => {
  const next = supported(normalizeLanguage(language) || 'en');
  const token = ++loadToken;
  let nextCatalog: Catalog = EN;
  if (next !== 'en') {
    try { nextCatalog = { ...EN, ...(await loaderFor(next)!()).default }; }
    catch (error) { console.error(`Failed to load dashboard translations for ${next}:`, error); return activeLanguage; }
  }
  if (token !== loadToken) return activeLanguage;
  activeLanguage = next; catalog = nextCatalog;
  emit();
  return next;
};

export const getDashboardLanguage = (): string => activeLanguage;
export const dashboardDirection = (): 'rtl' | 'ltr' => (isRTL(activeLanguage) ? 'rtl' : 'ltr');

const interpolate = (text: string, values: Values): string => text.replace(/{{(\w+)}}/g, (_, key: string) => {
  const value = values[key];
  return typeof value === 'number' ? new Intl.NumberFormat(activeLanguage).format(value) : String(value ?? '');
});

export const t = (key: UIKey, values: Values = {}): string => interpolate(catalog[key] ?? EN[key] ?? key, values);

/** Plural-aware lookup: pass the base key without `_one`/`_other`; the form comes from Intl.PluralRules. */
export const tn = (base: string, count: number, values: Values = {}): string => {
  const form = new Intl.PluralRules(activeLanguage).select(count);
  const text = catalog[`${base}_${form}`] ?? catalog[`${base}_other`] ?? (EN as Record<string, string>)[`${base}_other`] ?? base;
  return interpolate(text, { count, ...values });
};

/** Looks up a dynamic key (e.g. a preset id) and falls back to the given text when no translation exists. */
export const tOr = (key: string, fallback: string): string => catalog[key] ?? fallback;

/** Localized name of a language code, e.g. "Spanish" shown as "Español" / "Espagnol" depending on the UI language. */
export const displayLanguage = (code: string): string => {
  const option = SUPPORTED_LANGUAGES.find((language) => language.code === code);
  let name = option?.name ?? code.toUpperCase();
  try { name = new Intl.DisplayNames([activeLanguage], { type: 'language' }).of(code) ?? name; } catch { /* Older browsers keep the English name. */ }
  return option && option.nativeName !== name ? `${name} (${option.nativeName})` : name;
};

export const formatDate = (value: Date | string | number, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string =>
  new Intl.DateTimeFormat(activeLanguage, options).format(new Date(value));

/** Re-renders the calling component whenever the dashboard language (or its translations) changes. */
export const useDashboardLanguage = (): string => useSyncExternalStore(
  (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  () => activeLanguage,
  () => activeLanguage,
);
