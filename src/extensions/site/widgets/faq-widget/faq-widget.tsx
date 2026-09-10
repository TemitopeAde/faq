import { items } from '@wix/data';
import { window as wixWindow } from '@wix/site-window';
import styles from './faq-widget.module.css';
import { presetById } from '../../../../lib/faq-presets';
import type { FAQItem, FAQGroup, FontValue } from '../../../../lib/faq-types';

const GROUPS = '@admin14744/faq/faq-groups';
const FAQ_ITEMS = '@admin14744/faq/faq-items';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
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

class FAQWidget extends HTMLElement {
  private renderToken = 0;
  static get observedAttributes(): Array<string> { return ['connection-key', 'layout', 'heading', 'description', 'background-color', 'question-color', 'answer-color', 'accent-color', 'border-color', 'question-font', 'answer-font', 'icon', 'icon-color', 'icon-size', 'radius', 'gap', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'initially-open']; }
  connectedCallback(): void { void this.render(); }
  attributeChangedCallback(): void { void this.render(); }
  private getSetting(name: string, fallback: string): string { return this.getAttribute(name) || fallback; }

  async render(): Promise<void> {
    const token = ++this.renderToken;
    const connectionKey = this.getSetting('connection-key', '');
    const viewMode = await wixWindow.viewMode();
    if (token !== this.renderToken) return;
    if (!connectionKey) { this.renderMarkup([], 'Add a connection key to display your FAQs.'); return; }
    const isEditor = viewMode === 'Editor';
    try {
      const groupQuery = items.query(GROUPS).eq('connectionKey', connectionKey);
      const groupResult = await (isEditor ? groupQuery : groupQuery.eq('published', true)).limit(1).find();
      const group = groupResult.items[0] as unknown as FAQGroup | undefined;
      if (!group?._id) {
        this.renderMarkup([], isEditor ? 'This connection key does not match an FAQ group.' : 'This connection key is invalid or unpublished.');
        return;
      }
      const itemQuery = items.query(FAQ_ITEMS).eq('groupId', group._id);
      const result = await (isEditor ? itemQuery : itemQuery.eq('published', true)).ascending('sortOrder').limit(100).find();
      const emptyMessage = isEditor ? 'Add FAQ items to this group to preview them here.' : 'No published FAQs are available yet.';
      this.renderMarkup(result.items as unknown as Array<FAQItem>, group.description || emptyMessage);
    } catch (error) { console.error('Failed to load FAQ group:', error); this.renderMarkup([], 'FAQs are temporarily unavailable.'); }
  }

  private renderMarkup(faqItems: Array<FAQItem>, message: string): void {
    const preset = presetById(this.getSetting('layout', 'classic'));
    const icon = this.getSetting('icon', preset.icon);
    const iconText = icon === 'chevron' ? '⌄' : icon === 'arrow' ? '→' : icon === 'minus' ? '−' : '+';
    const initiallyOpen = this.getSetting('initially-open', 'false') === 'true';
    const heading = escapeHtml(this.getSetting('heading', preset.heading));
    const description = escapeHtml(this.getSetting('description', message));
    const questionFont = parseFont(this.getAttribute('question-font'), preset.questionFont);
    const answerFont = parseFont(this.getAttribute('answer-font'), preset.answerFont);
    const root = document.createElement('section');
    root.className = `${styles.root} faq-widget faq-widget-${preset.layout}`;
    root.style.cssText = `--faq-bg:${this.getSetting('background-color', 'transparent')};--faq-question:${this.getSetting('question-color', preset.questionColor)};--faq-answer:${this.getSetting('answer-color', preset.answerColor)};--faq-accent:${this.getSetting('accent-color', preset.accentColor)};--faq-border:${this.getSetting('border-color', preset.borderColor)};--faq-icon:${this.getSetting('icon-color', preset.iconColor)};--faq-icon-size:${this.getSetting('icon-size', String(preset.iconSize))}px;--faq-radius:${this.getSetting('radius', String(preset.radius))}px;--faq-gap:${this.getSetting('gap', String(preset.gap))}px;--faq-padding:${this.getSetting('padding', '28')}px;--faq-margin-top:${this.getSetting('margin-top', '0')}px;--faq-margin-right:${this.getSetting('margin-right', '0')}px;--faq-margin-bottom:${this.getSetting('margin-bottom', '0')}px;--faq-margin-left:${this.getSetting('margin-left', '0')}px;--faq-question-font:${questionFont.font};--faq-answer-font:${answerFont.font};`;
    root.innerHTML = `<header class="${styles.header}"><h2>${heading}</h2>${description ? `<p>${description}</p>` : ''}</header><div class="${styles.list}" role="list">${faqItems.length ? faqItems.map((item, index) => `<article class="${styles.item}" role="listitem"><button class="${styles.question}" type="button" aria-expanded="${initiallyOpen && index === 0 ? 'true' : 'false'}"><span>${escapeHtml(item.question)}</span><span class="${styles.icon}" aria-hidden="true">${iconText}</span></button><div class="${styles.answer}" ${initiallyOpen && index === 0 ? '' : 'hidden'}>${item.answer}</div></article>`).join('') : `<p class="${styles.message}">${description}</p>`}</div>`;
    root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => button.addEventListener('click', () => { const answer = button.nextElementSibling; if (!(answer instanceof HTMLElement)) return; const open = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!open)); answer.hidden = open; }));
    this.replaceChildren(root);
  }
}

export default FAQWidget;
