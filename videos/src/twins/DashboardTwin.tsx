import React from "react";
import { Download, Eye, FilePlus2, GripVertical, LayoutTemplate, Link2, MousePointerClick, Pencil, Plus, Settings, ThumbsDown, ThumbsUp, Trash2, Upload } from "lucide-react";
// Real dashboard building blocks and styles from the app.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "@/extensions/dashboard/pages/my-page/my-page.css";
import { FAQ_TEMPLATES } from "@/lib/faq-templates";
import "./freeze.css";

/**
 * Twin of the dashboard page (src/extensions/dashboard/pages/my-page/*): my-page.tsx shell + tabs,
 * the empty state, CreateGroupDialog, GroupDetail and AnalyticsTab, with the same class names.
 * Why a twin: those components fetch Wix Data, keep React state and use Radix Dialog/Tooltip,
 * which animate on their own clock. Here every state is a prop computed from time.
 */
export type DashboardState = {
  view: "empty" | "detail" | "analytics";
  /** Create-group dialog: 0 hidden … 1 shown. */
  dialog: number;
  dialogMode: "blank" | "template";
  /** Number of question rows revealed (fractional = the next row easing in). */
  rows: number;
  /** Drag of row `dragFrom` to the top: 0 … 1 (eased by the caller). */
  drag: number;
  dragFrom: number;
  /** Analytics counters 0 … 1, and how many "missing answers" rows are in (fractional). */
  count: number;
  missing: number;
  pressed?: string;
};

const store = FAQ_TEMPLATES.find((template) => template.id === "online-store")!;
const ROW_H = 57; // measured: .question-row height at this size
// Illustrative demo numbers for the film (not real data).
const STATS = { opens: 1284, helpful: 412, notHelpful: 36, searches: 356, noResults: 14 };
const STAT_ROWS = [{ q: "How long does shipping take?", opens: 318, rate: "94%" }, { q: "What is your return policy?", opens: 241, rate: "91%" }, { q: "How long do refunds take?", opens: 187, rate: "89%" }];
const MISSING = [{ q: "gift wrapping", n: 6, last: "Sep 28" }, { q: "pickup in store", n: 4, last: "Sep 27" }, { q: "change delivery address", n: 3, last: "Sep 25" }];

const ease = (v: number) => { const x = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - x, 3); };
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

const Tabs = ({ active }: { active: "groups" | "analytics" }) => (
  <div className="dashboard-tabs">
    <div role="tablist" style={{ display: "flex" }}>
      <button type="button" role="tab" data-state={active === "groups" ? "active" : "inactive"}>FAQ groups</button>
      <button type="button" role="tab" data-target="tab-analytics" data-state={active === "analytics" ? "active" : "inactive"}>Analytics</button>
      <button type="button" role="tab" data-state="inactive">Styles</button>
    </div>
  </div>
);

const Empty = () => (
  <div className="panel empty-state empty-hero">
    <span className="empty-emoji" aria-hidden="true">💬</span>
    <h3>Create your first FAQ</h3>
    <p>Start from scratch or pick a ready-made template for stores, restaurants, bookings and more.</p>
    <Button><Plus size={16} />New FAQ group</Button>
  </div>
);

const Detail = ({ rows, drag, dragFrom }: { rows: number; drag: number; dragFrom: number }) => {
  const d = drag; // already eased by the film so the row tracks the cursor
  return (
    <section className="detail">
      <header className="detail-header">
        <div className="detail-title">
          <h2>{store.name}</h2>
          <div className="detail-meta"><Badge className="badge-draft">Draft</Badge><span>{Math.min(store.items.length, Math.ceil(rows))} questions</span></div>
        </div>
        <div className="detail-actions">
          <Button variant="ghost" size="sm"><Settings size={16} />Settings</Button>
          <Button variant="outline">Publish</Button>
          <Button><Plus size={16} />Add question</Button>
        </div>
      </header>
      <div className="panel">
        <div className="panel-toolbar">
          <span className="panel-hint">Drag <GripVertical size={14} aria-hidden="true" /> to reorder. Click a question to edit it.</span>
          <div className="toolbar-actions"><Button variant="ghost" size="sm"><Upload size={15} />Import</Button><Button variant="ghost" size="sm"><Download size={15} />Export</Button></div>
        </div>
        <ol className="question-list" style={{ position: "relative" }}>
          {store.items.map((item, index) => {
            const shown = ease(rows - index);
            if (shown <= 0) return null;
            // The dragged row rises to the top; rows it passes step down one slot.
            const offset = index === dragFrom ? -dragFrom * ROW_H * d : index < dragFrom ? ROW_H * d : 0;
            const lifted = index === dragFrom && drag > 0 && drag < 1;
            return (
              <li key={item.question} className={`question-row${lifted ? " is-dragging" : ""}`} style={{ opacity: lifted ? 1 : shown, translate: `0 ${offset + (1 - shown) * 10}px`, position: "relative", zIndex: index === dragFrom ? 2 : 1, background: lifted ? "#fff" : undefined, boxShadow: lifted ? "0 10px 28px rgba(31, 48, 80, .16)" : undefined }}>
                <span className="drag-handle" data-target={index === dragFrom ? "drag-handle" : undefined}><GripVertical size={16} /></span>
                <button type="button" className="question-main">
                  <span className="question-text">{item.question}</span>
                  <span className="question-meta"><Badge>{item.category}</Badge></span>
                </button>
                <span className="question-stats"><span><MousePointerClick size={13} />0</span><span><ThumbsUp size={13} />0</span><span><ThumbsDown size={13} />0</span></span>
                <div className="row-actions">
                  {[Pencil, Link2, Eye, Trash2].map((Icon, i) => <button key={i} type="button" className={`icon-button${Icon === Trash2 ? " icon-danger" : ""}`}><Icon size={15} /></button>)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

const Analytics = ({ count, missing }: { count: number; missing: number }) => {
  const c = ease(count);
  const rate = Math.round((STATS.helpful / (STATS.helpful + STATS.notHelpful)) * 100 * c);
  return (
    <section>
      <div className="section-heading">
        <div className="section-intro"><h2>Visitor analytics</h2><p>See what visitors open, search for and find helpful.</p></div>
        <div className="analytics-filters"><select className="dashboard-select" defaultValue="all"><option value="all">All groups</option></select><select className="dashboard-select" defaultValue="30"><option value="30">Last 30 days</option></select></div>
      </div>
      <div className="stat-grid">
        <div className="stat-tile"><span>Questions opened</span><strong>{fmt(STATS.opens * c)}</strong></div>
        <div className="stat-tile"><span>Found helpful</span><strong>{rate}%</strong><small>{fmt(STATS.helpful * c)} 👍 · {fmt(STATS.notHelpful * c)} 👎</small></div>
        <div className="stat-tile"><span>Searches</span><strong>{fmt(STATS.searches * c)}</strong></div>
        <div className="stat-tile stat-warn"><span>No-result searches</span><strong>{fmt(STATS.noResults * c)}</strong></div>
      </div>
      <div className="analytics-grid">
        <div className="ui-card analytics-wide">
          <div className="ui-card-header"><h2>Missing answers</h2><p>Visitors searched for these and found nothing. Each one is a question worth adding.</p></div>
          <div className="ui-card-content">
            <table className="data-table"><thead><tr><th>Search</th><th>Times</th><th>Last searched</th></tr></thead><tbody>
              {MISSING.map((row, index) => { const v = ease(missing - index); return <tr key={row.q} style={{ opacity: v, translate: `${(1 - v) * -16}px 0` }}><td>“{row.q}”</td><td>{row.n}</td><td>{row.last}</td></tr>; })}
            </tbody></table>
          </div>
        </div>
        <div className="ui-card" style={{ gridColumn: "span 2" }}>
          <div className="ui-card-header"><h2>Most-opened questions</h2></div>
          <div className="ui-card-content">
            <table className="data-table"><thead><tr><th>Question</th><th>Opens</th><th>Helpful</th></tr></thead><tbody>
              {STAT_ROWS.map((row) => <tr key={row.q}><td>{row.q}</td><td>{fmt(row.opens * c)}</td><td>{row.rate}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      </div>
    </section>
  );
};

const CreateDialog = ({ amount, mode, pressed }: { amount: number; mode: "blank" | "template"; pressed?: string }) => {
  if (amount <= 0) return null;
  const e = ease(amount);
  return (
    <>
      <div className="dialog-overlay" style={{ position: "absolute", opacity: e }} />
      <div className="dialog-content dialog-medium" style={{ position: "absolute", opacity: e, translate: `-50% calc(-50% + ${(1 - e) * 10}px)`, transform: "none", scale: String(0.98 + 0.02 * e) }}>
        <div className="dialog-header"><h2 className="dialog-title">New FAQ group</h2><p className="dialog-description">A group is a set of questions you can show in one or more FAQ widgets on your site.</p></div>
        <div className="choice-row">
          <button type="button" className="choice" aria-checked={mode === "blank"}><FilePlus2 size={20} /><strong>Start blank</strong><span>Write your own questions</span></button>
          <button type="button" className="choice" data-target="choice-template" aria-checked={mode === "template"}><LayoutTemplate size={20} /><strong>Use a template</strong><span>Ready-made questions to edit</span></button>
        </div>
        {mode === "template" ? (
          <div className="template-list">
            {FAQ_TEMPLATES.slice(0, 3).map((template, index) => (
              <button type="button" className="template-option" key={template.id} data-target={`tpl-${template.id}`} aria-checked={index === 0}>
                <span className="template-emoji" aria-hidden="true">{template.emoji}</span>
                <span><strong>{template.name}</strong><small>{template.description} · {template.items.length} questions</small></span>
              </button>
            ))}
          </div>
        ) : <div style={{ height: 210 }} />}
        <div className="dialog-footer">
          <Button variant="outline">Cancel</Button>
          <span data-target="create-group"><Button style={pressed === "create" ? { background: "#4150cc" } : undefined}>Create group</Button></span>
        </div>
      </div>
    </>
  );
};

/** The dashboard at a fixed design size; the film scales it. */
export const DashboardTwin = ({ state, width, height }: { state: DashboardState; width: number; height: number }) => (
  <div data-film className="dashboard-shell" style={{ width, height, minHeight: 0, overflow: "hidden", position: "relative", padding: "32px 44px" }}>
    <header className="page-header">
      <div><h1>FAQ</h1><p>Write your questions here, then add the FAQ widget to any page in the Wix Editor.</p></div>
      <span data-target="new-group"><Button style={state.pressed === "new" ? { background: "#4150cc" } : undefined}><Plus size={16} />New FAQ group</Button></span>
    </header>
    <div className="dashboard-tabs">
      <Tabs active={state.view === "analytics" ? "analytics" : "groups"} />
      <div role="tabpanel" style={{ marginTop: 24 }}>
        {state.view === "empty" ? <Empty /> : state.view === "detail" ? <Detail rows={state.rows} drag={state.drag} dragFrom={state.dragFrom} /> : <Analytics count={state.count} missing={state.missing} />}
      </div>
    </div>
    <CreateDialog amount={state.dialog} mode={state.dialogMode} pressed={state.pressed} />
  </div>
);

