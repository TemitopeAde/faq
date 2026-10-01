import { httpClient } from '@wix/essentials';
import type { AnalyticsRange, AnalyticsResponse, FAQEventInput } from './faq-analytics';
import type { FAQEntitlement } from './faq-pricing';
import type { FAQGroup, FAQItem } from './faq-types';

const apiOrigin = new URL(import.meta.url).origin;

const requestFAQ = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const response = await httpClient.fetchWithAuth(`${apiOrigin}/api/${path}`, { cache: 'no-store', ...init });
  return response;
};

export const fetchFAQEntitlement = async (): Promise<FAQEntitlement> => {
  const response = await requestFAQ('faq-entitlement');
  if (!response.ok) throw new Error('Could not check your plan. Refresh status to try again.');
  return response.json();
};

export const fetchFAQContent = async (connectionKey: string, testing: boolean): Promise<{ group: FAQGroup | null; faqItems: Array<FAQItem> } | null> => {
  const query = new URLSearchParams({ connectionKey, mode: testing ? 'testing' : 'live' });
  const response = await requestFAQ(`faq-content?${query}`);
  if (response.status === 403 && !testing) return null;
  if (!response.ok) throw new Error('Could not load FAQ content.');
  return response.json();
};

// Fire-and-forget from the widget: analytics must never break the FAQ for visitors.
export const recordFAQEvent = async (event: FAQEventInput): Promise<void> => {
  const response = await requestFAQ('faq-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), keepalive: true });
  if (!response.ok) throw new Error(`FAQ analytics rejected the event (${response.status}).`);
};

export const fetchFAQAnalytics = async ({ groupId, range }: { groupId?: string; range: AnalyticsRange }): Promise<AnalyticsResponse> => {
  const query = new URLSearchParams({ range });
  if (groupId) query.set('groupId', groupId);
  const response = await requestFAQ(`faq-analytics?${query}`);
  if (response.status === 403) throw new Error('Only site editors can view FAQ analytics.');
  if (!response.ok) throw new Error('Could not load FAQ analytics.');
  return response.json();
};
