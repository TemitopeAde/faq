import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { accessErrorResponse, FAQAccessError, getFAQEntitlement, jsonResponse } from '../../backend/faq-entitlement';
import { FAQ_ITEMS, GROUPS, itemsForLanguage } from '../../lib/faq-data';
import { allQueryItems } from '../../lib/faq-query';
import type { FAQGroup, FAQItem } from '../../lib/faq-types';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const entitlement = await getFAQEntitlement(request);
    const testing = url.searchParams.get('mode') === 'testing';
    const allGroups = url.searchParams.get('scope') === 'all';
    const connectionKey = url.searchParams.get('connectionKey')?.trim();
    if (!allGroups && (!connectionKey || connectionKey.length > 256)) throw new FAQAccessError('A valid connection key is required.', 400);
    if (!testing && !entitlement.canUseLive) throw new FAQAccessError('Pro is required for live FAQs.', 403);

    // Testing never elevates: Wix collection permissions must authorize the owner.
    // Only paid live requests may elevate, and they expose published content only.
    const query = testing ? items.query : auth.elevate(items.query);
    const language = url.searchParams.get('language')?.trim().toLowerCase();

    // Every group, each with its own questions: the widget shows one tab per group.
    if (allGroups) {
      const groupQuery = query(GROUPS).ascending('_createdDate');
      const groups = await allQueryItems(testing ? groupQuery : groupQuery.eq('published', true)) as unknown as Array<FAQGroup>;
      const ids = groups.flatMap((group) => group._id ? [group._id] : []);
      if (!ids.length) return jsonResponse({ groups: [] });
      const questions = query(FAQ_ITEMS).hasSome('groupId', ids).ascending('sortOrder');
      const allItems = await allQueryItems(testing ? questions : questions.eq('published', true)) as unknown as Array<FAQItem>;
      const byGroup = new Map<string, Array<FAQItem>>();
      for (const item of allItems) byGroup.set(item.groupId, [...(byGroup.get(item.groupId) ?? []), item]);
      const sections = groups
        .map((group) => ({ group, faqItems: itemsForLanguage(byGroup.get(group._id ?? '') ?? [], language) }))
        .filter((section) => testing || section.faqItems.length > 0);
      return jsonResponse({ groups: sections });
    }

    const groups = query(GROUPS).eq('connectionKey', connectionKey);
    const result = await (testing ? groups : groups.eq('published', true)).limit(1).find();
    const group = result.items[0];
    if (!group?._id) return jsonResponse({ group: null, faqItems: [] });
    const questions = query(FAQ_ITEMS).eq('groupId', group._id).ascending('sortOrder');
    const allItems = await allQueryItems(testing ? questions : questions.eq('published', true));

    const faqItems = itemsForLanguage(allItems as Array<{ language?: string }>, language);

    return jsonResponse({ group, faqItems });
  } catch (error) { return accessErrorResponse(error); }
};
