import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { InvalidEventError, parseEventInput, summarize } from '../src/lib/faq-analytics.ts';

// ---------- Contract ----------

test('valid events keep only the stored fields', () => {
  assert.deepEqual(parseEventInput({ type: 'open', groupId: 'g1', itemId: 'q1', title: 'x', _owner: 'spoof' }), { type: 'open', groupId: 'g1', itemId: 'q1' });
  assert.deepEqual(parseEventInput({ type: 'search', groupId: 'g1', query: '  Shipping   TIME ', resultCount: 0 }), { type: 'search', groupId: 'g1', query: 'shipping time', resultCount: 0 });
});

test('malformed events are rejected', () => {
  const bad = [
    null, [], 'open',
    { type: 'delete', groupId: 'g1', itemId: 'q1' },
    { type: 'open', groupId: '', itemId: 'q1' },
    { type: 'helpful', groupId: 'g1' },
    { type: 'open', groupId: 'g'.repeat(65), itemId: 'q1' },
    { type: 'search', groupId: 'g1', query: 'a', resultCount: 1 },
    { type: 'search', groupId: 'g1', query: 'x'.repeat(121), resultCount: 1 },
    { type: 'search', groupId: 'g1', query: 'refunds', resultCount: -1 },
    { type: 'search', groupId: 'g1', query: 'refunds', resultCount: 1.5 },
  ];
  for (const body of bad) assert.throws(() => parseEventInput(body), InvalidEventError, JSON.stringify(body));
});

test('summaries count opens, votes and searches', () => {
  const summary = summarize([
    { type: 'open', groupId: 'g', itemId: 'q1' }, { type: 'open', groupId: 'g', itemId: 'q1' },
    { type: 'helpful', groupId: 'g', itemId: 'q1' }, { type: 'not-helpful', groupId: 'g', itemId: 'q2' },
    { type: 'search', groupId: 'g', query: 'refund', resultCount: 0, _createdDate: '2026-09-01T00:00:00Z' },
    { type: 'search', groupId: 'g', query: 'refund', resultCount: 2, _createdDate: '2026-09-02T00:00:00Z' },
  ]);
  assert.equal(summary.opens, 2);
  assert.equal(summary.helpful, 1);
  assert.equal(summary.notHelpful, 1);
  assert.equal(summary.searches, 2);
  assert.equal(summary.noResultSearches, 1);
  assert.deepEqual(summary.byItem.q1, { opens: 2, helpful: 1, notHelpful: 0 });
  assert.deepEqual(summary.searchesByQuery[0], { query: 'refund', count: 2, noResults: 1, lastSearched: Date.parse('2026-09-02T00:00:00Z') });
  // Must survive a JSON round trip, since the endpoint returns it.
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), summary);
});

// ---------- Endpoint ----------

async function fixture({ isFree = false, groupExists = true, itemExists = true, editor = false, events = [] } = {}) {
  const calls = [];
  const context = createContext({ Request, Response, URL, JSON, console: { error() {} } });
  const instances = { getAppInstance: async () => ({ instance: { instanceId: 'site-a', isFree, freeTrialAvailable: false }, site: { ownerInfo: { email: 'owner@example.com' } } }) };
  const makeQuery = (elevated) => (collection) => {
    const call = { collection, elevated, filters: [] };
    calls.push(call);
    const query = {
      eq: (field, value) => { call.filters.push(['eq', field, value]); return query; },
      ge: (field, value) => { call.filters.push(['ge', field, value]); return query; },
      descending: () => query,
      limit: () => query,
      find: async () => {
        if (collection.endsWith('faq-events')) {
          if (!elevated && !editor) throw Object.assign(new Error('Permission denied'), { code: 'WDE0027' });
          return { items: events, hasNext: () => false };
        }
        const exists = collection.endsWith('faq-groups') ? groupExists : itemExists;
        return { items: exists ? [{ _id: 'x', published: true }] : [], hasNext: () => false };
      },
    };
    return query;
  };
  const items = { query: makeQuery(false), insert: async () => { calls.push({ insert: 'unelevated' }); } };
  const auth = {
    getTokenInfo: async () => ({ active: true, instanceId: 'site-a' }),
    elevate: (fn) => {
      if (fn === instances.getAppInstance) return fn;
      if (fn === items.query) return makeQuery(true);
      if (fn === items.insert) return async (collection, data) => { calls.push({ insert: collection, data }); };
      throw new Error('Unexpected elevation');
    },
  };
  // Cache the in-flight load (not the finished module) so a file imported by two modules
  // at once is instantiated once; otherwise `instanceof FAQAccessError` breaks across copies.
  const cache = new Map();
  const load = (path) => {
    if (!cache.has(path)) cache.set(path, (async () => {
      const source = await readFile(path, 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
      return new SourceTextModule(code, { context, identifier: path });
    })());
    return cache.get(path);
  };
  const linker = async (name, parent) => {
    const exports = name === '@wix/essentials' ? { auth } : name === '@wix/data' ? { items } : name === '@wix/app-management' ? { appInstances: instances } : null;
    if (exports) return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    return load(resolve(dirname(parent.identifier), `${name}.ts`));
  };
  const module = await load(resolve('src/pages/api/faq-analytics.ts'));
  await module.link(linker);
  await module.evaluate();
  const headers = (authenticated) => (authenticated ? { authorization: 'test-token' } : {});
  const post = (body, authenticated = true) => {
    const url = new URL('https://app.test/api/faq-analytics');
    return module.namespace.POST({ request: new Request(url, { method: 'POST', headers: headers(authenticated), body: typeof body === 'string' ? body : JSON.stringify(body) }), url });
  };
  const get = (search = '', authenticated = true) => {
    const url = new URL(`https://app.test/api/faq-analytics${search}`);
    return module.namespace.GET({ request: new Request(url, { headers: headers(authenticated) }), url });
  };
  const inserts = () => calls.filter((call) => call.insert);
  return { calls, post, get, inserts };
}

const openEvent = { type: 'open', groupId: 'g1', itemId: 'q1' };

test('POST rejects unauthenticated callers and Basic sites without writing', async () => {
  const anonymous = await fixture();
  assert.equal((await anonymous.post(openEvent, false)).status, 401);
  const basic = await fixture({ isFree: true });
  assert.equal((await basic.post(openEvent)).status, 403);
  for (const { calls } of [anonymous, basic]) assert.equal(calls.length, 0);
});

test('POST rejects invalid and oversized bodies before touching data', async () => {
  const { post, calls } = await fixture();
  assert.equal((await post('{not json')).status, 400);
  assert.equal((await post({ type: 'open', groupId: 'g1' })).status, 400);
  assert.equal((await post({ ...openEvent, padding: 'x'.repeat(3000) })).status, 413);
  assert.equal(calls.length, 0);
});

test('POST refuses events for unknown or unpublished groups and questions', async () => {
  for (const options of [{ groupExists: false }, { itemExists: false }]) {
    const { post, inserts } = await fixture(options);
    assert.equal((await post(openEvent)).status, 404);
    assert.equal(inserts().length, 0);
  }
});

test('POST verifies published content, then inserts only validated fields with elevation', async () => {
  const { post, calls, inserts } = await fixture();
  const response = await post({ ...openEvent, resultCount: 99, _owner: 'spoof' });
  assert.equal(response.status, 202);
  const lookups = calls.filter((call) => call.collection);
  assert.equal(lookups.length, 2);
  assert.equal(lookups.every((call) => call.elevated && call.filters.some(([op, field, value]) => op === 'eq' && field === 'published' && value === true)), true);
  assert.equal(inserts().length, 1);
  // JSON comparison: objects built inside the sandbox have a different Object prototype.
  assert.equal(JSON.stringify(inserts()[0]), JSON.stringify({ insert: '@admin14744/faq/faq-events', data: { title: 'open', type: 'open', groupId: 'g1', itemId: 'q1' } }));
});

test('POST search events skip the question lookup and store the normalized query', async () => {
  const { post, calls, inserts } = await fixture();
  assert.equal((await post({ type: 'search', groupId: 'g1', query: ' Late  Delivery ', resultCount: 0 })).status, 202);
  assert.equal(calls.filter((call) => call.collection).length, 1);
  assert.equal(inserts()[0].data.query, 'late delivery');
});

test('GET never elevates, so non-editors are refused', async () => {
  const { get, calls } = await fixture();
  assert.equal((await get()).status, 403);
  assert.equal(calls.some((call) => call.elevated), false);
});

test('GET returns a summary for editors with group and date filters applied', async () => {
  const { get, calls } = await fixture({ editor: true, events: [openEvent, { type: 'helpful', groupId: 'g1', itemId: 'q1' }] });
  const response = await get('?groupId=g1&range=7');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.truncated, false);
  assert.equal(body.summary.opens, 1);
  assert.deepEqual(body.summary.byItem.q1, { opens: 1, helpful: 1, notHelpful: 0 });
  const [query] = calls.filter((call) => call.collection);
  assert.equal(query.elevated, false);
  assert.ok(query.filters.some(([op, field, value]) => op === 'eq' && field === 'groupId' && value === 'g1'));
  assert.ok(query.filters.some(([op, field]) => op === 'ge' && field === '_createdDate'));
});

test('GET validates the range and requires authentication', async () => {
  const { get, calls } = await fixture({ editor: true });
  assert.equal((await get('?range=365')).status, 400);
  assert.equal((await get('', false)).status, 401);
  assert.equal(calls.length, 0);
});
