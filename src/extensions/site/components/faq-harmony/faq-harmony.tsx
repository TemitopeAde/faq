import React, { useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import classNames from 'classnames';
import { convertA11yKeysToHtmlFormat } from '@wix/react-component-utils';
import { recordFAQEvent } from '../../../../lib/faq-api';
import { categoriesOf, itemAnchors } from '../../../../lib/faq-data';
import type { FAQEventInput } from '../../../../lib/faq-analytics';
import { getSiteLanguage, getUIStrings, isRTL } from '../../../../lib/faq-i18n';
import { EditorPreviewContext } from './editor-context';
import { FAQFeedback } from './faq-feedback';
import { useFAQContent } from './use-faq-content';
import { defaultProps, type FaqHarmonyProps } from './faq-harmony.props';
import styles from './faq-harmony.module.css';

const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const FaqHarmony = ({
  id, className, direction, a11y, elementProps,
  connectionKey = defaultProps.connectionKey, heading = defaultProps.heading,
  description = defaultProps.description, display = defaultProps.display,
  searchPlaceholder = defaultProps.searchPlaceholder, initiallyOpen = defaultProps.initiallyOpen,
  singleOpen = defaultProps.singleOpen, collectFeedback = defaultProps.collectFeedback,
  seoSchema = defaultProps.seoSchema, language = defaultProps.language,
  showSearch = defaultProps.showSearch, showCategories = defaultProps.showCategories,
  showExpandAll = defaultProps.showExpandAll, showHeading = defaultProps.showHeading,
  showDescription = defaultProps.showDescription, showIcon = defaultProps.showIcon,
  showHelp = defaultProps.showHelp, helpText = defaultProps.helpText,
  helpLabel = defaultProps.helpLabel, helpLink = defaultProps.helpLink,
  layout = defaultProps.layout, icon = defaultProps.icon,
  backgroundColor = defaultProps.backgroundColor, questionColor = defaultProps.questionColor,
  answerColor = defaultProps.answerColor, accentColor = defaultProps.accentColor,
  borderColor = defaultProps.borderColor, questionFont = defaultProps.questionFont,
  answerFont = defaultProps.answerFont, iconColor = defaultProps.iconColor,
  iconSize = defaultProps.iconSize, radius = defaultProps.radius,
  gap = defaultProps.gap, padding = defaultProps.padding,
  animation = defaultProps.animation, hoverEffect = defaultProps.hoverEffect,
  marginTop = defaultProps.marginTop, marginRight = defaultProps.marginRight,
  marginBottom = defaultProps.marginBottom, marginLeft = defaultProps.marginLeft,
}: FaqHarmonyProps) => {
  const preview = useContext(EditorPreviewContext);
  const [siteLang, setSiteLang] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSiteLanguage().then((detected) => { if (active && detected) setSiteLang(detected); });
    return () => { active = false; };
  }, []);

  const activeLang = language || siteLang || '';
  const strings = getUIStrings(activeLang);
  const resolvedDirection = direction ?? (isRTL(activeLang) ? 'rtl' : undefined);

  const { tabIndex, tag: _tag, ...accessibleAttributes } = a11y ?? {};
  const [chosenGroupId, setChosenGroupId] = useState('');
  const { content, sections, status, retry } = useFAQContent(connectionKey, preview, activeLang, chosenGroupId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [opened, setOpened] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState('');
  const tracked = useRef(new Set<string>());
  const tabList = useRef<HTMLDivElement>(null);
  const groupTabList = useRef<HTMLDivElement>(null);
  const faqItems = content?.faqItems ?? [];
  const groupId = content?.group?._id;
  const words = showSearch ? query.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
  const visible = faqItems.filter((item) => (!showCategories || !category || item.category?.trim() === category) &&
    words.every((word) => `${item.question} ${plainText(item.answer)}`.toLowerCase().includes(word)));
  const categories = showCategories ? categoriesOf(faqItems) : [];
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
    setQuery(''); setCategory(''); setSelected(''); setChosenGroupId('');
    setOpened(null);
    tracked.current.clear();
  }, [connectionKey, initiallyOpen, activeLang]);
  // Each group is a tab; search, category and open questions belong to the group, so they reset on switch.
  const selectGroup = (nextGroupId: string) => {
    if (nextGroupId === chosenGroupId || nextGroupId === content?.group?._id) return;
    setChosenGroupId(nextGroupId); setQuery(''); setCategory(''); setSelected(''); setOpened(null);
  };
  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => track('search', { query: query.trim().slice(0, 200), resultCount: visible.length }), 1200);
    return () => clearTimeout(timeout);
  }, [query, visible.length, track]);
  useEffect(() => {
    if (preview || !sections.length) return;
    const openLinkedQuestion = () => {
      let hash: string;
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      // A link may point at a question in another group: switch to that group's tab.
      for (const section of sections) {
        const index = itemAnchors(section.faqItems).indexOf(hash);
        const itemId = section.faqItems[index]?._id;
        if (!itemId) continue;
        if (section.group._id) setChosenGroupId(section.group._id);
        setQuery(''); setCategory(''); setOpened(new Set([itemId])); setSelected(itemId);
        window.setTimeout(() => document.getElementById(`${id}-${itemId}-item`)?.scrollIntoView?.({ block: 'start' }), 0);
        return;
      }
    };
    openLinkedQuestion();
    window.addEventListener('hashchange', openLinkedQuestion);
    return () => window.removeEventListener('hashchange', openLinkedQuestion);
  }, [sections, preview, id]);
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
  const message = status === 'loading' ? strings.loading : status === 'error' ? strings.loadError :
    !content?.group ? strings.noPublished : strings.noQuestions;
  // Untouched defaults follow the visitor's language; text the site owner typed is shown as-is.
  const placeholder = !searchPlaceholder.trim() || searchPlaceholder === defaultProps.searchPlaceholder ? strings.searchPlaceholder : searchPlaceholder;
  const headingText = !heading.trim() || heading === defaultProps.heading ? strings.heading : heading;
  // Live plan failures and sites without published FAQs stay hidden, matching the original widget.
  const hiddenLive = !preview && status === 'ready' && !content;
  const activeGroupId = content?.group?._id ?? '';
  const rootStyle = {
    '--faq-bg': backgroundColor, '--faq-question': questionColor, '--faq-answer': answerColor,
    '--faq-accent': accentColor, '--faq-border': borderColor, '--faq-icon': iconColor,
    '--faq-icon-size': `${iconSize}px`, '--faq-radius': `${radius}px`, '--faq-gap': `${gap}px`,
    '--faq-padding': `${padding}px`, '--faq-question-font': questionFont, '--faq-answer-font': answerFont,
    '--faq-margin-top': `${marginTop}px`, '--faq-margin-right': `${marginRight}px`,
    '--faq-margin-bottom': `${marginBottom}px`, '--faq-margin-left': `${marginLeft}px`,
  } as CSSProperties;
  return (
    <section hidden={hiddenLive} id={id} dir={resolvedDirection} {...convertA11yKeysToHtmlFormat(accessibleAttributes)} tabIndex={tabIndex}
      className={classNames('faq-harmony', styles.root, styles.fallbackDirection, className)}
      style={rootStyle} data-display={display} data-layout={layout} data-animation={animation} data-hover={hoverEffect}
      aria-busy={status === 'loading' && Boolean(connectionKey.trim())}>
      {(showHeading || showDescription) ? <header className={styles.header}>
        {showHeading && headingText ? <h2 {...elementProps?.heading} className={classNames('faq-harmony-heading', styles.heading, elementProps?.heading?.className)}>{headingText}</h2> : null}
        {showDescription && (description || content?.group?.description) ? <p {...elementProps?.description} className={classNames('faq-harmony-description', styles.description, elementProps?.description?.className)}>{description || content?.group?.description}</p> : null}
      </header> : null}
      {sections.length > 1 ? <div role="tablist" aria-label={strings.tabs} className={styles.categories} ref={groupTabList}
        onKeyDown={(event) => {
          const buttons = Array.from(groupTabList.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
          const current = buttons.indexOf(event.target as HTMLButtonElement);
          if (current < 0 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const forward = (event.key === 'ArrowRight') !== (resolvedDirection === 'rtl');
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (forward ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus(); buttons[next]?.click();
        }}>
        {sections.map((section) => {
          const sectionId = section.group._id ?? '';
          const isActive = sectionId === activeGroupId;
          return <button {...elementProps?.category} type="button" role="tab" key={sectionId} id={`${id}-group-${sectionId}-tab`}
            aria-selected={isActive} aria-controls={`${id}-group-panel`} tabIndex={isActive ? 0 : -1}
            className={classNames('faq-harmony-category', styles.category, isActive && 'faq-harmony-category--selected', elementProps?.category?.className)}
            onClick={() => selectGroup(sectionId)}>{section.group.title}</button>;
        })}
      </div> : null}
      {faqItems.length > 0 ? <>
        {(showSearch || showExpandAll) ? <div className={styles.toolbar}>
          {showSearch ? <>
          <label className={styles.searchLabel}>
            <span className={styles.visuallyHidden}>{strings.search}</span>
            <input {...elementProps?.search} type="search" placeholder={placeholder} value={query}
              className={classNames('faq-harmony-search', styles.search, elementProps?.search?.className)}
              onChange={(event) => setQuery(event.target.value)} />
          </label>
          </> : null}
          {!isCards && !isTabs ? <>
            {showExpandAll && !singleOpen ? <button {...elementProps?.expand} type="button"
              className={classNames('faq-harmony-expand', styles.control, elementProps?.expand?.className)}
              onClick={() => { setOpened(new Set(visible.flatMap((item) => item._id ? [item._id] : []))); visible.forEach((item) => { if (item._id) trackOpen(item._id); }); }}>{strings.expandAll}</button> : null}
            {showExpandAll ? <button {...elementProps?.expand} type="button"
              className={classNames('faq-harmony-expand', styles.control, elementProps?.expand?.className)}
              onClick={() => setOpened(new Set())}>{strings.collapseAll}</button> : null}
          </> : null}
        </div> : null}
        {showCategories && categories.length > 1 ? <fieldset className={styles.categories}><legend className={styles.visuallyHidden}>{strings.categories}</legend>
          {['', ...categories].map((value) => <button {...elementProps?.category} type="button" key={value}
            className={classNames('faq-harmony-category', styles.category, value === category && 'faq-harmony-category--selected', elementProps?.category?.className)}
            aria-pressed={value === category} onClick={() => setCategory(value)}>{value || strings.allCategories}</button>)}
        </fieldset> : null}
        <div className={classNames(styles.list, isTabs && styles.tabs)} {...(sections.length > 1 ? { role: 'tabpanel', id: `${id}-group-panel`, 'aria-labelledby': `${id}-group-${activeGroupId}-tab` } : {})}>
          {isTabs ? <div role="tablist" aria-label={strings.tabs} aria-orientation="vertical" className={styles.tabList} ref={tabList}
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
                      {item.question}{showIcon ? <span aria-hidden="true" style={{ color: 'var(--faq-icon)', fontSize: 'var(--faq-icon-size)' }}>{icon === 'chevron' || icon === 'circle-chevron' ? (expanded ? '⌄' : '›') : icon === 'minus' ? (expanded ? '−' : '−') : icon === 'arrow' ? '→' : icon === 'caret' ? (expanded ? '⌄' : '›') : icon === 'circle-plus' ? (expanded ? '⊖' : '⊕') : '+'}</span> : null}
                    </button>}
                </h3> : null}
                {(() => {
                  const isAccordion = !isTabs && !isCards;
                  const answer = <div {...elementProps?.answer} id={`${id}-${itemId}-answer`} hidden={!isAccordion && !expanded}
                    role={isTabs ? 'tabpanel' : undefined} tabIndex={isTabs ? 0 : undefined}
                    aria-labelledby={isTabs ? `${id}-${itemId}-tab` : isCards ? undefined : `${id}-${itemId}-question`}
                    className={classNames('faq-harmony-answer', styles.answer, elementProps?.answer?.className)}>
                    <div className={styles.answerBody} dangerouslySetInnerHTML={{ __html: item.answer }} />
                    {collectFeedback ? <FAQFeedback key={itemId} itemId={itemId} preview={preview} className={elementProps?.feedback?.className} track={track} prompt={strings.helpfulPrompt} yesLabel={strings.helpfulYes} noLabel={strings.helpfulNo} thanksLabel={strings.helpfulThanks} /> : null}
                  </div>;
                  if (!isAccordion) return answer;
                  // Accordion answers stay mounted so CSS can animate their height; `inert` and `aria-hidden`
                  // keep a closed answer's links out of the tab order and away from screen readers.
                  const closed = { inert: expanded ? undefined : '', 'aria-hidden': expanded ? undefined : true } as Record<string, string | boolean | undefined>;
                  return <div className={styles.collapse} data-open={expanded ? '' : undefined} {...closed}>
                    <div className={styles.collapseInner}>{answer}</div>
                  </div>;
                })()}
              </article>;
            })}
          </div>
        </div>
        <output className={styles.message}>{visible.length === 0 ? strings.noResults : ''}</output>
      </> : status === 'loading' ? <div className={styles.loading} role="status" aria-label={strings.loading}>
        <span className={styles.spinner} aria-hidden="true" />
      </div> : <div aria-live="polite" className={styles.message}>{message}
        {status === 'error' ? <button type="button" className={styles.control} onClick={retry}>{strings.tryAgain}</button> : null}
      </div>}
      {showHelp ? <aside className={styles.help}><p>{helpText || strings.helpText}</p>{helpLink && /^(https?:|mailto:|tel:)/i.test(helpLink) ? <a className={styles.helpButton} href={helpLink} target={/^https?:/i.test(helpLink) ? '_blank' : undefined} rel={/^https?:/i.test(helpLink) ? 'noopener noreferrer' : undefined}>{helpLabel || strings.helpLabel}</a> : null}</aside> : null}
      {seoSchema && faqItems.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: activeLang || 'en',
        mainEntity: faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      }).replace(/</g, '\\u003c') }} /> : null}
    </section>
  );
};

export default FaqHarmony;
