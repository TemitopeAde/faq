import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

async function fixture({ isFree = true, ownerEmail, active = true, mismatch = false, failBilling = false, testingAllowed = false } = {}) {
  const calls = [];
  const context = createContext({ Request, Response, URL, console: { error() {} } });
  const instances = { getAppInstance: async () => {
    calls.push('billing');
    if (failBilling) throw new Error('Wix is unavailable');
    return { instance: { instanceId: mismatch ? 'other-site' : 'site-a', isFree, freeTrialAvailable: true }, site: { ownerInfo: { email: ownerEmail } } };
  } };
  const makeQuery = (elevated) => (collection) => {
    calls.push({ collection, elevated, filters: [] });
    const call = calls.at(-1);
    const query = {
      eq: (field, value) => { call.filters.push([field, value]); return query; },
      ascending: () => query,
      limit: () => query,
      find: async () => {
        if (!elevated && !testingAllowed) throw new Error('CMS read permission denied');
        return { items: collection.endsWith('faq-groups') ? [{ _id: 'g1', connectionKey: 'key', published: true }] : [{ _id: 'q1', published: true }], hasNext: () => false };
      },
    };
    return query;
  };
  const items = { query: makeQuery(false) };
  const auth = {
    getTokenInfo: async () => { calls.push('token'); return { active, instanceId: 'site-a' }; },
    elevate: (fn) => {
      if (fn === instances.getAppInstance) return fn;
      assert.equal(fn, items.query);
      calls.push('elevate-content');
      return makeQuery(true);
    },
  };
  const cache = new Map();
  async function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = await readFile(path, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const mod = new SourceTextModule(code, { context, identifier: path });
    cache.set(path, mod);
    await mod.link(async (name, parent) => {
      const exports = name === '@wix/essentials' ? { auth } : name === '@wix/data' ? { items } : name === '@wix/app-management' ? { appInstances: instances } : null;
      if (exports) return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
      return load(resolve(dirname(parent.identifier), `${name}.ts`));
    });
    return mod;
  }
  const module = await load(resolve('src/pages/api/faq-content.ts'));
  await module.evaluate();
  const request = async (search = '', authenticated = true) => {
    const url = new URL(`https://app.test/api/faq-content?connectionKey=key${search}`);
    return module.namespace.GET({ request: new Request(url, { headers: authenticated ? { authorization: 'test-token' } : {} }), url });
  };
  return { calls, request };
}

test('unauthenticated content calls are rejected before querying Wix', async () => {
  const { request, calls } = await fixture();
  assert.equal((await request('', false)).status, 401);
  assert.equal(calls.length, 0);
});

test('inactive and mismatched app tokens cannot read content', async () => {
  for (const options of [{ active: false }, { mismatch: true }]) {
    const { request, calls } = await fixture(options);
    assert.ok([401, 403].includes((await request()).status));
    assert.equal(calls.some((call) => typeof call === 'object'), false);
  }
});

test('Basic live requests cannot retrieve FAQ content or spoof owner email', async () => {
  const { request, calls } = await fixture();
  const response = await request('&ownerEmail=employee@wix.com&isFree=false&instanceId=paid-site');
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.some((call) => typeof call === 'object'), false);
});

test('a visitor claiming testing mode never gets elevated content access', async () => {
  const { request, calls } = await fixture();
  assert.notEqual((await request('&mode=testing')).status, 200);
  assert.equal(calls.includes('elevate-content'), false);
});

test('authorized testing uses ordinary collection permissions', async () => {
  const { request, calls } = await fixture({ testingAllowed: true });
  assert.equal((await request('&mode=testing')).status, 200);
  assert.equal(calls.includes('elevate-content'), false);
  assert.equal(calls.filter((call) => typeof call === 'object').every((call) => !call.elevated), true);
});

test('paid and Wix-owner live requests only query published groups and questions', async () => {
  for (const options of [{ isFree: false }, { ownerEmail: 'employee@wix.com' }]) {
    const { request, calls } = await fixture(options);
    const response = await request();
    assert.equal(response.status, 200);
    const queries = calls.filter((call) => typeof call === 'object');
    assert.equal(queries.length, 2);
    assert.equal(queries.every((call) => call.elevated && call.filters.some(([field, value]) => field === 'published' && value === true)), true);
  }
});

test('billing failures fail closed without retrieving content', async () => {
  const { request, calls } = await fixture({ isFree: false, failBilling: true });
  assert.equal((await request()).status, 503);
  assert.equal(calls.some((call) => typeof call === 'object'), false);
});
