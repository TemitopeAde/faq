import type { FAQEvent, FAQEventType } from './faq-types';

// Shared by the widget, the dashboard and the /api/faq-analytics endpoint.
// Kept free of Wix SDK imports so it runs in the browser, the backend and unit tests.

export const EVENT_TYPES: ReadonlyArray<FAQEventType> = ['open', 'helpful', 'not-helpful', 'search'];
export const ANALYTICS_RANGES = ['7', '30', '90', 'all'] as const;
export type AnalyticsRange = typeof ANALYTICS_RANGES[number];

const MAX_ID_LENGTH = 64;
const MAX_QUERY_LENGTH = 120;
const MAX_RESULT_COUNT = 10000;

export type FAQEventInput = { type: FAQEventType; groupId: string; itemId?: string; query?: string; resultCount?: number };
export type ItemStats = { opens: number; helpful: number; notHelpful: number };
export type SearchStats = { query: string; count: number; noResults: number; lastSearched: number };
export type AnalyticsSummary = {
  opens: number; helpful: number; notHelpful: number; searches: number; noResultSearches: number;
  byItem: Record<string, ItemStats>; searchesByQuery: Array<SearchStats>;
};
export type AnalyticsResponse = { summary: AnalyticsSummary; truncated: boolean };

export class InvalidEventError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const readId = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_ID_LENGTH) throw new InvalidEventError(`"${field}" must be a non-empty string of up to ${MAX_ID_LENGTH} characters.`);
  return value.trim();
};

// Validates an untrusted event body and returns only the fields we store.
export const parseEventInput = (body: unknown): FAQEventInput => {
  if (!isRecord(body)) throw new InvalidEventError('The event must be a JSON object.');
  const type = body.type;
  if (typeof type !== 'string' || !EVENT_TYPES.includes(type as FAQEventType)) throw new InvalidEventError(`"type" must be one of: ${EVENT_TYPES.join(', ')}.`);
  const groupId = readId(body.groupId, 'groupId');
  if (type !== 'search') return { type: type as FAQEventType, groupId, itemId: readId(body.itemId, 'itemId') };
  const query = typeof body.query === 'string' ? body.query.trim().toLowerCase().replace(/\s+/g, ' ') : '';
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) throw new InvalidEventError(`"query" must be 2–${MAX_QUERY_LENGTH} characters.`);
  const resultCount = body.resultCount;
  if (typeof resultCount !== 'number' || !Number.isInteger(resultCount) || resultCount < 0 || resultCount > MAX_RESULT_COUNT) throw new InvalidEventError('"resultCount" must be a whole number of 0 or more.');
  return { type: 'search', groupId, query, resultCount };
};

export const rangeStart = (range: AnalyticsRange, now = Date.now()): Date | undefined => (range === 'all' ? undefined : new Date(now - Number(range) * 86_400_000));

export const summarize = (events: Array<FAQEvent>): AnalyticsSummary => {
  const byItem: Record<string, ItemStats> = {};
  const searches = new Map<string, SearchStats>();
  const summary = { opens: 0, helpful: 0, notHelpful: 0, searches: 0, noResultSearches: 0 };
  for (const event of events) {
    if (event.type === 'search') {
      const query = (event.query ?? '').trim().toLowerCase();
      if (!query) continue;
      const time = new Date(event._createdDate ?? 0).getTime();
      const entry = searches.get(query) ?? { query, count: 0, noResults: 0, lastSearched: 0 };
      entry.count += 1;
      if (!event.resultCount) { entry.noResults += 1; summary.noResultSearches += 1; }
      entry.lastSearched = Math.max(entry.lastSearched, Number.isFinite(time) ? time : 0);
      searches.set(query, entry);
      summary.searches += 1;
      continue;
    }
    if (!event.itemId) continue;
    const stats = byItem[event.itemId] ?? { opens: 0, helpful: 0, notHelpful: 0 };
    if (event.type === 'open') { stats.opens += 1; summary.opens += 1; }
    if (event.type === 'helpful') { stats.helpful += 1; summary.helpful += 1; }
    if (event.type === 'not-helpful') { stats.notHelpful += 1; summary.notHelpful += 1; }
    byItem[event.itemId] = stats;
  }
  return { ...summary, byItem, searchesByQuery: [...searches.values()].sort((a, b) => b.count - a.count || b.lastSearched - a.lastSearched) };
};

export const helpfulRate = ({ helpful, notHelpful }: { helpful: number; notHelpful: number }): string =>
  helpful + notHelpful ? `${Math.round((helpful / (helpful + notHelpful)) * 100)}%` : '—';
