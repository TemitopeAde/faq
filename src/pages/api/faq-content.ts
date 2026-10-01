import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { accessErrorResponse, FAQAccessError, getFAQEntitlement, jsonResponse } from '../../backend/faq-entitlement';
import { FAQ_ITEMS, GROUPS } from '../../lib/faq-data';
import { allQueryItems } from '../../lib/faq-query';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const entitlement = await getFAQEntitlement(request);
    const testing = url.searchParams.get('mode') === 'testing';
    const connectionKey = url.searchParams.get('connectionKey')?.trim();
    if (!connectionKey || connectionKey.length > 256) throw new FAQAccessError('A valid connection key is required.', 400);
    if (!testing && !entitlement.canUseLive) throw new FAQAccessError('Pro is required for live FAQs.', 403);

    // Testing never elevates: Wix collection permissions must authorize the owner.
    // Only paid live requests may elevate, and they expose published content only.
    const query = testing ? items.query : auth.elevate(items.query);
    const groups = query(GROUPS).eq('connectionKey', connectionKey);
    const result = await (testing ? groups : groups.eq('published', true)).limit(1).find();
    const group = result.items[0];
    if (!group?._id) return jsonResponse({ group: null, faqItems: [] });
    const questions = query(FAQ_ITEMS).eq('groupId', group._id).ascending('sortOrder');
    const faqItems = await allQueryItems(testing ? questions : questions.eq('published', true));
    return jsonResponse({ group, faqItems });
  } catch (error) { return accessErrorResponse(error); }
};
