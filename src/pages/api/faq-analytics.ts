import type { APIRoute } from 'astro';
import { recordEvent, loadSummary } from '../../backend/faq-analytics';
import { accessErrorResponse, FAQAccessError, getFAQEntitlement, jsonResponse } from '../../backend/faq-entitlement';
import { ANALYTICS_RANGES, InvalidEventError, parseEventInput, type AnalyticsRange } from '../../lib/faq-analytics';

const MAX_BODY_BYTES = 2048;

// POST: the live widget records one visitor interaction (open, vote or search).
export const POST: APIRoute = async ({ request }) => {
  try {
    const entitlement = await getFAQEntitlement(request);
    // Only paid, live widgets are shown to visitors, so only they record analytics.
    if (!entitlement.canUseLive) throw new FAQAccessError('Pro is required to record FAQ analytics.', 403);
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new FAQAccessError('The event is too large.', 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new FAQAccessError('The event must be valid JSON.', 400); }
    await recordEvent(parseEventInput(body));
    return jsonResponse({ recorded: true }, 202);
  } catch (error) {
    if (error instanceof InvalidEventError) return jsonResponse({ error: error.message }, 400);
    return accessErrorResponse(error);
  }
};

// GET: the dashboard reads a summary. ?groupId=<id>&range=7|30|90|all
export const GET: APIRoute = async ({ request, url }) => {
  try {
    await getFAQEntitlement(request);
    const range = (url.searchParams.get('range') ?? '30') as AnalyticsRange;
    if (!ANALYTICS_RANGES.includes(range)) throw new FAQAccessError(`"range" must be one of: ${ANALYTICS_RANGES.join(', ')}.`, 400);
    const groupId = url.searchParams.get('groupId')?.trim() || undefined;
    if (groupId && groupId.length > 64) throw new FAQAccessError('A valid group ID is required.', 400);
    return jsonResponse(await loadSummary({ groupId, range }));
  } catch (error) { return accessErrorResponse(error); }
};
