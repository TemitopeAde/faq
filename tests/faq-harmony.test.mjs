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
const { readdirSync } = await import('node:fs');
const localeCodes = readdirSync('src/lib/i18n/locales').filter((file) => file.endsWith('.ts')).map((file) => file.replace(/\.ts$/, ''));
const localeImports = localeCodes.map((code) => `import locale_${code} from './src/lib/i18n/locales/${code}';`).join('\n');
const templateCodes = readdirSync('src/lib/i18n/templates').filter((file) => file.endsWith('.ts')).map((file) => file.replace(/\.ts$/, ''));
const templateImports = templateCodes.map((code) => `import template_${code} from './src/lib/i18n/templates/${code}';`).join('\n');
// Only mock the authenticated transport boundary. UI, content lifecycle, and tool routing are real.
const result = await build({
  stdin: {
    contents: `export { default as Widget } from './src/extensions/site/components/faq-harmony/faq-harmony';
      export { EditorPreviewContext } from './src/extensions/site/components/faq-harmony/editor-context';
      export { createFAQToolRunner } from './src/lib/faq-tools-runtime';
      export { faqToolDefinitions } from './src/lib/faq-tools-contracts';
      export { SUPPORTED_LANGUAGES, getUIStrings, isRTL, normalizeLanguage } from './src/lib/faq-i18n';
      export { parseCSV, toCSV } from './src/lib/faq-csv';
      export { EN } from './src/lib/i18n/en';
      ${localeImports}
      export const LOCALES = { ${localeCodes.map((code) => `${code}: locale_${code}`).join(', ')} };
      export { FAQ_TEMPLATES } from './src/lib/faq-templates';
      export { FAQ_PRESETS, presetProps } from './src/lib/faq-presets';
      export { itemsForLanguage } from './src/lib/faq-data';
      ${templateImports}
      export const TEMPLATE_CONTENT = { ${templateCodes.map((code) => `${code}: template_${code}`).join(', ')} };`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  plugins: [{ name: 'test-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^react(?:\/|$)/ }, (args) => ({ path: require.resolve(args.path), external: true }));
    plugin.onResolve({ filter: /faq-api$/ }, () => ({ path: 'faq-api', namespace: 'mock' }));
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
      export const fetchFAQContent = (...args) => globalThis.faqTestAPI.fetch(...args);
      export const fetchAllFAQContent = (...args) => globalThis.faqTestAPI.fetchAll(...args);
      export const recordFAQEvent = (...args) => globalThis.faqTestAPI.record(...args);` }));
    plugin.onResolve({ filter: /\.module\.css$/ }, () => ({ path: 'css', namespace: 'css' }));
    plugin.onLoad({ filter: /.*/, namespace: 'css' }, () => ({ contents: 'export default new Proxy({}, { get: (_, key) => String(key) });' }));
  } }],
});
const { writeFile } = await import('node:fs/promises');
const bundle = path.join(temporary, 'widget.cjs');
await writeFile(bundle, result.outputFiles[0].text);
const { Widget, EditorPreviewContext, createFAQToolRunner, faqToolDefinitions, SUPPORTED_LANGUAGES, getUIStrings, isRTL, parseCSV, toCSV, EN, LOCALES, FAQ_TEMPLATES, TEMPLATE_CONTENT, FAQ_PRESETS, presetProps, itemsForLanguage } = require(bundle);
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
  globalThis.faqTestAPI = {
    fetch: async () => content,
    // By default every group list is the single-group response, so tests written for one group keep working.
    fetchAll: async (testing, language) => { const result = await globalThis.faqTestAPI.fetch('help', testing, language); return result && { groups: result.group ? [result] : [] }; },
    record: async (event) => { events.push(event); },
  };
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

const studio = {
  group: { _id: 'group-2', title: 'Studio Location', connectionKey: 'studio', published: true },
  faqItems: [{ _id: 'parking', question: 'Is there parking?', answer: '<p>Yes, free street parking.</p>' }],
};
const lessons = {
  group: { _id: 'group-3', title: 'Piano Lessons', connectionKey: 'lessons', published: true },
  faqItems: [{ _id: 'cost', question: 'How much do lessons cost?', answer: '<p>Forty dollars.</p>' }],
};

test('every FAQ group shows as a tab, starting on the connected group', async () => {
  const calls = [];
  globalThis.faqTestAPI.fetchAll = async (testing) => { calls.push(testing); return { groups: [content, studio, lessons] }; };
  mount({ connectionKey: 'studio' }, true);
  const tabs = await screen.findAllByRole('tab');
  assert.deepEqual(tabs.map((tab) => tab.textContent), ['Help', 'Studio Location', 'Piano Lessons']);
  assert.equal(screen.getByRole('tab', { name: 'Studio Location' }).getAttribute('aria-selected'), 'true');
  assert.ok(screen.getByRole('button', { name: /Is there parking/ }));
  assert.equal(screen.queryByRole('button', { name: /When will/ }), null);
  assert.ok(screen.getByRole('tabpanel'));
  assert.deepEqual(calls, [true]);
});

test('group tabs switch questions, support arrow keys and track the active group', async () => {
  globalThis.faqTestAPI.fetchAll = async () => ({ groups: [content, studio, lessons] });
  mount();
  const help = await screen.findByRole('tab', { name: 'Help' });
  assert.equal(help.getAttribute('aria-selected'), 'true');
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'return' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Piano Lessons' }));
  assert.equal(screen.getByRole('searchbox').value, '');
  assert.equal(screen.queryByRole('button', { name: /Can I return/ }), null);
  fireEvent.click(screen.getByRole('button', { name: /How much do lessons/ }));
  assert.deepEqual(events.at(-1), { type: 'open', groupId: 'group-3', itemId: 'cost' });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Piano Lessons' }), { key: 'ArrowRight' });
  assert.equal(screen.getByRole('tab', { name: 'Help' }).getAttribute('aria-selected'), 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Help' }), { key: 'End' });
  assert.equal(screen.getByRole('tab', { name: 'Piano Lessons' }).getAttribute('aria-selected'), 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Piano Lessons' }), { key: 'Home' });
  assert.equal(screen.getByRole('tab', { name: 'Help' }).getAttribute('aria-selected'), 'true');
  assert.equal(screen.getByRole('tab', { name: 'Help' }).tabIndex, 0);
  assert.equal(screen.getByRole('tab', { name: 'Studio Location' }).tabIndex, -1);
});

test('a single group shows no tab bar, and deep links switch to the linked group', async () => {
  mount();
  await screen.findByRole('button', { name: /When will/ });
  assert.equal(screen.queryByRole('tablist'), null);
  cleanup();
  globalThis.faqTestAPI.fetchAll = async () => ({ groups: [content, studio] });
  window.history.replaceState(null, '', '/#faq-is-there-parking');
  mount();
  await waitFor(() => assert.equal(screen.getByRole('tab', { name: 'Studio Location' }).getAttribute('aria-selected'), 'true'));
  assert.equal(screen.getByRole('button', { name: /Is there parking/ }).getAttribute('aria-expanded'), 'true');
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

test('top 20 languages are defined with RTL detection and UI dictionaries', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 21); // 1 all-languages + 20 top languages
  const top20Codes = ['en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'pt', 'ru', 'ur', 'id', 'de', 'ja', 'tr', 'ko', 'vi', 'it', 'pl', 'nl', 'he'];
  for (const code of top20Codes) {
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    assert.ok(match, `Missing language definition for ${code}`);
    assert.ok(match.name, `Missing name for ${code}`);
    assert.ok(match.nativeName, `Missing nativeName for ${code}`);
  }
  // Check RTL
  assert.equal(isRTL('ar'), true);
  assert.equal(isRTL('he'), true);
  assert.equal(isRTL('ur'), true);
  assert.equal(isRTL('en'), false);
  assert.equal(isRTL('es'), false);

  // Check UI strings for top languages
  const es = getUIStrings('es');
  assert.equal(es.search, 'Buscar preguntas');
  assert.equal(es.helpfulYes, 'Sí');

  const fr = getUIStrings('fr');
  assert.equal(fr.search, 'Rechercher des questions');
  assert.equal(fr.helpfulYes, 'Oui');

  const ar = getUIStrings('ar');
  assert.equal(ar.helpfulYes, 'نعم');
  assert.equal(ar.expandAll, 'توسيع الكل');

  const he = getUIStrings('he');
  assert.equal(he.helpfulYes, 'כן');

  const ja = getUIStrings('ja');
  assert.equal(ja.helpfulYes, 'はい');
});

test('widget adapts to selected language with localized controls and RTL layout', async () => {
  // Spanish test
  mount({ language: 'es' });
  await screen.findByRole('button', { name: /When will/ });
  assert.ok(screen.getByPlaceholderText('Buscar preguntas…'));
  assert.ok(screen.getByRole('button', { name: 'Expandir todo' }));
  assert.ok(screen.getByRole('button', { name: 'Contraer todo' }));
  cleanup();

  // Arabic test (RTL)
  const arabicView = mount({ language: 'ar' });
  await screen.findByRole('button', { name: /When will/ });
  assert.equal(arabicView.container.querySelector('section').getAttribute('dir'), 'rtl');
  assert.ok(screen.getByPlaceholderText('البحث في الأسئلة…'));
  cleanup();
});

test('CSV import and export supports language column', () => {
  const items = [
    { question: 'What is this?', answer: '<p>An FAQ app</p>', category: 'General', language: 'en', published: true, sortOrder: 0, groupId: 'g1' },
    { question: '¿Qué es esto?', answer: '<p>Una app de FAQ</p>', category: 'General', language: 'es', published: true, sortOrder: 1, groupId: 'g1' },
  ];
  const csv = toCSV(items);
  assert.ok(csv.includes('language'));
  assert.ok(csv.includes('es'));

  const parsed = parseCSV(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].language, 'en');
  assert.equal(parsed[1].language, 'es');
  assert.equal(parsed[1].question, '¿Qué es esto?');
});

test('language is configured via panel prop rather than on-widget dropdown', async () => {
  const multiContentEs = {
    group: { _id: 'group-1', title: 'Help', connectionKey: 'help', published: true },
    faqItems: [
      { _id: 'q2', question: '¿Cuándo llegará mi pedido?', answer: '<p>Tres días</p>', language: 'es' },
    ],
  };
  globalThis.faqTestAPI.fetch = async (_key, _isEditor, lang) => {
    if (lang === 'es') return multiContentEs;
    return content;
  };

  const { container } = mount();
  await screen.findByRole('button', { name: /When will/ });
  // Ensure NO language switcher dropdown exists directly on the widget
  assert.equal(screen.queryByRole('combobox'), null);
  assert.equal(container.querySelector('select'), null);
  cleanup();

  // Passing language prop (from panel setting) renders widget in that language
  mount({ language: 'es' });
  await screen.findByRole('button', { name: /¿Cuándo llegará/ });
  assert.ok(screen.getByPlaceholderText('Buscar preguntas…'));
  assert.equal(screen.queryByRole('combobox'), null);
  cleanup();
});

test('every widget language translates every visitor-facing string', () => {
  const english = getUIStrings('en');
  for (const { code } of SUPPORTED_LANGUAGES.filter((language) => language.code && language.code !== 'en')) {
    const strings = getUIStrings(code);
    for (const key of Object.keys(english)) {
      assert.ok(strings[key]?.trim(), `${code} is missing ${key}`);
    }
    // These are always translated; matching English would mean the key fell back.
    for (const key of ['heading', 'helpText', 'helpLabel', 'editorAddConnection', 'editorLoadError', 'noResults']) {
      assert.notEqual(strings[key], english[key], `${code}.${key} is still English`);
    }
  }
});

test('widget default heading follows the visitor language, while custom headings stay as written', async () => {
  mount({ language: 'de' });
  await screen.findByRole('button', { name: /When will/ });
  assert.ok(screen.getByRole('heading', { level: 2, name: 'Häufig gestellte Fragen' }));
  cleanup();
  mount({ language: 'de', heading: 'Unsere FAQ' });
  await screen.findByRole('button', { name: /When will/ });
  assert.ok(screen.getByRole('heading', { level: 2, name: 'Unsere FAQ' }));
});

test('dashboard and editor panel have a complete catalog for every supported language', () => {
  const widgetLanguages = SUPPORTED_LANGUAGES.map((language) => language.code).filter((code) => code && code !== 'en');
  assert.deepEqual([...Object.keys(LOCALES)].sort(), [...widgetLanguages].sort());
  const variables = (text) => [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
  for (const [code, catalog] of Object.entries(LOCALES)) {
    for (const [key, source] of Object.entries(EN)) {
      const translated = catalog[key];
      assert.ok(translated !== undefined, `${code} is missing ${key}`);
      // Spelled-out plural forms ("one question") may drop {{count}}; everything else keeps its variables.
      const expected = /_one$/.test(key) ? variables(source).filter((name) => name !== 'count') : variables(source);
      for (const name of expected) assert.ok(translated.includes(`{{${name}}}`), `${code}.${key} lost {{${name}}}`);
    }
  }
});

test('template starter questions are translated for every dashboard language', () => {
  assert.deepEqual(Object.keys(TEMPLATE_CONTENT).sort(), Object.keys(LOCALES).sort());
  const tags = (html) => (html.match(/<\/?strong>/g) ?? []).length;
  for (const [code, content] of Object.entries(TEMPLATE_CONTENT)) {
    for (const template of FAQ_TEMPLATES) {
      const entries = content[template.id];
      assert.equal(entries?.length, template.items.length, `${code}/${template.id} has a different number of questions`);
      const categoryNames = new Map();
      template.items.forEach((item, index) => {
        const [category, question, answer] = entries[index];
        assert.ok(category.trim() && question.trim() && answer.trim(), `${code}/${template.id}[${index}] is empty`);
        assert.notEqual(question, item.question, `${code}/${template.id}[${index}] is still English`);
        assert.equal(tags(answer), tags(item.answer), `${code}/${template.id}[${index}] lost formatting`);
        // The same English category must map to one translated category, or the filter chips would split.
        const previous = categoryNames.get(item.category);
        assert.ok(!previous || previous === category, `${code}/${template.id} translates "${item.category}" inconsistently`);
        categoryNames.set(item.category, category);
      });
    }
  }
});

test('layout presets only change the look and each one has a distinct style', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile('src/extensions/site/widgets/faq-widget/faq-widget.module.css', 'utf8');
  const looks = new Set();
  for (const preset of FAQ_PRESETS) {
    const props = presetProps(preset);
    // Picking a preset must never wipe the group connection or the site owner's text.
    for (const key of ['connection-key', 'heading', 'description', 'search-placeholder', 'help-text', 'help-label', 'help-link', 'language']) {
      assert.equal(key in props, false, `${preset.id} overwrites ${key}`);
    }
    assert.ok(['accordion', 'grid', 'cards', 'tabs'].includes(props.display), `${preset.id} has no display style`);
    assert.ok(css.includes(`[data-layout="${preset.id}"]`), `${preset.id} has no preset CSS`);
    looks.add(JSON.stringify([props.display, props.radius, props.gap, props.padding, props['question-font'], props['background-color'], props['accent-color']]));
  }
  assert.equal(looks.size, FAQ_PRESETS.length, 'two presets produce the same look');
});

test('visitors only see questions in their language plus questions for all languages', () => {
  const items = [{ id: 'any' }, { id: 'en', language: 'en' }, { id: 'es', language: 'es' }, { id: 'all', language: 'all' }, { id: 'pt', language: 'pt-BR' }];
  const ids = (list) => list.map((item) => item.id);
  assert.deepEqual(ids(itemsForLanguage(items, 'es')), ['any', 'es', 'all']);
  assert.deepEqual(ids(itemsForLanguage(items, 'pt')), ['any', 'all', 'pt']);
  // No Hindi questions: universal ones only, never Spanish or English-tagged ones mixed in.
  assert.deepEqual(ids(itemsForLanguage(items, 'hi')), ['any', 'all']);
  // Everything tagged and nothing in Hindi: one language, not all of them.
  assert.deepEqual(ids(itemsForLanguage([{ id: 'en', language: 'en' }, { id: 'es', language: 'es' }], 'hi')), ['en']);
  assert.deepEqual(ids(itemsForLanguage(items, '')), ids(items));
});
