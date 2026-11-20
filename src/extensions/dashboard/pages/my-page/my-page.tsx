import { useCallback, useEffect, useState } from 'react';
import { items } from '@wix/data';
import { dashboard } from '@wix/dashboard';
import { ChevronRight, Plus } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoTip, TooltipProvider } from '@/components/ui/tooltip';
import { FAQ_PRESETS } from '@/lib/faq-presets';
import { iconById } from '@/lib/faq-icons';
import { FAQ_ITEMS, GROUPS } from '@/lib/faq-data';
import type { FAQGroup, FAQItem } from '@/lib/faq-types';
import { AnalyticsTab } from './analytics-tab';
import { CreateGroupDialog } from './create-group-dialog';
import { GroupDetail } from './group-detail';
import { PricingPanel } from './pricing-panel';
import { ReviewPromptDialog } from './review-prompt-dialog';
import { useFAQEntitlement } from '@/lib/use-faq-entitlement';
import { allQueryItems } from '@/lib/faq-query';
import { DASHBOARD_LANGUAGES, dashboardDirection, detectHostLanguage, displayLanguage, getDashboardLanguage, setDashboardLanguage, t, tn, tOr, useDashboardLanguage } from '@/lib/dashboard-i18n';
import '@/styles/globals.css';
import 'react-quill/dist/quill.snow.css';
import './my-page.css';

const sampleQuestions = ['page.sampleQ1', 'page.sampleQ2', 'page.sampleQ3'] as const;

const Preview = ({ presetId }: { presetId: string }) => {
  const preset = FAQ_PRESETS.find((item) => item.id === presetId) ?? FAQ_PRESETS[0];
  const icon = iconById(preset.icon);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return <div className="preset-preview" style={{ background: preset.backgroundColor === 'transparent' ? '#fff' : preset.backgroundColor, color: preset.questionColor, borderColor: preset.borderColor, borderRadius: Math.min(preset.radius, 20), font: preset.answerFont.font }}>{sampleQuestions.map((question, index) => { const isOpen = openIndex === index; return <div className="preview-item" key={question} style={{ borderColor: preset.borderColor }}><button className="preview-row" type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)} style={{ color: preset.questionColor }}><span>{t(question)}</span><svg className={isOpen ? 'preview-icon-open' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={preset.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon.path} /></svg></button>{isOpen ? <div className="preview-answer" style={{ color: preset.answerColor }}>{t('page.sampleAnswer', { style: tOr(`preset.${preset.id}`, preset.name) })}</div> : null}</div>; })}</div>;
};

const DashboardPage = () => {
  const [groups, setGroups] = useState<Array<FAQGroup>>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const { entitlement, loading: entitlementLoading, error: entitlementError } = useFAQEntitlement();
  const selectedGroup = groups.find((group) => group._id === selectedGroupId) ?? null;

  const loadGroups = useCallback(async () => {
    try {
      const [groupResult, itemResult] = await Promise.all([allQueryItems(items.query(GROUPS).descending('_createdDate')), allQueryItems(items.query(FAQ_ITEMS))]);
      setGroups(groupResult as unknown as Array<FAQGroup>);
      const next = new Map<string, number>();
      for (const item of itemResult as unknown as Array<FAQItem>) next.set(item.groupId, (next.get(item.groupId) ?? 0) + 1);
      setCounts(next);
    } catch (error) { console.error('Failed to load FAQ groups:', error); toast.error(t('page.loadGroupsError')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadGroups(); }, [loadGroups]);
  const dashboardLanguage = useDashboardLanguage();
  useEffect(() => {
    // Follow the Wix dashboard language; `dashboard.getLanguage()` covers hosts without essentials i18n.
    void setDashboardLanguage(detectHostLanguage());
    void dashboard.getLanguage().then((language) => { if (language && getDashboardLanguage() === 'en') void setDashboardLanguage(language); }).catch(() => undefined);
  }, []);
  // Dialogs and toasts render outside <main>, so direction and language go on the document itself.
  useEffect(() => { document.documentElement.lang = dashboardLanguage; document.documentElement.dir = dashboardDirection(); }, [dashboardLanguage]);

  const openGroup = (groupId: string) => { setSelectedGroupId(groupId); setActiveTab('groups'); window.scrollTo({ top: 0 }); };

  return <TooltipProvider delayDuration={250}><main className="dashboard-shell" dir={dashboardDirection()} lang={dashboardLanguage}><Toaster position={dashboardDirection() === 'rtl' ? 'top-left' : 'top-right'} dir={dashboardDirection()} richColors />
    <header className="page-header">
      <div>
        <h1>{t('page.title')}</h1>
        <p>{t('page.subtitle')}</p>
      </div>
      <div className="page-header-actions">
        <label className="dashboard-language-picker"><span>{t('page.language')}</span><select className="dashboard-select" aria-label={t('page.language')} value={dashboardLanguage} onChange={(event) => void setDashboardLanguage(event.target.value)}>{DASHBOARD_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{displayLanguage(language.code)}</option>)}</select></label>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} />{t('page.newGroup')}</Button>
      </div>
    </header>

    <PricingPanel entitlement={entitlement} loading={entitlementLoading} error={entitlementError} />
    <Tabs value={activeTab} onValueChange={setActiveTab} className="dashboard-tabs">
      <TabsList><TabsTrigger value="groups">{t('page.tabGroups')}</TabsTrigger><TabsTrigger value="analytics">{t('page.tabAnalytics')}</TabsTrigger><TabsTrigger value="styles">{t('page.tabStyles')}</TabsTrigger></TabsList>

      <TabsContent value="groups">
        {selectedGroup ? <GroupDetail group={selectedGroup} onBack={() => setSelectedGroupId(null)} onGroupChanged={loadGroups} />
          : loading ? <div className="panel empty-state"><p>{t('common.loading')}</p></div>
          : groups.length === 0 ? <div className="panel empty-state empty-hero">
            <span className="empty-emoji" aria-hidden="true">💬</span>
            <h3>{t('page.emptyTitle')}</h3>
            <p>{t('page.emptyBody')}</p>
            <Button onClick={() => setCreateOpen(true)}><Plus size={16} />{t('page.newGroup')}</Button>
          </div>
          : <div className="group-grid">
            {groups.map((group) => <button type="button" className="group-card" key={group._id ?? group.connectionKey} onClick={() => group._id && openGroup(group._id)}>
              <span className="group-card-top"><Badge className={group.published ? 'badge-live' : 'badge-draft'}>{group.published ? t('common.published') : t('common.draft')}</Badge><ChevronRight size={18} className="group-card-arrow flip-rtl" aria-hidden="true" /></span>
              <strong>{group.title}</strong>
              <span className="group-card-count">{tn('common.questionCount', counts.get(group._id ?? '') ?? 0)}</span>
            </button>)}
          </div>}
        {!selectedGroup && groups.length > 0 ? <p className="page-tip">{t('page.tipBefore')}<strong>{t('page.tipWidget')}</strong>{t('page.tipMiddle')}<em>{t('page.tipConnection')}</em>.</p> : null}
      </TabsContent>

      <TabsContent value="analytics">{activeTab === 'analytics' ? <AnalyticsTab groups={groups} /> : null}</TabsContent>

      <TabsContent value="styles">
        <div className="section-intro"><h2>{t('page.stylesTitle')} <InfoTip content={t('page.stylesInfo')} /></h2><p>{t('page.stylesIntro', { count: FAQ_PRESETS.length })}</p></div>
        <div className="preset-grid">{FAQ_PRESETS.map((preset) => <div className="preset-card" key={preset.id}><Preview presetId={preset.id} /><div className="preset-meta"><strong>{tOr(`preset.${preset.id}`, preset.name)}</strong><span>{tOr(`presetCategory.${preset.category}`, preset.category)}</span></div></div>)}</div>
      </TabsContent>
    </Tabs>

    <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={async (groupId) => { await loadGroups(); openGroup(groupId); }} />
    <ReviewPromptDialog entitlement={entitlement} />
  </main></TooltipProvider>;
};
export default DashboardPage;
