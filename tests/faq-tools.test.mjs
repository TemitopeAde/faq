import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFAQToolRunner } from '../src/lib/faq-tools-runtime.ts';
import { faqToolDefinitions } from '../src/lib/faq-tools-contracts.ts';

function fixture() {
  const groups = new Map([['g1', { _id: 'g1', title: 'Shipping', connectionKey: 'stable-key', published: false, customField: 'keep' }]]);
  const questions = new Map([
    ['q1', { _id: 'q1', groupId: 'g1', question: 'Where is it?', title: 'Where is it?', answer: '<p>Here</p>', sortOrder: 9, published: false, category: 'Shipping', customField: 'keep' }],
    ['q2', { _id: 'q2', groupId: 'g1', question: 'When?', answer: '<p>Tomorrow</p>', sortOrder: 15, published: true }],
  ]);
  const calls = [];
  const records = (kind) => kind === 'groups' ? groups : questions;
  const store = {
    get: async (kind, id) => records(kind).get(id) ?? null,
    insert: async (kind, data) => {
      const created = { ...data, _id: `${kind}-${records(kind).size + 1}` };
      records(kind).set(created._id, created);
      return created;
    },
    update: async (kind, data) => { records(kind).set(data._id, data); return data; },
    nextSortOrder: async (groupId) => Math.max(-1, ...[...questions.values()].filter((item) => item.groupId === groupId).map((item) => item.sortOrder)) + 1,
    list: async (kind, options) => {
      calls.push({ kind, options });
      const matching = [...records(kind).values()].filter((item) =>
        (!options.groupId || item.groupId === options.groupId) &&
        (options.published === undefined || item.published === options.published) &&
        (!options.search || String(item.title ?? item.question).toLowerCase().includes(options.search.toLowerCase())));
      const next = options.offset + options.limit;
      return { items: matching.slice(options.offset, next), totalCount: matching.length, limit: options.limit, offset: options.offset, nextOffset: next < matching.length ? next : null };
    },
  };
  return { run: createFAQToolRunner(store, () => 'unique-id'), groups, questions, calls };
}

test('all six activated declarations have working handlers', async () => {
  const { run } = fixture();
  const payloads = {
    'list-faq-groups': {}, 'list-faq-questions': { groupId: 'g1' },
    'create-faq-group': { title: 'Returns' }, 'update-faq-group': { groupId: 'g1', title: 'Delivery' },
    'create-faq-question': { groupId: 'g1', question: 'How?', answer: '<p>Like this</p>' },
    'update-faq-question': { questionId: 'q1', published: true },
  };
  assert.equal(faqToolDefinitions.length, 6);
  assert.equal(new Set(faqToolDefinitions.map((tool) => tool.methodName)).size, 6);
  for (const tool of faqToolDefinitions) {
    assert.equal(tool.activated, true);
    assert.ok(tool.methodName.length <= 30);
    assert.ok(tool.description.length >= 10 && tool.description.length <= 1000);
    assert.ok(await run(tool.methodName, payloads[tool.methodName]));
  }
});

test('rejects malformed payloads and unexpected fields without writing', async () => {
  const { run, groups, questions } = fixture();
  const invalid = [
    ['unknown', {}], ['list-faq-groups', null], ['list-faq-groups', []],
    ['list-faq-groups', { limit: 0 }], ['list-faq-groups', { limit: 101 }],
    ['list-faq-groups', { offset: -1 }], ['list-faq-groups', { offset: 1.5 }],
    ['list-faq-groups', { published: 'false' }], ['list-faq-groups', { search: 1 }],
    ['create-faq-group', { title: ' ' }], ['create-faq-group', { title: 'A', connectionKey: 'overwrite' }],
    ['create-faq-question', { groupId: 'g1', question: 'A' }],
    ['create-faq-question', { groupId: 'g1', question: 'A', answer: '<p>&nbsp;</p>' }],
    ['update-faq-group', { groupId: 'g1' }], ['update-faq-question', { questionId: 'q1', groupId: 'g2' }],
    ['update-faq-question', { questionId: 'q1', published: null }],
  ];
  for (const [method, payload] of invalid) await assert.rejects(run(method, payload));
  assert.equal(groups.size, 1);
  assert.equal(questions.size, 2);
});

test('rejects missing groups, questions and orphaned questions', async () => {
  const { run, groups } = fixture();
  await assert.rejects(run('list-faq-questions', { groupId: 'missing' }), /group not found/);
  await assert.rejects(run('update-faq-group', { groupId: 'missing', published: true }), /group not found/);
  await assert.rejects(run('update-faq-question', { questionId: 'missing', published: true }), /question not found/);
  await assert.rejects(run('create-faq-question', { groupId: 'missing', question: 'A', answer: 'B' }), /group not found/);
  groups.delete('g1');
  await assert.rejects(run('update-faq-question', { questionId: 'q1', published: true }), /group not found/);
});

test('creation uses dashboard defaults and appends after the highest sort order', async () => {
  const { run } = fixture();
  const { group } = await run('create-faq-group', { title: ' Returns ' });
  assert.equal(group.title, 'Returns');
  assert.equal(group.published, false);
  assert.equal(group.defaultLayout, 'classic');
  assert.equal(group.defaultPreset, 'classic');
  assert.equal(group.connectionKey, 'returns-unique-id');
  assert.equal(group.slug, group.connectionKey);
  const { item } = await run('create-faq-question', { groupId: 'g1', question: ' How? ', answer: '<p>Like this</p>' });
  assert.equal(item.sortOrder, 16);
  assert.equal(item.published, true);
  assert.equal(item.title, item.question);
  const draft = await run('create-faq-question', { groupId: 'g1', question: 'Image?', answer: '<img src="https://example.com/a.png">', published: false });
  assert.equal(draft.item.published, false);
  assert.equal(draft.item.sortOrder, 17);
});

test('updates preserve unrelated fields, connections and order, and support publish/unpublish', async () => {
  const { run } = fixture();
  const { group } = await run('update-faq-group', { groupId: 'g1', title: 'Delivery', published: true, description: '' });
  assert.equal(group.connectionKey, 'stable-key');
  assert.equal(group.customField, 'keep');
  assert.equal(group.published, true);
  assert.equal((await run('update-faq-group', { groupId: 'g1', published: false })).group.published, false);
  const { item } = await run('update-faq-question', { questionId: 'q1', question: 'New question?', category: '', published: true });
  assert.equal(item.title, 'New question?');
  assert.equal(item.answer, '<p>Here</p>');
  assert.equal(item.groupId, 'g1');
  assert.equal(item.sortOrder, 9);
  assert.equal(item.customField, 'keep');
  assert.equal(item.category, '');
  assert.equal((await run('update-faq-question', { questionId: 'q1', published: false })).item.published, false);
});

test('reads propagate pagination and filters and expose record IDs', async () => {
  const { run, calls } = fixture();
  const first = await run('list-faq-questions', { groupId: 'g1', limit: 1 });
  assert.equal(first.items[0]._id, 'q1');
  assert.equal(first.totalCount, 2);
  assert.equal(first.nextOffset, 1);
  const second = await run('list-faq-questions', { groupId: 'g1', limit: 1, offset: first.nextOffset });
  assert.equal(second.items[0]._id, 'q2');
  assert.equal(second.nextOffset, null);
  const filtered = await run('list-faq-questions', { groupId: 'g1', search: 'where', published: false });
  assert.equal(filtered.items.length, 1);
  assert.deepEqual(calls.at(-1).options, { groupId: 'g1', search: 'where', published: false, limit: 25, offset: 0 });
  const groups = await run('list-faq-groups');
  assert.equal(groups.items[0]._id, 'g1');
  assert.equal(groups.items[0].connectionKey, 'stable-key');
  assert.equal((await run('list-faq-groups', { offset: 100 })).items.length, 0);
});
