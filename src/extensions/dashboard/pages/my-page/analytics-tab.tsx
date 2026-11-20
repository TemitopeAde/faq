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
import { formatDate, getDashboardLanguage, t, type UIKey } from '@/lib/dashboard-i18n';

const RANGES: Array<{ id: AnalyticsRange; label: UIKey }> = [{ id: '7', label: 'analytics.range7' }, { id: '30', label: 'analytics.range30' }, { id: '90', label: 'analytics.range90' }, { id: 'all', label: 'analytics.rangeAll' }];

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
      .catch((error: unknown) => { console.error('Failed to load FAQ analytics:', error); toast.error(t('analytics.loadError'), { description: error instanceof Error ? error.message : undefined }); })
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
      <div className="section-intro"><h2>{t('analytics.title')} <InfoTip content={t('analytics.info')} /></h2><p>{t('analytics.intro')}</p></div>
      <div className="analytics-filters">
        <select className="dashboard-select" aria-label={t('analytics.group')} value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">{t('analytics.allGroups')}</option>{groups.map((group) => <option key={group._id} value={group._id}>{group.title}</option>)}</select>
        <select className="dashboard-select" aria-label={t('analytics.range')} value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)}>{RANGES.map((option) => <option key={option.id} value={option.id}>{t(option.label)}</option>)}</select>
      </div>
    </div>

    <div className="stat-grid">
      <div className="stat-tile"><span>{t('analytics.opened')} <InfoTip content={t('analytics.openedInfo')} /></span><strong>{loading ? '…' : summary?.opens ?? 0}</strong></div>
      <div className="stat-tile"><span>{t('analytics.helpful')} <InfoTip content={t('analytics.helpfulInfo')} /></span><strong>{loading || !summary ? '…' : helpfulRate(summary, getDashboardLanguage())}</strong><small>{summary ? `${summary.helpful} 👍 · ${summary.notHelpful} 👎` : ''}</small></div>
      <div className="stat-tile"><span>{t('analytics.searches')} <InfoTip content={t('analytics.searchesInfo')} /></span><strong>{loading ? '…' : summary?.searches ?? 0}</strong></div>
      <div className={`stat-tile${summary?.noResultSearches ? ' stat-warn' : ''}`}><span>{t('analytics.noResult')} <InfoTip content={t('analytics.noResultInfo')} /></span><strong>{loading ? '…' : summary?.noResultSearches ?? 0}</strong></div>
    </div>

    {truncated ? <p className="page-tip">{t('analytics.truncated')}</p> : null}

    {empty ? <p className="empty">{t('analytics.empty')}</p> : <div className="analytics-grid">
      <Card className="analytics-wide"><CardHeader><h2>{t('analytics.missingTitle')}</h2><p>{t('analytics.missingBody')}</p></CardHeader><CardContent>
        {missing.length ? <table className="data-table"><thead><tr><th>{t('analytics.colSearch')}</th><th>{t('analytics.colTimes')}</th><th>{t('analytics.colLast')}</th></tr></thead><tbody>{missing.map((search) => <tr key={search.query}><td>“{search.query}”</td><td>{search.noResults}</td><td>{formatDate(search.lastSearched)}</td></tr>)}</tbody></table> : <p className="table-empty">{t('analytics.missingEmpty')}</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>{t('analytics.topTitle')}</h2></CardHeader><CardContent>
        {topQuestions.length ? <table className="data-table"><thead><tr><th>{t('analytics.colQuestion')}</th><th>{t('analytics.colOpens')}</th><th>{t('analytics.colHelpful')}</th></tr></thead><tbody>{topQuestions.map((row) => <tr key={row.id}><td>{row.item?.question}{groupId ? null : <small>{groupTitles.get(row.item?.groupId ?? '')}</small>}</td><td>{row.opens}</td><td>{helpfulRate(row, getDashboardLanguage())}</td></tr>)}</tbody></table> : <p className="table-empty">{t('analytics.topEmpty')}</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>{t('analytics.improveTitle')} <InfoTip content={t('analytics.improveInfo')} /></h2></CardHeader><CardContent>
        {toImprove.length ? <table className="data-table"><thead><tr><th>{t('analytics.colQuestion')}</th><th>👎</th><th>👍</th></tr></thead><tbody>{toImprove.map((row) => <tr key={row.id}><td>{row.item?.question}{groupId ? null : <small>{groupTitles.get(row.item?.groupId ?? '')}</small>}</td><td>{row.notHelpful}</td><td>{row.helpful}</td></tr>)}</tbody></table> : <p className="table-empty">{t('analytics.improveEmpty')}</p>}
      </CardContent></Card>
      <Card><CardHeader><h2>{t('analytics.searchesTitle')}</h2></CardHeader><CardContent>
        {topSearches.length ? <table className="data-table"><thead><tr><th>{t('analytics.colSearch')}</th><th>{t('analytics.colTimes')}</th></tr></thead><tbody>{topSearches.map((search) => <tr key={search.query}><td>“{search.query}”</td><td>{search.count}</td></tr>)}</tbody></table> : <p className="table-empty">{t('analytics.searchesEmpty')}</p>}
      </CardContent></Card>
    </div>}
  </section>;
};
