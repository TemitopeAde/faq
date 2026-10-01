import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { FAQAccessError } from './faq-entitlement';
import { FAQ_EVENTS, FAQ_ITEMS, GROUPS } from '../lib/faq-data';
import { rangeStart, summarize, type AnalyticsRange, type AnalyticsResponse, type FAQEventInput } from '../lib/faq-analytics';
import type { FAQEvent } from '../lib/faq-types';

const MAX_EVENTS = 10000;

// Visitors can't write to the events collection directly. This elevated insert is the only way in,
// so it first confirms the event points at a published group (and question) on this site.
export const recordEvent = async (event: FAQEventInput): Promise<void> => {
  const query = auth.elevate(items.query);
  const group = await query(GROUPS).eq('_id', event.groupId).eq('published', true).limit(1).find();
  if (!group.items.length) throw new FAQAccessError('Unknown or unpublished FAQ group.', 404);
  if (event.itemId) {
    const item = await query(FAQ_ITEMS).eq('_id', event.itemId).eq('groupId', event.groupId).eq('published', true).limit(1).find();
    if (!item.items.length) throw new FAQAccessError('Unknown or unpublished FAQ question.', 404);
  }
  await auth.elevate(items.insert)(FAQ_EVENTS, { title: event.type, ...event });
};

const isPermissionError = (error: unknown): boolean => {
  const text = `${(error as { code?: unknown })?.code ?? ''} ${error instanceof Error ? error.message : String(error)}`;
  return /WDE0027|permission|forbidden|unauthori[sz]ed/i.test(text);
};

// Never elevated: Wix applies the collection's CMS_EDITOR read permission to the caller,
// so only the site owner and collaborators get analytics back.
export const loadSummary = async ({ groupId, range }: { groupId?: string; range: AnalyticsRange }): Promise<AnalyticsResponse> => {
  let query = items.query(FAQ_EVENTS).descending('_createdDate');
  if (groupId) query = query.eq('groupId', groupId);
  const since = rangeStart(range);
  if (since) query = query.ge('_createdDate', since);
  try {
    let page = await query.limit(1000).find();
    const events = [...page.items] as unknown as Array<FAQEvent>;
    while (page.hasNext() && events.length < MAX_EVENTS) {
      page = await page.next();
      events.push(...(page.items as unknown as Array<FAQEvent>));
    }
    return { summary: summarize(events.slice(0, MAX_EVENTS)), truncated: page.hasNext() || events.length > MAX_EVENTS };
  } catch (error) {
    if (isPermissionError(error)) throw new FAQAccessError('Only site editors can view FAQ analytics.', 403);
    throw error;
  }
};
