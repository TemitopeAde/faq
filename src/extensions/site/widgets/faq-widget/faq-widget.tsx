import { window as wixWindow } from '@wix/site-window';
import styles from './faq-widget.module.css';
import { presetById } from '../../../../lib/faq-presets';
import { iconById, iconSvg } from '../../../../lib/faq-icons';
import { categoriesOf, itemAnchors } from '../../../../lib/faq-data';
import { fetchFAQContent, recordFAQEvent } from '../../../../lib/faq-api';
import type { FAQEventType, FAQGroup, FAQItem, FontValue } from '../../../../lib/faq-types';

type Display = 'accordion' | 'grid' | 'cards' | 'tabs';
type WidgetData = { group: FAQGroup | null; faqItems: Array<FAQItem>; message: string; isEditor: boolean };

const DISPLAYS: Array<Display> = ['accordion', 'grid', 'cards', 'tabs'];
const SEARCH_TRACK_DELAY = 1200;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const safeUrl = (value: string): string => (/^(https?:|mailto:|tel:|\/|#)/i.test(value.trim()) ? value.trim() : '');
const highlight = (text: string, words: Array<string>): string => {
  if (!words.length) return escapeHtml(text);
  const pattern = new RegExp(`(${words.map(escapeRegex).join('|')})`, 'gi');
  return text.split(pattern).map((part, index) => (index % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))).join('');
};
const parseFont = (value: string | null, fallback: FontValue): FontValue => {
  if (!value) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null && 'font' in parsed && typeof parsed.font === 'string') {
      return { font: parsed.font, textDecoration: 'textDecoration' in parsed && typeof parsed.textDecoration === 'string' ? parsed.textDecoration : '' };
    }
  } catch (error) { console.error('Invalid FAQ font setting:', error); }
  return fallback;
};
const readSession = (key: string): string | null => { try { return window.sessionStorage.getItem(key); } catch { return null; } };
const writeSession = (key: string, value: string): void => { try { window.sessionStorage.setItem(key, value); } catch { /* storage unavailable */ } };

class FAQWidget extends HTMLElement {
  private renderToken = 0;
  private fetchQueued = false;
  private data: WidgetData | null = null;
  private anchors: Array<string> = [];
  private query = '';
  private category = '';
  private lastTrackedQuery = '';
  private searchTimer: number | undefined;
  private accessTimer: number | undefined;
  private readonly onFocus = (): void => this.queueFetch();
  private readonly trackedOpens = new Set<string>();
  private readonly onHashChange = (): void => this.openFromHash();

  static get observedAttributes(): Array<string> { return ['connection-key', 'layout', 'heading', 'description', 'background-color', 'question-color', 'answer-color', 'accent-color', 'border-color', 'question-font', 'answer-font', 'icon', 'icon-color', 'icon-size', 'radius', 'gap', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'initially-open', 'display', 'show-search', 'search-placeholder', 'show-categories', 'show-expand-all', 'single-open', 'show-feedback', 'seo-schema', 'animation', 'hover-effect', 'show-help', 'help-text', 'help-label', 'help-link', 'show-heading', 'show-description', 'show-icon']; }

  connectedCallback(): void {
    window.addEventListener('hashchange', this.onHashChange);
    window.addEventListener('focus', this.onFocus);
    this.accessTimer = window.setInterval(() => { if (document.visibilityState === 'visible') this.queueFetch(); }, 60_000);
    this.queueFetch();
  }
  disconnectedCallback(): void {
    ++this.renderToken;
    window.removeEventListener('hashchange', this.onHashChange);
    window.removeEventListener('focus', this.onFocus);
    window.clearTimeout(this.searchTimer);
    window.clearInterval(this.accessTimer);
  }
  // Only a new connection key needs fresh data; style and behaviour changes re-render what is already loaded.
  attributeChangedCallback(name: string): void { if (name === 'connection-key' || !this.data) this.queueFetch(); else this.renderMarkup(); }

  private getSetting(name: string, fallback: string): string { return this.getAttribute(name) || fallback; }
  private flag(name: string, fallback: boolean): boolean { return this.getSetting(name, String(fallback)) === 'true'; }
  private get display(): Display { const value = this.getSetting('display', 'accordion'); return DISPLAYS.includes(value as Display) ? value as Display : 'accordion'; }

  private queueFetch(): void {
    if (this.fetchQueued) return;
    this.fetchQueued = true;
    queueMicrotask(() => { this.fetchQueued = false; void this.load(); });
  }

  private async load(): Promise<void> {
    const token = ++this.renderToken;
    const connectionKey = this.getSetting('connection-key', '');
    let isEditor = false;
    const finish = (data: WidgetData): void => { if (token !== this.renderToken) return; this.data = data; this.anchors = itemAnchors(data.faqItems); this.renderMarkup(); this.openFromHash(); };
    try {
      const viewMode = await wixWindow.viewMode();
      isEditor = viewMode === 'Editor' || viewMode === 'Preview';
      if (token !== this.renderToken) return;
      if (!connectionKey) {
        if (isEditor) finish({ group: null, faqItems: [], message: 'Add a connection key to display your FAQs.', isEditor });
        else { this.data = null; this.anchors = []; this.replaceChildren(); }
        return;
      }
      const result = await fetchFAQContent(connectionKey, isEditor);
      if (token !== this.renderToken) return;
      if (!result) { this.data = null; this.anchors = []; this.replaceChildren(); return; }
      const { group, faqItems } = result;
      if (!group?._id) {
        finish({ group: null, faqItems: [], message: isEditor ? 'This connection key does not match an FAQ group.' : 'This connection key is invalid or unpublished.', isEditor });
        return;
      }
      const emptyMessage = isEditor ? 'Add FAQ items to this group to preview them here.' : 'No published FAQs are available yet.';
      finish({ group, faqItems, message: group.description || emptyMessage, isEditor });
    } catch (error) {
      console.error('Failed to load FAQ group:', error);
      if (token !== this.renderToken) return;
      if (isEditor) finish({ group: null, faqItems: [], message: 'Could not load FAQs. Check your plan status in the dashboard and retry.', isEditor });
      else { this.data = null; this.anchors = []; this.replaceChildren(); }
    }
  }

  // Analytics are only recorded on the live site, never while editing. The /api/faq-analytics
  // endpoint validates the event and is the only writer to the events collection.
  private track(type: FAQEventType, details: { itemId?: string; query?: string; resultCount?: number }): void {
    const groupId = this.data?.group?._id;
    if (!groupId || this.data?.isEditor) return;
    void recordFAQEvent({ type, groupId, ...details }).catch((error: unknown) => console.error('Failed to record FAQ event:', error));
  }

  private renderMarkup(): void {
    if (!this.data) return;
    const { faqItems, message } = this.data;
    const preset = presetById(this.getSetting('layout', 'classic'));
    const display = this.display;
    const icon = iconById(this.getSetting('icon', preset.icon)).id;
    const initiallyOpen = this.flag('initially-open', false);
    const singleOpen = this.flag('single-open', false);
    const showFeedback = this.flag('show-feedback', true) && Boolean(this.data.group);
    const categories = this.flag('show-categories', true) ? categoriesOf(faqItems) : [];
    if (this.category && !categories.includes(this.category)) this.category = '';
    const heading = escapeHtml(this.getSetting('heading', preset.heading));
    const description = escapeHtml(this.getSetting('description', message));
    const questionFont = parseFont(this.getAttribute('question-font'), preset.questionFont);
    const answerFont = parseFont(this.getAttribute('answer-font'), preset.answerFont);
    const helpLink = safeUrl(this.getSetting('help-link', ''));
    const isExternal = /^https?:/i.test(helpLink);

    const root = document.createElement('section');
    root.className = styles.root;
    Object.assign(root.dataset, { layout: preset.layout, display, animation: this.getSetting('animation', 'fade'), hover: this.getSetting('hover-effect', 'lift') });
    root.style.cssText = `--faq-bg:${this.getSetting('background-color', 'transparent')};--faq-question:${this.getSetting('question-color', preset.questionColor)};--faq-answer:${this.getSetting('answer-color', preset.answerColor)};--faq-accent:${this.getSetting('accent-color', preset.accentColor)};--faq-border:${this.getSetting('border-color', preset.borderColor)};--faq-icon:${this.getSetting('icon-color', preset.iconColor)};--faq-icon-size:${this.getSetting('icon-size', String(preset.iconSize))}px;--faq-radius:${this.getSetting('radius', String(preset.radius))}px;--faq-gap:${this.getSetting('gap', String(preset.gap))}px;--faq-padding:${this.getSetting('padding', '28')}px;--faq-margin-top:${this.getSetting('margin-top', '0')}px;--faq-margin-right:${this.getSetting('margin-right', '0')}px;--faq-margin-bottom:${this.getSetting('margin-bottom', '0')}px;--faq-margin-left:${this.getSetting('margin-left', '0')}px;--faq-question-font:${questionFont.font};--faq-answer-font:${answerFont.font};`;

    const feedback = (item: FAQItem): string => {
      if (!showFeedback || !item._id) return '';
      if (readSession(`faq-vote-${item._id}`)) return `<div class="${styles.feedback}"><span>Thanks for your feedback!</span></div>`;
      return `<div class="${styles.feedback}" data-feedback="${escapeHtml(item._id)}"><span>Was this helpful?</span><button type="button" class="${styles.vote}" data-vote="helpful">👍 Yes</button><button type="button" class="${styles.vote}" data-vote="not-helpful">👎 No</button></div>`;
    };
    const iconMarkup = this.flag('show-icon', true) ? `<span class="${styles.icon}" data-icon="${icon}" aria-hidden="true">${iconSvg(icon)}</span>` : '';
    const delay = (index: number): string => `style="--faq-delay:${Math.min(index, 10) * 60}ms"`;

    let list = '';
    if (!faqItems.length) list = `<p class="${styles.message}">${description}</p>`;
    else if (display === 'cards') {
      list = faqItems.map((item, index) => `<article class="${styles.item} ${styles.card}" id="${this.anchors[index]}" data-faq-index="${index}" ${delay(index)}><h3 class="${styles.cardQuestion}"><span data-question-text>${escapeHtml(item.question)}</span></h3><div class="${styles.answer}"><div class="${styles.answerBody}">${item.answer}</div>${feedback(item)}</div></article>`).join('');
    } else if (display === 'tabs') {
      const tabs = faqItems.map((item, index) => `<button type="button" role="tab" class="${styles.tab}" id="${this.anchors[index]}" data-faq-index="${index}" aria-selected="${index === 0}" aria-controls="${this.anchors[index]}-answer" ${delay(index)}><span data-question-text>${escapeHtml(item.question)}</span>${iconMarkup}</button>`).join('');
      const panels = faqItems.map((item, index) => `<div role="tabpanel" class="${styles.answer} ${styles.tabPanel}" id="${this.anchors[index]}-answer" data-faq-index="${index}" aria-labelledby="${this.anchors[index]}" ${index === 0 ? '' : 'hidden'}><h3>${escapeHtml(item.question)}</h3><div class="${styles.answerBody}">${item.answer}</div>${feedback(item)}</div>`).join('');
      list = `<div class="${styles.tabs}"><div role="tablist" aria-orientation="vertical" class="${styles.tabList}">${tabs}</div><div class="${styles.tabPanels}">${panels}</div></div>`;
    } else {
      list = faqItems.map((item, index) => { const open = initiallyOpen && index === 0; return `<article class="${styles.item}" id="${this.anchors[index]}" data-faq-index="${index}" ${delay(index)}><h3 class="${styles.questionHeading}"><button class="${styles.question}" type="button" aria-expanded="${open}" aria-controls="${this.anchors[index]}-answer"><span data-question-text>${escapeHtml(item.question)}</span>${iconMarkup}</button></h3><div class="${styles.collapse}" id="${this.anchors[index]}-answer" role="region" ${open ? 'data-open' : 'inert'}><div class="${styles.collapseInner}"><div class="${styles.answer}"><div class="${styles.answerBody}">${item.answer}</div>${feedback(item)}</div></div></div></article>`; }).join('');
    }

    const showSearch = this.flag('show-search', true) && faqItems.length > 0;
    const toggleable = display === 'accordion' || display === 'grid';
    const showExpandAll = this.flag('show-expand-all', false) && toggleable && faqItems.length > 1;
    const toolbar = showSearch || showExpandAll ? `<div class="${styles.toolbar}">${showSearch ? `<label class="${styles.search}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="${styles.visuallyHidden}">Search questions</span><input type="search" data-search placeholder="${escapeHtml(this.getSetting('search-placeholder', 'Search questions…'))}" value="${escapeHtml(this.query)}"/></label>` : ''}${showExpandAll ? `<div class="${styles.toolbarButtons}">${singleOpen ? '' : `<button type="button" class="${styles.toolButton}" data-expand="true">Expand all</button>`}<button type="button" class="${styles.toolButton}" data-expand="false">Collapse all</button></div>` : ''}</div>` : '';
    const chips = categories.length > 1 ? `<div class="${styles.categories}" role="group" aria-label="Filter by category">${['', ...categories].map((category) => `<button type="button" class="${styles.chip}" data-category="${escapeHtml(category)}" aria-pressed="${category === this.category}">${category ? escapeHtml(category) : 'All'}</button>`).join('')}</div>` : '';
    const help = this.flag('show-help', false) ? `<div class="${styles.help}"><p>${escapeHtml(this.getSetting('help-text', 'Still have questions?'))}</p>${helpLink ? `<a class="${styles.helpButton}" href="${escapeHtml(helpLink)}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(this.getSetting('help-label', 'Contact us'))}</a>` : ''}</div>` : '';

    const headingMarkup = this.flag('show-heading', true) && heading ? `<h2>${heading}</h2>` : '';
    const descriptionMarkup = this.flag('show-description', true) && description ? `<p>${description}</p>` : '';
    const header = headingMarkup || descriptionMarkup ? `<header class="${styles.header}">${headingMarkup}${descriptionMarkup}</header>` : '';
    root.innerHTML = `${header}${toolbar}${chips}<div class="${styles.list}" role="list">${list}</div><p class="${styles.noResults}" data-no-results hidden></p>${help}`;

    if (this.flag('seo-schema', true) && faqItems.length) {
      const schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }).replace(/</g, '\\u003c');
      root.append(schema);
    }

    this.bindEvents(root, singleOpen);
    this.replaceChildren(root);
    this.applyFilters();
  }

  private bindEvents(root: HTMLElement, singleOpen: boolean): void {
    root.querySelectorAll<HTMLButtonElement>(`.${styles.question}`).forEach((button) => button.addEventListener('click', () => this.setOpen(button, button.getAttribute('aria-expanded') !== 'true', singleOpen)));
    root.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => this.selectTab(tab)));
    root.querySelectorAll<HTMLButtonElement>('[data-expand]').forEach((button) => button.addEventListener('click', () => {
      const open = button.dataset.expand === 'true';
      root.querySelectorAll<HTMLButtonElement>(`article:not([data-filtered]) .${styles.question}`).forEach((question) => this.setOpen(question, open, false));
    }));
    root.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((chip) => chip.addEventListener('click', () => {
      this.category = chip.dataset.category ?? '';
      root.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
      this.applyFilters();
    }));
    root.querySelector<HTMLInputElement>('[data-search]')?.addEventListener('input', (event) => {
      this.query = (event.target as HTMLInputElement).value;
      const visible = this.applyFilters();
      window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => {
        const query = this.query.trim().toLowerCase();
        if (query.length < 2 || query === this.lastTrackedQuery) return;
        this.lastTrackedQuery = query;
        this.track('search', { query, resultCount: visible });
      }, SEARCH_TRACK_DELAY);
    });
    root.querySelectorAll<HTMLElement>('[data-feedback]').forEach((container) => container.querySelectorAll<HTMLButtonElement>('[data-vote]').forEach((button) => button.addEventListener('click', () => {
      const itemId = container.dataset.feedback ?? '';
      const vote = button.dataset.vote === 'helpful' ? 'helpful' : 'not-helpful';
      writeSession(`faq-vote-${itemId}`, vote);
      this.track(vote, { itemId });
      container.innerHTML = '<span>Thanks for your feedback!</span>';
    })));
  }

  private itemAt(element: Element): FAQItem | undefined { return this.data?.faqItems[Number(element.closest<HTMLElement>('[data-faq-index]')?.dataset.faqIndex)]; }

  private trackOpen(element: Element): void {
    const item = this.itemAt(element);
    if (!item?._id || this.trackedOpens.has(item._id)) return;
    this.trackedOpens.add(item._id);
    this.track('open', { itemId: item._id });
  }

  private setOpen(button: HTMLButtonElement, open: boolean, singleOpen: boolean): void {
    const answer = button.closest('article')?.querySelector<HTMLElement>(`.${styles.collapse}`);
    if (!answer) return;
    if (open && singleOpen) this.querySelectorAll<HTMLButtonElement>(`.${styles.question}[aria-expanded="true"]`).forEach((other) => { if (other !== button) this.setOpen(other, false, false); });
    button.setAttribute('aria-expanded', String(open));
    // The height transition lives in CSS; `inert` keeps links in a closed answer out of the tab order.
    answer.toggleAttribute('data-open', open);
    answer.inert = !open;
    if (open) this.trackOpen(button);
  }

  private selectTab(tab: HTMLButtonElement): void {
    this.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
    this.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.dataset.faqIndex !== tab.dataset.faqIndex; });
    this.trackOpen(tab);
  }

  // Applies the search query and category, highlights matches, and returns the number of visible questions.
  private applyFilters(): number {
    const faqItems = this.data?.faqItems ?? [];
    const words = this.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    faqItems.forEach((item, index) => {
      const text = `${item.question} ${stripHtml(item.answer)}`.toLowerCase();
      const show = (!this.category || item.category?.trim() === this.category) && words.every((word) => text.includes(word));
      if (show) visible += 1;
      this.querySelectorAll<HTMLElement>(`[data-faq-index="${index}"]`).forEach((element) => {
        element.toggleAttribute('data-filtered', !show);
        const label = element.querySelector<HTMLElement>('[data-question-text]');
        if (label) label.innerHTML = highlight(item.question, words);
      });
    });
    const selectedTab = this.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    if (selectedTab?.hasAttribute('data-filtered')) { const firstVisible = this.querySelector<HTMLButtonElement>('[role="tab"]:not([data-filtered])'); if (firstVisible) this.selectTab(firstVisible); }
    const noResults = this.querySelector<HTMLElement>('[data-no-results]');
    if (noResults) {
      noResults.hidden = visible > 0 || !faqItems.length;
      noResults.textContent = words.length ? `No questions match “${this.query.trim()}”.` : 'No questions in this category yet.';
    }
    return visible;
  }

  // Deep links: `#faq-<question-slug>` in the page URL opens and scrolls to that question.
  private openFromHash(): void {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const index = this.anchors.indexOf(hash);
    if (index < 0) return;
    if (this.query || this.category) {
      this.query = ''; this.category = '';
      this.renderMarkup();
    }
    const target = this.querySelector<HTMLElement>(`#${CSS.escape(hash)}`);
    if (!target) return;
    const question = target.querySelector<HTMLButtonElement>(`.${styles.question}`);
    if (question) this.setOpen(question, true, this.flag('single-open', false));
    if (target.getAttribute('role') === 'tab') this.selectTab(target as HTMLButtonElement);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default FAQWidget;
