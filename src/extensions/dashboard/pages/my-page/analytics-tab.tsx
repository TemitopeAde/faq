import { useEffect, useMemo, useState } from 'react';
import { items } from '@wix/data';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/tooltip';
import { helpfulRate, type AnalyticsRange, type AnalyticsSummary } from '@/lib/faq-analytics';
import { fetchFAQAnalytics } from '@/lib/faq-api';
import { FAQ_ITEMS } from '@/lib/faq-data';
import type { FAQGroup, FAQItem } from '@/lib/faq-types';
import { allQueryItems } from '@/lib/faq-query';

const RANGES: Array<{ id: AnalyticsRange; label: string }> = [{ id: '7', label: 'Last 7 days' }, { id: '30', label: 'Last 30 days' }, { id: '90', label: 'Last 90 days' }, { id: 'all', label: 'All time' }];
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export const AnalyticsTab = ({ groups }: { groups: Array<FAQGroup> }) => {
  const [groupId, setGroupId] = useState('');
  const [range, setRange] = useState<AnalyticsRange>('30');
  const [truncated, setTruncated] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [questions, setQuestions] = useState<Map<string, FAQItem>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void allQueryItems(items.query(FAQ_ITEMS))
      .then((result) => setQuestions(new Map((result as unknown as Array<FAQItem>).map((item) => [item._id ?? '', item]))))
      .catch((error: unknown) => console.error('Failed to load FAQ items for analytics:', error));
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchFAQAnalytics({ groupId: groupId || undefined, range })
      .then((result) => { setSummary(result.summary); setTruncated(result.truncated); })
      .catch((error: unknown) => { console.error('Failed to load FAQ analytics:', error); toast.error(error instanceof Error ? error.message : 'Could not load analytics'); })
      .finally(() => setLoading(false));
  }, [groupId, range]);

  const groupTitles = useMemo(() => new Map(groups.map((group) => [group._id ?? '', group.title])), [groups]);
  const rows = useMemo(() => Object.entries(summary?.byItem ?? {})
    .map(([id, stats]) => ({ id, ...stats, item: questions.get(id) }))
    .filter((row) => row.item), [summary, questions]);
  const topQuestions = [...rows].sort((a, b) => b.opens - a.opens).filter((row) => row.opens).slice(0, 10);
  const toImprove = [...rows].filter((row) => row.notHelpful).sort((a, b) => b.notHelpful - a.notHelpful || a.helpful - b.helpful).slice(0, 10);
  const missing = (summary?.searchesByQuery ?? []).filter((search) => search.noResults).slice(0, 15);
  const topSearches = (summary?.searchesByQuery ?? []).slice(0, 10);
  const empty = !loading && summary && !summary.opens && !summary.searches && !summary.helpful && !summary.notHelpful;

  return <section>
    <div className="section-heading">
      <div className="section-intro"><h2>Visitor analytics <InfoTip content="Collected from published FAQ widgets on your live site. Activity in the Wix Editor or preview isn't counted." /></h2><p>See what visitors open, search for and find helpful.</p></div>
      <div className="analytics-filters">
        <select className="dashboard-select" aria-label="FAQ group" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">All groups</option>{groups.map((group) => <option key={group._id} value={group._id}>{group.title}</option>)}</select>
        <select className="dashboard-select" aria-label="Date range" value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)}>{RANGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
      </div>
    </div>

    <div className="stat-grid">
      <div className="stat-tile"><span>Questions opened <InfoTip content="How many times visitors expanded a question. Each question counts once per page visit." /></span><strong>{loading ? '…' : summary?.opens ?? 0}</strong></div>
      <div className="stat-tile"><span>Found helpful <InfoTip content="Share of 👍 votes out of all “Was this helpful?” votes." /></span><strong>{loading || !summary ? '…' : helpfulRate(summary)}</strong><small>{summary ? `${summary.helpful} 👍 · ${summary.notHelpful} 👎` : ''}</small></div>
      <div className="stat-tile"><span>Searches <InfoTip content="Searches typed into the FAQ search box. Counted once the visitor pauses typing." /></span><strong>{loading ? '…' : summary?.searches ?? 0}</strong></div>
      <div className={`stat-tile${summary?.noResultSearches ? ' stat-warn' : ''}`}><span>No-result searches <InfoTip content="Searches that matched no questions. These are your best ideas for new FAQs." /></span><strong>{loading ? '…' : summary?.noResultSearches ?? 0}</strong></div>
    </div>

    {truncated ? <p className="page-tip">Showing the most recent 10,000 events. Pick a shorter date range for exact totals.</p> : null}

    {empty ? <p className="empty">No visitor activity in this period yet. Data appears once visitors use a published FAQ widget on your live site.</p> : <div className="analytics-grid">
      <Card className="analytics-wide"><CardHeader><h2>Missing answers</h2><p>Visitors searched for these and found nothing. Each one is a question worth adding.</p></CardHeader><CardContent>
        {missing.length ? <table className="data-table"><thead><tr><th>Search</th><th>Times</th><th>Last searched</th></tr></thead><tbody>{missing.map((search) => <tr key={search.query}><td>“{search.query}”</td><td>{search.noResults}</td><td>{dateFormat.format(search.lastSearched)}</td></tr>)}</tbody></table> : <p className="table-empty">Every search found at least one answer. 🎉</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>Most-opened questions</h2></CardHeader><CardContent>
        {topQuestions.length ? <table className="data-table"><thead><tr><th>Question</th><th>Opens</th><th>Helpful</th></tr></thead><tbody>{topQuestions.map((row) => <tr key={row.id}><td>{row.item?.question}{groupId ? null : <small>{groupTitles.get(row.item?.groupId ?? '')}</small>}</td><td>{row.opens}</td><td>{helpfulRate(row)}</td></tr>)}</tbody></table> : <p className="table-empty">No questions opened yet.</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>Answers to improve <InfoTip content="Questions with the most 👎 votes. Try rewording the answer or adding detail." /></h2></CardHeader><CardContent>
        {toImprove.length ? <table className="data-table"><thead><tr><th>Question</th><th>👎</th><th>👍</th></tr></thead><tbody>{toImprove.map((row) => <tr key={row.id}><td>{row.item?.question}{groupId ? null : <small>{groupTitles.get(row.item?.groupId ?? '')}</small>}</td><td>{row.notHelpful}</td><td>{row.helpful}</td></tr>)}</tbody></table> : <p className="table-empty">No “not helpful” votes yet.</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>Top searches</h2></CardHeader><CardContent>
        {topSearches.length ? <table className="data-table"><thead><tr><th>Search</th><th>Times</th></tr></thead><tbody>{topSearches.map((search) => <tr key={search.query}><td>“{search.query}”</td><td>{search.count}</td></tr>)}</tbody></table> : <p className="table-empty">No searches yet.</p>}
      </CardContent></Card>
    </div>}
  </section>;
};
