import { faqToolDefinitions } from './faq-tools-contracts.ts';
import type { FAQGroup, FAQItem } from './faq-types.ts';

export type FAQRecord = Record<string, unknown> & { _id?: string };
export type ListOptions = { search?: string; published?: boolean; groupId?: string; limit: number; offset: number };
export type FAQPage = { items: FAQRecord[]; totalCount: number; limit: number; offset: number; nextOffset: number | null };
export interface FAQToolStore {
  list: (kind: 'groups' | 'questions', options: ListOptions) => Promise<FAQPage>;
  get: (kind: 'groups' | 'questions', id: string) => Promise<FAQRecord | null>;
  insert: (kind: 'groups' | 'questions', data: FAQRecord) => Promise<FAQRecord>;
  update: (kind: 'groups' | 'questions', data: FAQRecord & { _id: string }) => Promise<FAQRecord>;
  nextSortOrder: (groupId: string) => Promise<number>;
}

function stringValue(payload: Record<string, unknown>, key: string, required = false, allowEmpty = false): string | undefined {
  const value = payload[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`${key} must be a non-empty string`);
  return value.trim();
}

function booleanValue(payload: Record<string, unknown>, key: string): boolean | undefined {
  const value = payload[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
  return value;
}

function integerValue(payload: Record<string, unknown>, key: string, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const value = payload[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer between ${min} and ${max}`);
  return value;
}

function changes(payload: Record<string, unknown>, kind: 'groups' | 'questions', creating: boolean): FAQRecord {
  const result: Partial<FAQGroup & FAQItem> = {};
  const fields = kind === 'groups' ? ['title', 'description'] : ['question', 'answer', 'category'];
  for (const key of fields) {
    const required = creating && ['title', 'question', 'answer'].includes(key);
    const value = stringValue(payload, key, required, ['description', 'category'].includes(key));
    if (value !== undefined) {
      if (key === 'answer' && !value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() && !/<(img|iframe)\b/i.test(value)) throw new Error('answer must contain text, an image or a video');
      Object.assign(result, { [key]: value });
    }
  }
  const published = booleanValue(payload, 'published');
  if (published !== undefined) result.published = published;
  if (!creating && !Object.keys(result).length) throw new Error('Provide at least one field to update');
  if (result.question !== undefined) result.title = result.question;
  return result;
}

async function existing(store: FAQToolStore, kind: 'groups' | 'questions', id: string): Promise<FAQRecord & { _id: string }> {
  const record = await store.get(kind, id);
  if (!record || record._id !== id) throw new Error(`${kind === 'groups' ? 'FAQ group' : 'FAQ question'} not found: ${id}`);
  return { ...record, _id: id };
}

export function createFAQToolRunner(store: FAQToolStore, uniqueId: () => string = () => crypto.randomUUID()) {
  return async (methodName: string | undefined, input: unknown): Promise<Record<string, unknown>> => {
    const definition = faqToolDefinitions.find((tool) => tool.methodName === methodName);
    if (!definition) throw new Error(`Unknown FAQ tool: ${methodName}`);
    if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) throw new Error('payload must be an object');
    const payload = (input ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(payload)) {
      if (!(key in definition.requestSchema.properties)) throw new Error(`Unexpected field: ${key}`);
    }
    if (methodName === 'list-faq-groups' || methodName === 'list-faq-questions') {
      const groupId = methodName === 'list-faq-questions' ? stringValue(payload, 'groupId', true) : undefined;
      if (groupId) await existing(store, 'groups', groupId);
      const options: ListOptions = { limit: integerValue(payload, 'limit', 25, 1, 100), offset: integerValue(payload, 'offset', 0, 0) };
      const search = stringValue(payload, 'search', false, true);
      const published = booleanValue(payload, 'published');
      if (groupId !== undefined) options.groupId = groupId;
      if (search) options.search = search;
      if (published !== undefined) options.published = published;
      return { ...await store.list(methodName === 'list-faq-groups' ? 'groups' : 'questions', options) };
    }
    if (methodName === 'create-faq-group') {
      const fields = changes(payload, 'groups', true);
      const title = stringValue(payload, 'title', true) ?? '';
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'faq';
      const connectionKey = `${slug}-${uniqueId()}`;
      return { group: await store.insert('groups', { description: '', published: false, defaultLayout: 'classic', defaultPreset: 'classic', usageCount: 0, ...fields, connectionKey, slug: connectionKey }) };
    }
    if (methodName === 'update-faq-group') {
      const id = stringValue(payload, 'groupId', true) ?? '';
      const fields = changes(payload, 'groups', false);
      return { group: await store.update('groups', { ...await existing(store, 'groups', id), ...fields, _id: id }) };
    }
    if (methodName === 'create-faq-question') {
      const groupId = stringValue(payload, 'groupId', true) ?? '';
      const fields = changes(payload, 'questions', true);
      await existing(store, 'groups', groupId);
      return { item: await store.insert('questions', { category: '', published: true, ...fields, groupId, sortOrder: await store.nextSortOrder(groupId) }) };
    }
    if (methodName === 'update-faq-question') {
      const id = stringValue(payload, 'questionId', true) ?? '';
      const fields = changes(payload, 'questions', false);
      const record = await existing(store, 'questions', id);
      const groupId = stringValue(record, 'groupId', true) ?? '';
      await existing(store, 'groups', groupId);
      return { item: await store.update('questions', { ...record, ...fields, _id: id }) };
    }
    throw new Error(`Unknown FAQ tool: ${methodName}`);
  };
}
