import React from "react";
// Real widget styles and data from the app (src/…), so the film shows the shipped UI.
import styles from "@/extensions/site/widgets/faq-widget/faq-widget.module.css";
import { presetById } from "@/lib/faq-presets";
import { iconById } from "@/lib/faq-icons";
import { categoriesOf } from "@/lib/faq-data";
import "./freeze.css";

/**
 * Twin of the markup FAQWidget.renderMarkup() builds (src/extensions/site/widgets/faq-widget/faq-widget.tsx).
 * Same class names, same --faq-* variables from the preset. Why a twin: the real widget is a custom element
 * that fetches data and animates with CSS transitions; here every state (typed query, open answer,
 * chosen chip, vote) is a prop computed from time.
 */
export type TwinItem = { id: string; question: string; answer: string; category?: string };
export type WidgetDisplay = "accordion" | "grid" | "cards" | "tabs";

type WidgetTwinProps = {
  items: Array<TwinItem>;
  preset?: string;
  display?: WidgetDisplay;
  heading?: string;
  /** The search box text as typed so far, and whether the caret shows. */
  query?: string;
  caret?: boolean;
  /** Category chip filter ('' = All). */
  category?: string;
  /** Id of the open question and its open progress 0..1. */
  openId?: string;
  open?: number;
  /** 0 = vote buttons, 1 = "Thanks for your feedback!" */
  voted?: number;
  showSearch?: boolean;
  showCategories?: boolean;
  width: number;
};

const ease = (v: number) => { const x = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - x, 3); };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const Highlight = ({ text, words }: { text: string; words: Array<string> }) => {
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi"));
  return <>{parts.map((part, index) => (index % 2 ? <mark key={index}>{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>))}</>;
};

const Icon = ({ id, turn }: { id: string; turn: number }) => {
  const icon = iconById(id);
  const angle = icon.id === "plus" || icon.id === "circle-plus" ? 45 : icon.id === "arrow" ? 90 : icon.id === "minus" ? 0 : 180;
  return (
    <span className={styles.icon} data-icon={icon.id} aria-hidden="true" style={{ transform: `rotate(${angle * turn}deg)` }}>
      <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={icon.path} /></svg>
    </span>
  );
};

export const WidgetTwin = ({ items, preset: presetId = "classic", display = "accordion", heading, query = "", caret = false, category = "", openId = "", open = 0, voted = 0, showSearch = true, showCategories = true, width }: WidgetTwinProps) => {
  const preset = presetById(presetId);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = items.filter((item) => (!category || item.category === category) && words.every((word) => `${item.question} ${stripHtml(item.answer)}`.toLowerCase().includes(word)));
  const categories = showCategories ? categoriesOf(items) : [];
  const o = ease(open);
  const vars = {
    "--faq-bg": preset.backgroundColor === "transparent" ? "#ffffff" : preset.backgroundColor,
    "--faq-question": preset.questionColor, "--faq-answer": preset.answerColor, "--faq-accent": preset.accentColor,
    "--faq-border": preset.borderColor, "--faq-icon": preset.iconColor, "--faq-icon-size": `${preset.iconSize}px`,
    "--faq-radius": `${preset.radius}px`, "--faq-gap": `${preset.gap}px`, "--faq-padding": "32px",
    "--faq-margin-top": "0px", "--faq-margin-right": "0px", "--faq-margin-bottom": "0px", "--faq-margin-left": "0px",
    "--faq-question-font": `600 19px Inter, system-ui, sans-serif`, "--faq-answer-font": `400 16px Inter, system-ui, sans-serif`,
  } as React.CSSProperties;

  const feedback = voted >= 1
    ? <div className={styles.feedback}><span>Thanks for your feedback!</span></div>
    : <div className={styles.feedback}><span>Was this helpful?</span><button type="button" className={styles.vote} data-target="vote-yes" style={voted > 0 ? { borderColor: preset.accentColor, color: preset.accentColor } : undefined}>👍 Yes</button><button type="button" className={styles.vote}>👎 No</button></div>;

  return (
    <section data-film className={styles.root} data-layout={preset.layout} data-display={display} data-animation="none" data-hover="none" style={{ ...vars, width, background: "var(--faq-bg)" }}>
      <header className={styles.header}><h2>{heading ?? preset.heading}</h2></header>
      {showSearch ? (
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input data-target="search" type="search" readOnly value={query} placeholder="Search questions…" style={query || caret ? { borderColor: preset.accentColor, boxShadow: `0 0 0 3px ${preset.accentColor}38` } : undefined} />
            {caret ? <span style={{ position: "absolute", left: 43 + query.length * 8.6, top: 12, width: 2, height: 20, background: preset.questionColor }} /> : null}
          </label>
        </div>
      ) : null}
      {categories.length > 1 ? (
        <div className={styles.categories}>{["", ...categories].map((name) => <button key={name || "all"} type="button" className={styles.chip} aria-pressed={name === category} data-target={`chip-${name || "all"}`}>{name || "All"}</button>)}</div>
      ) : null}
      <div className={styles.list} role="list">
        {visible.map((item) => {
          const isOpen = item.id === openId;
          const amount = isOpen ? o : 0;
          return (
            <article key={item.id} className={styles.item}>
              <h3 className={styles.questionHeading}>
                <button type="button" className={styles.question} aria-expanded={amount > 0.5} data-target={`q-${item.id}`}>
                  <span><Highlight text={item.question} words={words} /></span>
                  <Icon id={preset.icon} turn={amount} />
                </button>
              </h3>
              <div className={styles.collapse} style={{ gridTemplateRows: `${amount}fr` }}>
                <div className={styles.collapseInner}>
                  <div className={styles.answer} style={{ opacity: amount, transform: `translateY(${(1 - amount) * -6}px)` }}>
                    <div className={styles.answerBody} dangerouslySetInnerHTML={{ __html: item.answer }} />
                    {isOpen ? feedback : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
