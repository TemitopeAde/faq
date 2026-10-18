import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { convertA11yKeysToHtmlFormat } from '@wix/react-component-utils';
import { recordFAQEvent } from '../../../../lib/faq-api';
import { categoriesOf, itemAnchors } from '../../../../lib/faq-data';
import type { FAQEventInput } from '../../../../lib/faq-analytics';
import { EditorPreviewContext } from './editor-context';
import { FAQFeedback } from './faq-feedback';
import { useFAQContent } from './use-faq-content';
import { defaultProps, type FaqHarmonyProps } from './faq-harmony.props';
import styles from './faq-harmony.module.css';

const LABELS = { search: 'Search questions', categories: 'Filter by category', tabs: 'FAQ questions' };
const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const FaqHarmony = ({
  id, className, direction, a11y, elementProps,
  connectionKey = defaultProps.connectionKey, heading = defaultProps.heading,
  description = defaultProps.description, display = defaultProps.display,
  searchPlaceholder = defaultProps.searchPlaceholder, initiallyOpen = defaultProps.initiallyOpen,
  singleOpen = defaultProps.singleOpen, collectFeedback = defaultProps.collectFeedback,
  seoSchema = defaultProps.seoSchema,
}: FaqHarmonyProps) => {
  const preview = useContext(EditorPreviewContext);
  const { tabIndex, tag: _tag, ...accessibleAttributes } = a11y ?? {};
  const { content, status, retry } = useFAQContent(connectionKey, preview);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [opened, setOpened] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState('');
  const tracked = useRef(new Set<string>());
  const tabList = useRef<HTMLDivElement>(null);
  const faqItems = content?.faqItems ?? [];
  const groupId = content?.group?._id;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = faqItems.filter((item) => (!category || item.category?.trim() === category) &&
    words.every((word) => `${item.question} ${plainText(item.answer)}`.toLowerCase().includes(word)));
  const categories = categoriesOf(faqItems);
  const active = visible.find((item) => item._id === selected)?._id ?? visible[0]?._id;
  const track = useCallback((type: FAQEventInput['type'], details: Omit<FAQEventInput, 'type' | 'groupId'>) => {
    if (preview || !groupId) return;
    void recordFAQEvent({ type, groupId, ...details }).catch((error: unknown) => console.error('FAQ analytics failed:', error));
  }, [preview, groupId]);
  const trackOpen = (itemId: string) => {
    if (tracked.current.has(itemId)) return;
    tracked.current.add(itemId);
    track('open', { itemId });
  };
  useEffect(() => {
    setQuery(''); setCategory(''); setSelected('');
    setOpened(null);
    tracked.current.clear();
  }, [connectionKey, initiallyOpen]);
  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => track('search', { query: query.trim().slice(0, 200), resultCount: visible.length }), 1200);
    return () => clearTimeout(timeout);
  }, [query, visible.length, track]);
  useEffect(() => {
    if (preview || !content) return;
    const openLinkedQuestion = () => {
      let hash: string;
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const index = itemAnchors(content.faqItems).indexOf(hash);
      const itemId = content.faqItems[index]?._id;
      if (!itemId) return;
      setQuery(''); setCategory(''); setOpened(new Set([itemId])); setSelected(itemId);
      document.getElementById(`${id}-${itemId}-item`)?.scrollIntoView?.({ block: 'start' });
    };
    openLinkedQuestion();
    window.addEventListener('hashchange', openLinkedQuestion);
    return () => window.removeEventListener('hashchange', openLinkedQuestion);
  }, [content, preview, id]);
  const isOpen = (itemId: string) => opened?.has(itemId) ?? (initiallyOpen && itemId === faqItems[0]?._id);
  const toggle = (itemId: string) => {
    if (!isOpen(itemId)) trackOpen(itemId);
    setOpened((previous) => {
      const previousOpen = previous?.has(itemId) ?? (initiallyOpen && itemId === faqItems[0]?._id);
      const next = new Set(singleOpen ? [] : previous ?? (initiallyOpen && faqItems[0]?._id ? [faqItems[0]._id] : []));
      if (!previousOpen) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };
  const isTabs = display === 'tabs';
  const isCards = display === 'cards';
  const message = !connectionKey.trim() ? 'Connect an FAQ group using its connection key from the dashboard or Aria.' :
    status === 'loading' ? 'Loading FAQs…' : status === 'error' ? 'Could not load FAQs. Please try again.' :
    !content?.group ? 'No published FAQs are available for this connection.' : 'No questions are available yet.';
  // Live plan failures and unconnected widgets stay hidden, matching the original widget.
  const hiddenLive = !preview && (!connectionKey.trim() || (status === 'ready' && !content));
  return (
    <section hidden={hiddenLive} id={id} dir={direction} {...convertA11yKeysToHtmlFormat(accessibleAttributes)} tabIndex={tabIndex}
      className={classNames('faq-harmony', styles.root, styles.fallbackDirection, className)}
      data-display={display} aria-busy={status === 'loading' && Boolean(connectionKey.trim())}>
      <header className={styles.header}>
        <h2 {...elementProps?.heading} className={classNames('faq-harmony-heading', styles.heading, elementProps?.heading?.className)}>{heading}</h2>
        <p {...elementProps?.description} className={classNames('faq-harmony-description', styles.description, elementProps?.description?.className)}>{description || content?.group?.description}</p>
      </header>
      {faqItems.length > 0 ? <>
        <div className={styles.toolbar}>
          <label className={styles.searchLabel}>
            <span className={styles.visuallyHidden}>{LABELS.search}</span>
            <input {...elementProps?.search} type="search" placeholder={searchPlaceholder} value={query}
              className={classNames('faq-harmony-search', styles.search, elementProps?.search?.className)}
              onChange={(event) => setQuery(event.target.value)} />
          </label>
          {!isCards && !isTabs ? <>
            {!singleOpen ? <button {...elementProps?.expand} type="button"
              className={classNames('faq-harmony-expand', styles.control, elementProps?.expand?.className)}
              onClick={() => { setOpened(new Set(visible.flatMap((item) => item._id ? [item._id] : []))); visible.forEach((item) => { if (item._id) trackOpen(item._id); }); }}>Expand all</button> : null}
            <button {...elementProps?.expand} type="button"
              className={classNames('faq-harmony-expand', styles.control, elementProps?.expand?.className)}
              onClick={() => setOpened(new Set())}>Collapse all</button>
          </> : null}
        </div>
        {categories.length > 1 ? <fieldset className={styles.categories}><legend className={styles.visuallyHidden}>{LABELS.categories}</legend>
          {['', ...categories].map((value) => <button {...elementProps?.category} type="button" key={value}
            className={classNames('faq-harmony-category', styles.category, value === category && 'faq-harmony-category--selected', elementProps?.category?.className)}
            aria-pressed={value === category} onClick={() => setCategory(value)}>{value || 'All'}</button>)}
        </fieldset> : null}
        <div className={classNames(styles.list, isTabs && styles.tabs)}>
          {isTabs ? <div role="tablist" aria-label={LABELS.tabs} aria-orientation="vertical" className={styles.tabList} ref={tabList}
            onKeyDown={(event) => {
              const buttons = Array.from(tabList.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
              const current = buttons.indexOf(event.target as HTMLButtonElement);
              if (current < 0 || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
              buttons[next]?.focus(); buttons[next]?.click();
            }}>
            {visible.map((item) => <button {...elementProps?.question} type="button" role="tab" key={item._id}
              id={`${id}-${item._id}-tab`} aria-controls={`${id}-${item._id}-answer`} aria-selected={active === item._id}
              tabIndex={active === item._id ? 0 : -1}
              className={classNames('faq-harmony-question', styles.question, active === item._id && 'faq-harmony-question--selected', elementProps?.question?.className)}
              onClick={() => { if (item._id) { setSelected(item._id); trackOpen(item._id); } }}>{item.question}</button>)}
          </div> : null}
          <div className={styles.items}>
            {visible.map((item) => {
              const itemId = item._id;
              if (!itemId) return null;
              const expanded = isCards || (isTabs ? active === itemId : isOpen(itemId));
              return <article id={`${id}-${itemId}-item`} key={itemId} hidden={isTabs && !expanded} className={styles.item}>
                {!isTabs ? <h3 className={styles.questionHeading}>
                  {isCards ? <span {...elementProps?.question} className={classNames('faq-harmony-question', styles.question, elementProps?.question?.className)}>{item.question}</span> :
                    <button {...elementProps?.question} type="button" id={`${id}-${itemId}-question`}
                      className={classNames('faq-harmony-question', styles.question, expanded && 'faq-harmony-question--expanded', elementProps?.question?.className)}
                      aria-expanded={expanded} aria-controls={`${id}-${itemId}-answer`} onClick={() => toggle(itemId)}>
                      {item.question}<span aria-hidden="true">{expanded ? '−' : '+'}</span>
                    </button>}
                </h3> : null}
                <div {...elementProps?.answer} id={`${id}-${itemId}-answer`} hidden={!expanded}
                  role={isTabs ? 'tabpanel' : undefined} tabIndex={isTabs ? 0 : undefined}
                  aria-labelledby={isTabs ? `${id}-${itemId}-tab` : isCards ? undefined : `${id}-${itemId}-question`}
                  className={classNames('faq-harmony-answer', styles.answer, elementProps?.answer?.className)}>
                  <div className={styles.answerBody} dangerouslySetInnerHTML={{ __html: item.answer }} />
                  {collectFeedback ? <FAQFeedback key={itemId} itemId={itemId} disabled={preview} className={elementProps?.feedback?.className} track={track} /> : null}
                </div>
              </article>;
            })}
          </div>
        </div>
        <output className={styles.message}>{visible.length === 0 ? 'No questions match your search or category.' : ''}</output>
      </> : <div aria-live="polite" className={styles.message}>{message}
        {status === 'error' ? <button type="button" className={styles.control} onClick={retry}>Try again</button> : null}
      </div>}
      {seoSchema && faqItems.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      }).replace(/</g, '\\u003c') }} /> : null}
    </section>
  );
};

export default FaqHarmony;
