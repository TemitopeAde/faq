import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { GROUPS, FAQ_ITEMS } from './faq-data';
import type { FAQToolStore } from './faq-tools-runtime';

const collection = (kind: 'groups' | 'questions') => kind === 'groups' ? GROUPS : FAQ_ITEMS;
const query = auth.elevate(items.query);
const get = auth.elevate(items.get);
const insert = auth.elevate(items.insert);
const update = auth.elevate(items.update);

export const faqToolStore: FAQToolStore = {
  async list(kind, options) {
    let builder = query(collection(kind));
    if (options.groupId !== undefined) builder = builder.eq('groupId', options.groupId);
    if (options.published !== undefined) builder = builder.eq('published', options.published);
    if (options.search) builder = builder.contains(kind === 'groups' ? 'title' : 'question', options.search);
    builder = kind === 'groups' ? builder.ascending('title', '_id') : builder.ascending('sortOrder', '_id');
    const result = await builder.skip(options.offset).limit(options.limit).find({ returnTotalCount: true, consistentRead: true });
    if (result.totalCount === undefined) throw new Error('FAQ query did not return a total count');
    return {
      items: result.items, totalCount: result.totalCount, limit: options.limit, offset: options.offset,
      nextOffset: result.hasNext() ? options.offset + options.limit : null,
    };
  },
  get: (kind, id) => get(collection(kind), id, { consistentRead: true }),
  insert: (kind, data) => insert(collection(kind), data),
  update: (kind, data) => update(collection(kind), data),
  async nextSortOrder(groupId) {
    const result = await query(FAQ_ITEMS).eq('groupId', groupId).descending('sortOrder').limit(1).find({ consistentRead: true });
    const last = result.items[0]?.sortOrder;
    return typeof last === 'number' && Number.isFinite(last) ? Math.max(0, last + 1) : 0;
  },
};
