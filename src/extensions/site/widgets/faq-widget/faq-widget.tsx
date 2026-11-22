import { window as wixWindow } from '@wix/site-window';
import styles from './faq-widget.module.css';
import { presetById } from '../../../../lib/faq-presets';
import { iconById, iconSvg } from '../../../../lib/faq-icons';
import { categoriesOf, itemAnchors } from '../../../../lib/faq-data';
import { fetchAllFAQContent, recordFAQEvent } from '../../../../lib/faq-api';
import { getSiteLanguage, getUIStrings, isRTL } from '../../../../lib/faq-i18n';
import type { FAQEventType, FAQGroup, FAQItem, FAQSection, FontValue } from '../../../../lib/faq-types';

type Display = 'accordion' | 'grid' | 'cards' | 'tabs';
type WidgetData = { group: FAQGroup | null; faqItems: Array<FAQItem>; sections: Array<FAQSection>; message: string; isEditor: boolean };

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
  private activeLanguage = '';
  private activeGroupId = '';
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

  static get observedAttributes(): Array<string> { return ['connection-key', 'language', 'layout', 'heading', 'description', 'background-color', 'question-color', 'answer-color', 'accent-color', 'border-color', 'question-font', 'answer-font', 'icon', 'icon-color', 'icon-size', 'radius', 'gap', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'initially-open', 'display', 'show-search', 'search-placeholder', 'show-categories', 'show-expand-all', 'single-open', 'show-feedback', 'seo-schema', 'animation', 'hover-effect', 'show-help', 'help-text', 'help-label', 'help-link', 'show-heading', 'show-description', 'show-icon']; }

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
  // Only a new connection key or language change needs fresh data; style and behaviour changes re-render what is already loaded.
  attributeChangedCallback(name: string): void { if (name === 'connection-key') this.activeGroupId = ''; if (name === 'connection-key' || name === 'language' || !this.data) this.queueFetch(); else this.renderMarkup(); }

  private getSetting(name: string, fallback: string): string { return this.getAttribute(name) || fallback; }
  // Visitor-facing text: empty (or the untouched English default) shows the default in the visitor's language.
  private getText(name: string, englishDefault: string, localized: string): string { const value = this.getAttribute(name)?.trim(); return !value || value === englishDefault ? localized : value; }
  private flag(name: string, fallback: boolean): boolean { return this.getSetting(name, String(fallback)) === 'true'; }
  private get display(): Display { const value = this.getSetting('display', presetById(this.getSetting('layout', 'classic')).display); return DISPLAYS.includes(value as Display) ? value as Display : 'accordion'; }

  private queueFetch(): void {
    if (this.fetchQueued) return;
    this.fetchQueued = true;
    queueMicrotask(() => { this.fetchQueued = false; void this.load(); });
  }

  private async load(): Promise<void> {
    const token = ++this.renderToken;
    const connectionKey = this.getSetting('connection-key', '');
    if (!this.data) this.renderLoading();
    let isEditor = false;
    const finish = (data: WidgetData): void => { if (token !== this.renderToken) return; this.data = data; this.anchors = itemAnchors(data.faqItems); this.renderMarkup(); this.openFromHash(); };
    try {
      const viewMode = await wixWindow.viewMode();
      isEditor = viewMode === 'Editor' || viewMode === 'Preview';
      if (token !== this.renderToken) return;
      const explicitLang = this.getSetting('language', '');
      const siteLang = await getSiteLanguage();
      this.activeLanguage = explicitLang || siteLang || '';
      const strings = getUIStrings(this.activeLanguage);
      // Every group is loaded and shown as a tab; the connection key only picks the tab that opens first.
      const result = await fetchAllFAQContent(isEditor, this.activeLanguage);
      if (token !== this.renderToken) return;
      const sections = result?.groups ?? [];
      if (!sections.length) {
        if (isEditor && result) finish({ group: null, faqItems: [], sections: [], message: strings.editorAddItems, isEditor });
        else { this.data = null; this.anchors = []; this.setAttribute('aria-busy', 'false'); this.replaceChildren(); }
        return;
      }
      const active = sections.find((section) => section.group._id === this.activeGroupId)
        ?? sections.find((section) => connectionKey && section.group.connectionKey === connectionKey) ?? sections[0];
      this.activeGroupId = active.group._id ?? '';
      finish(this.sectionData(active, sections, isEditor));
    } catch (error) {
      console.error('Failed to load FAQ group:', error);
      if (token !== this.renderToken) return;
      if (isEditor) finish({ group: null, faqItems: [], sections: [], message: getUIStrings(this.activeLanguage).editorLoadError, isEditor });
      else { this.data = null; this.anchors = []; this.setAttribute('aria-busy', 'false'); this.replaceChildren(); }
    }
  }

  private renderLoading(): void {
    const loading = getUIStrings(this.activeLanguage).loading;
    this.setAttribute('aria-busy', 'true');
    const root = document.createElement('section');
    root.className = styles.root;
    root.setAttribute('role', 'status');
    root.setAttribute('aria-label', loading);
    root.innerHTML = `<span class="${styles.visuallyHidden}">${escapeHtml(loading)}</span><div class="${styles.skeletonToolbar}" aria-hidden="true"><span class="${styles.skeletonSearch}"></span></div><div class="${styles.skeletonList}" aria-hidden="true">${[0, 1, 2].map(() => `<div class="${styles.skeletonItem}"><span class="${styles.skeletonQuestion}"></span></div>`).join('')}</div>`;
    this.replaceChildren(root);
  }

  private sectionData(section: FAQSection, sections: Array<FAQSection>, isEditor: boolean): WidgetData {
    const strings = getUIStrings(this.activeLanguage);
    return { group: section.group, faqItems: section.faqItems, sections, isEditor, message: section.group.description || (isEditor ? strings.editorAddItems : strings.noPublished) };
  }

  // Switches the visible group tab. Search and category filters belong to a group, so they reset.
  private selectGroup(groupId: string, focus = false): void {
    const section = this.data?.sections.find((candidate) => candidate.group._id === groupId);
    if (!this.data || !section) return;
    if (groupId !== this.activeGroupId) {
      this.activeGroupId = groupId;
      this.data = this.sectionData(section, this.data.sections, this.data.isEditor);
      this.anchors = itemAnchors(section.faqItems);
      this.query = ''; this.category = ''; this.lastTrackedQuery = '';
      this.renderMarkup();
    }
    if (focus) this.querySelector<HTMLButtonElement>(`[data-group-tab="${CSS.escape(groupId)}"]`)?.focus();
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
    this.setAttribute('aria-busy', 'false');
    const { faqItems, message } = this.data;
    const preset = presetById(this.getSetting('layout', 'classic'));
    const display = this.display;
    const icon = iconById(this.getSetting('icon', preset.icon)).id;
    const initiallyOpen = this.flag('initially-open', false);
    const singleOpen = this.flag('single-open', false);
    const showFeedback = this.flag('show-feedback', true) && Boolean(this.data.group);
    const categories = this.flag('show-categories', true) ? categoriesOf(faqItems) : [];
    if (this.category && !categories.includes(this.category)) this.category = '';
    const strings = getUIStrings(this.activeLanguage);
    const english = getUIStrings('en');
    const heading = escapeHtml(this.getText('heading', preset.heading, strings.heading));
    const description = escapeHtml(this.getSetting('description', message));
    const questionFont = parseFont(this.getAttribute('question-font'), preset.questionFont);
    const answerFont = parseFont(this.getAttribute('answer-font'), preset.answerFont);
    const helpLink = safeUrl(this.getSetting('help-link', ''));
    const isExternal = /^https?:/i.test(helpLink);

    const root = document.createElement('section');
    root.className = styles.root;
    if (isRTL(this.activeLanguage) && !this.getAttribute('dir')) {
      root.setAttribute('dir', 'rtl');
    }
    Object.assign(root.dataset, { layout: preset.layout, display, animation: this.getSetting('animation', 'fade'), hover: this.getSetting('hover-effect', 'lift') });
    root.style.cssText = `--faq-bg:${this.getSetting('background-color', 'transparent')};--faq-question:${this.getSetting('question-color', preset.questionColor)};--faq-answer:${this.getSetting('answer-color', preset.answerColor)};--faq-accent:${this.getSetting('accent-color', preset.accentColor)};--faq-border:${this.getSetting('border-color', preset.borderColor)};--faq-icon:${this.getSetting('icon-color', preset.iconColor)};--faq-icon-size:${this.getSetting('icon-size', String(preset.iconSize))}px;--faq-radius:${this.getSetting('radius', String(preset.radius))}px;--faq-gap:${this.getSetting('gap', String(preset.gap))}px;--faq-padding:${this.getSetting('padding', String(preset.padding))}px;--faq-margin-top:${this.getSetting('margin-top', '0')}px;--faq-margin-right:${this.getSetting('margin-right', '0')}px;--faq-margin-bottom:${this.getSetting('margin-bottom', '0')}px;--faq-margin-left:${this.getSetting('margin-left', '0')}px;--faq-question-font:${questionFont.font};--faq-answer-font:${answerFont.font};`;

    const feedback = (item: FAQItem): string => {
      if (!showFeedback || !item._id) return '';
      if (readSession(`faq-vote-${item._id}`)) return `<div class="${styles.feedback}"><span>${escapeHtml(strings.helpfulThanks)}</span></div>`;
      return `<div class="${styles.feedback}" data-feedback="${escapeHtml(item._id)}"><span>${escapeHtml(strings.helpfulPrompt)}</span><button type="button" class="${styles.vote}" data-vote="helpful">👍 ${escapeHtml(strings.helpfulYes)}</button><button type="button" class="${styles.vote}" data-vote="not-helpful">👎 ${escapeHtml(strings.helpfulNo)}</button></div>`;
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
    const toolbar = showSearch || showExpandAll ? `<div class="${styles.toolbar}">${showSearch ? `<label class="${styles.search}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="${styles.visuallyHidden}">${escapeHtml(strings.search)}</span><input type="search" data-search placeholder="${escapeHtml(this.getText('search-placeholder', english.searchPlaceholder, strings.searchPlaceholder))}" value="${escapeHtml(this.query)}"/></label>` : ''}${showExpandAll ? `<div class="${styles.toolbarButtons}">${singleOpen ? '' : `<button type="button" class="${styles.toolButton}" data-expand="true">${escapeHtml(strings.expandAll)}</button>`}<button type="button" class="${styles.toolButton}" data-expand="false">${escapeHtml(strings.collapseAll)}</button></div>` : ''}</div>` : '';
    const chips = categories.length > 1 ? `<div class="${styles.categories}" role="group" aria-label="${escapeHtml(strings.categories)}">${['', ...categories].map((category) => `<button type="button" class="${styles.chip}" data-category="${escapeHtml(category)}" aria-pressed="${category === this.category}">${category ? escapeHtml(category) : escapeHtml(strings.allCategories)}</button>`).join('')}</div>` : '';
    const help = this.flag('show-help', false) ? `<div class="${styles.help}"><p>${escapeHtml(this.getText('help-text', english.helpText, strings.helpText))}</p>${helpLink ? `<a class="${styles.helpButton}" href="${escapeHtml(helpLink)}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(this.getText('help-label', english.helpLabel, strings.helpLabel))}</a>` : ''}</div>` : '';

    const headingMarkup = this.flag('show-heading', true) && heading ? `<h2>${heading}</h2>` : '';
    const descriptionMarkup = this.flag('show-description', true) && description ? `<p>${description}</p>` : '';
    const header = headingMarkup || descriptionMarkup ? `<header class="${styles.header}">${headingMarkup}${descriptionMarkup}</header>` : '';
    const sections = this.data.sections;
    const tabPrefix = `faq-group-${this.activeGroupId}`;
    const groupTabs = sections.length > 1 ? `<div class="${styles.categories}" role="tablist" aria-label="${escapeHtml(strings.tabs)}" data-group-tabs>${sections.map((section) => { const groupId = section.group._id ?? ''; const selected = groupId === this.activeGroupId; return `<button type="button" role="tab" class="${styles.chip}" id="faq-group-${escapeHtml(groupId)}-tab" data-group-tab="${escapeHtml(groupId)}" aria-selected="${selected}" aria-controls="${escapeHtml(tabPrefix)}-panel" tabindex="${selected ? 0 : -1}">${escapeHtml(section.group.title)}</button>`; }).join('')}</div>` : '';
    const listAttributes = groupTabs ? `role="tabpanel" id="${escapeHtml(tabPrefix)}-panel" aria-labelledby="${escapeHtml(tabPrefix)}-tab"` : 'role="list"';
    root.innerHTML = `${header}${groupTabs}${toolbar}${chips}<div class="${styles.list}" ${listAttributes}>${list}</div><p class="${styles.noResults}" data-no-results hidden></p>${help}`;

    if (this.flag('seo-schema', true) && faqItems.length) {
      const schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: this.activeLanguage || 'en', mainEntity: faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }).replace(/</g, '\\u003c');
      root.append(schema);
    }

    this.bindEvents(root, singleOpen);
    this.replaceChildren(root);
    this.applyFilters();
  }

  private bindEvents(root: HTMLElement, singleOpen: boolean): void {
    root.querySelectorAll<HTMLButtonElement>('[data-group-tab]').forEach((tab) => tab.addEventListener('click', () => this.selectGroup(tab.dataset.groupTab ?? '', true)));
    root.querySelector<HTMLElement>('[data-group-tabs]')?.addEventListener('keydown', (event) => {
      const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-group-tab]'));
      const current = tabs.indexOf(event.target as HTMLButtonElement);
      if (current < 0 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const forward = (event.key === 'ArrowRight') !== (getComputedStyle(root).direction === 'rtl');
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (forward ? 1 : -1) + tabs.length) % tabs.length;
      this.selectGroup(tabs[next]?.dataset.groupTab ?? '', true);
    });
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
      container.innerHTML = `<span>${escapeHtml(getUIStrings(this.activeLanguage).helpfulThanks)}</span>`;
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
      noResults.textContent = getUIStrings(this.activeLanguage).noResults;
    }
    return visible;
  }

  // Deep links: `#faq-<question-slug>` in the page URL opens and scrolls to that question.
  private openFromHash(): void {
    let hash: string;
    try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    if (!hash) return;
    // A link to a question in another group switches to that group's tab first.
    if (!this.anchors.includes(hash)) {
      const owner = this.data?.sections.find((section) => itemAnchors(section.faqItems).includes(hash));
      if (owner?.group._id) this.selectGroup(owner.group._id);
    }
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
