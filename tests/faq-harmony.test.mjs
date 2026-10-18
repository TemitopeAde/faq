import { after, afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://faq.test' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'MutationObserver', 'sessionStorage']) {
  globalThis[name] = dom.window[name];
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { render, screen, fireEvent, waitFor, cleanup, act } = await import('@testing-library/react');
const temporary = await mkdtemp(path.join(tmpdir(), 'faq-harmony-tests-'));
// Only mock the authenticated transport boundary. UI, content lifecycle, and tool routing are real.
const result = await build({
  stdin: {
    contents: `export { default as Widget } from './src/extensions/site/components/faq-harmony/faq-harmony';
      export { EditorPreviewContext } from './src/extensions/site/components/faq-harmony/editor-context';
      export { createFAQToolRunner } from './src/lib/faq-tools-runtime';
      export { faqToolDefinitions } from './src/lib/faq-tools-contracts';`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'test-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^react(?:\/|$)/ }, (args) => ({ path: require.resolve(args.path), external: true }));
    plugin.onResolve({ filter: /faq-api$/ }, () => ({ path: 'faq-api', namespace: 'mock' }));
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
      export const fetchFAQContent = (...args) => globalThis.faqTestAPI.fetch(...args);
      export const recordFAQEvent = (...args) => globalThis.faqTestAPI.record(...args);` }));
    plugin.onResolve({ filter: /\.module\.css$/ }, () => ({ path: 'css', namespace: 'css' }));
    plugin.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, { get: (_, key) => String(key) });' }));
  } }],
});
const { writeFile } = await import('node:fs/promises');
const bundle = path.join(temporary, 'widget.cjs');
await writeFile(bundle, result.outputFiles[0].text);
const { Widget, EditorPreviewContext, createFAQToolRunner, faqToolDefinitions } = require(bundle);
const content = {
  group: { _id: 'group-1', title: 'Help', connectionKey: 'help', published: true },
  faqItems: [
    { _id: 'shipping', question: 'When will my order arrive?', answer: '<p>Shipping takes three days.</p><a href="/shipping">Shipping policy</a>', category: 'Orders' },
    { _id: 'returns', question: 'Can I return an item?', answer: '<p>Returns are accepted for thirty days.</p>', category: 'Returns' },
  ],
};
const events = [];
beforeEach(() => {
  sessionStorage.clear(); events.length = 0;
  globalThis.faqTestAPI = { fetch: async () => content, record: async (event) => { events.push(event); } };
});
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });
after(async () => { dom.window.close(); delete globalThis.faqTestAPI; await rm(temporary, { recursive: true }); });
const mount = (props = {}, preview = false) => render(React.createElement(EditorPreviewContext.Provider, { value: preview }, React.createElement(Widget, { id: 'faq-1', connectionKey: 'help', ...props })));

test('accordion keeps collapsed links unfocusable and honors single-open behavior', async () => {
  mount({ singleOpen: true });
  const first = await screen.findByRole('button', { name: /When will/ });
  const second = screen.getByRole('button', { name: /Can I return/ });
  assert.equal(screen.queryByRole('link', { name: 'Shipping policy' }), null);
  fireEvent.click(first);
  assert.equal(first.getAttribute('aria-expanded'), 'true');
  assert.ok(screen.getByRole('link', { name: 'Shipping policy' }));
  fireEvent.click(second);
  assert.equal(first.getAttribute('aria-expanded'), 'false');
  assert.equal(second.getAttribute('aria-expanded'), 'true');
  fireEvent.click(second); fireEvent.click(second);
  assert.equal(events.filter((event) => event.type === 'open').length, 2);
});

test('search includes answer text and combines with category filters', async () => {
  mount(); await screen.findByRole('button', { name: /When will/ });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'thirty' } });
  assert.equal(screen.queryByRole('button', { name: /When will/ }), null);
  assert.ok(screen.getByRole('button', { name: /Can I return/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
  assert.ok(screen.getByText('No questions match your search or category.'));
});

test('tabs support arrow keys, Home/End and repair selection after filtering', async () => {
  mount({ display: 'tabs' });
  const tabs = await screen.findAllByRole('tab');
  tabs[0].focus(); fireEvent.keyDown(tabs[0], { key: 'End' });
  assert.equal(document.activeElement, tabs[1]);
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(screen.getAllByRole('tabpanel').length, 1);
  fireEvent.keyDown(tabs[1], { key: 'ArrowDown' });
  assert.equal(document.activeElement, tabs[0]);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'return' } });
  assert.equal(screen.getByRole('tab').getAttribute('aria-selected'), 'true');
  assert.equal(screen.getByRole('tab').tabIndex, 0);
});

test('feedback records once per session and preview never records or stores votes', async () => {
  const live = mount({ display: 'cards' });
  fireEvent.click((await screen.findAllByRole('button', { name: 'Yes' }))[0]);
  assert.equal(events[0].type, 'helpful');
  live.unmount();
  mount({ display: 'cards' });
  await screen.findByText('Thanks for your feedback!');
  cleanup(); sessionStorage.clear(); events.length = 0;
  mount({ display: 'cards' }, true);
  const vote = (await screen.findAllByRole('button', { name: 'Yes' }))[0];
  assert.equal(vote.disabled, true);
  fireEvent.click(vote);
  assert.equal(events.length, 0);
  assert.equal(sessionStorage.length, 0);
});

test('connection changes discard stale responses and preview uses testing reads', async () => {
  let resolveFirst;
  const calls = [];
  globalThis.faqTestAPI.fetch = (key, preview) => {
    calls.push([key, preview]);
    return key === 'first' ? new Promise((resolve) => { resolveFirst = resolve; }) : Promise.resolve({ ...content, faqItems: [content.faqItems[1]] });
  };
  const view = mount({ connectionKey: 'first' }, true);
  view.rerender(React.createElement(EditorPreviewContext.Provider, { value: true }, React.createElement(Widget, { id: 'faq-1', connectionKey: 'second' })));
  await screen.findByRole('button', { name: /Can I return/ });
  await act(async () => resolveFirst(content));
  assert.equal(screen.queryByRole('button', { name: /When will/ }), null);
  assert.deepEqual(calls, [['first', true], ['second', true]]);
});

test('plan rejection hides live FAQs, while network errors offer retry', async () => {
  globalThis.faqTestAPI.fetch = async () => null;
  const view = mount();
  await waitFor(() => assert.equal(view.container.querySelector('section').hidden, true));
  cleanup();
  const original = console.error;
  console.error = () => {};
  try {
    globalThis.faqTestAPI.fetch = async () => { throw new Error('offline'); };
    mount();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    globalThis.faqTestAPI.fetch = async () => content;
    fireEvent.click(retry);
    await screen.findByRole('button', { name: /When will/ });
  } finally { console.error = original; }
});

test('Aria connection tool validates inputs, reads existing group and never mutates it', async () => {
  const group = { ...content.group, connectionKey: 'existing-key' };
  const store = { get: async (kind, id) => kind === 'groups' && id === 'group-1' ? group : null };
  const run = createFAQToolRunner(store);
  const response = await run('get-faq-widget-connection', { groupId: 'group-1' });
  assert.equal(response.componentType, 'faq_app.FaqHarmony');
  assert.equal(response.props.connectionKey, 'existing-key');
  assert.equal(response.customElement.attributes['connection-key'], 'existing-key');
  await assert.rejects(run('get-faq-widget-connection', {}), /groupId/);
  await assert.rejects(run('get-faq-widget-connection', { groupId: 'missing' }), /not found/);
  await assert.rejects(run('get-faq-widget-connection', { groupId: 'group-1', published: true }), /Unexpected field/);
  await assert.rejects(run('get-faq-widget-connection', []), /payload/);
  assert.ok(faqToolDefinitions.every((tool) => tool.activated && tool.methodName.length <= 30));
  assert.equal(new Set(faqToolDefinitions.map((tool) => tool.methodName)).size, faqToolDefinitions.length);
});


test('multi-open accordions can close individual answers and preserve initially-open state', async () => {
  mount({ initiallyOpen: true });
  const first = await screen.findByRole('button', { name: /When will/ });
  const second = screen.getByRole('button', { name: /Can I return/ });
  assert.equal(first.getAttribute('aria-expanded'), 'true');
  fireEvent.click(second);
  assert.equal(first.getAttribute('aria-expanded'), 'true');
  assert.equal(second.getAttribute('aria-expanded'), 'true');
  fireEvent.click(first);
  assert.equal(first.getAttribute('aria-expanded'), 'false');
  assert.equal(second.getAttribute('aria-expanded'), 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  assert.equal(second.getAttribute('aria-expanded'), 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  assert.equal(first.getAttribute('aria-expanded'), 'true');
  assert.equal(second.getAttribute('aria-expanded'), 'true');
});


test('dashboard question deep links open the matching answer', async () => {
  window.history.replaceState(null, '', '#faq-can-i-return-an-item');
  mount();
  await waitFor(() => assert.equal(screen.getByRole('button', { name: /Can I return/ }).getAttribute('aria-expanded'), 'true'));
  assert.equal(screen.getByRole('button', { name: /When will/ }).getAttribute('aria-expanded'), 'false');
});
